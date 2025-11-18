import httpStatus from 'http-status';
import {
  SubscriptionType,
  User,
  UserRoleEnum,
  UserStatus,
} from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';

import { Request } from 'express';
import AppError from '../../errors/AppError';
import { uploadToDigitalOceanAWS } from '../../utils/uploadToDigitalOceanAWS';
import { getPartnerFromUser } from './user.constant';

interface UserWithOptionalPassword extends Omit<User, 'password'> {
  password?: string;
}

const getAllUsersFromDB = async (query: Record<string, any>) => {
  const couples = await prisma.couple.findMany({
    where: {
      users: {
        every: { role: 'USER' },
      },
    },
    include: {
      users: {
        where: {
          subscriptionId: {
            not: null,
          },
        },
        select: {
          id: true,
          fullName: true,
          nickName: true,
          email: true,
          profile: true,
          status: true,
          coupleId: true,
          subscriptionId: true,
          subscriptionStart: true,
          subscriptionEnd: true,
          createdAt: true,
        },
        orderBy: { fullName: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const tableData = await Promise.all(
    couples
      .filter(couple => couple.users.length === 2)
      .map(async couple => {
        const [partner1, partner2] = couple.users;

        const combinedStatus =
          partner1.status === 'ACTIVE' && partner2.status === 'ACTIVE'
            ? 'ACTIVE'
            : partner1.status === 'SUSPENDED' && partner2.status === 'SUSPENDED'
              ? 'SUSPENDED'
              : 'MIXED';

        const subscriptionStatus = partner1.subscriptionId
          ? 'Active'
          : 'Not-Active';

        const plan = partner1.subscriptionId
          ? await prisma.subscription.findUnique({
              where: { id: partner1.subscriptionId },
              select: { duration: true },
            })
          : null;

        return {
          coupleId: couple.id,
          partner1: {
            id: partner1.id,
            name: partner1.fullName,
            email: partner1.email,
            profile: partner1.profile,
            subscription: subscriptionStatus,
            join: partner1.createdAt,
          },
          partner2: {
            id: partner2.id,
            name: partner2.fullName,
            email: partner2.email,
            profile: partner2.profile,
            subscription: subscriptionStatus,
            join: partner2.createdAt,
          },
          status: combinedStatus,
          plan: plan?.duration,
        };
      }),
  );

  const { page = 1, limit = 10, searchTerm, status } = query;

  let filteredData = [...tableData];

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredData = filteredData.filter(
      couple =>
        couple.partner1.name.toLowerCase().includes(term) ||
        couple.partner1.email.toLowerCase().includes(term) ||
        couple.partner2.name.toLowerCase().includes(term) ||
        couple.partner2.email.toLowerCase().includes(term),
    );
  }

  if (status) {
    filteredData = filteredData.filter(couple => couple.status === status);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const paginatedData = filteredData.slice(skip, skip + Number(limit));
  const total = filteredData.length;
  const totalPage = Math.ceil(total / Number(limit));

  return {
    message: 'Users retrieved successfully',
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage,
    },
    data: paginatedData,
  };
};

const updateUserStatus = async (id: string) => {
  return await prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({
      where: { id },
      include: { couple: true },
    });

    if (!user || !user.couple) {
      throw new AppError(httpStatus.NOT_FOUND, 'User or couple not found');
    }

    const currentStatus = user.status;
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    await tx.user.updateMany({
      where: { coupleId: user.coupleId },
      data: { status: newStatus },
    });

    const updatedCouple = await tx.couple.findUnique({
      where: { id: user.coupleId as string },
      include: {
        users: {
          select: {
            id: true,
            fullName: true,
            status: true,
          },
        },
      },
    });

    return {
      message: `Status toggled to ${newStatus} for couple`,
      data: updatedCouple,
    };
  });
};

const getMyProfileFromDB = async (id: string) => {
  const Profile = await prisma.user.findUnique({
    where: {
      id: id,
    },
    select: {
      id: true,
      fullName: true,
      nickName: true,
      email: true,
      role: true,
      status: true,
      profile: true,
      coupleId: true,
      couple: {
        select: {
          users: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: true,
              nickName: true,
            },
          },
        },
      },
    },
  });

  return getPartnerFromUser(Profile);
};

const getUserDetailsFromDB = async (id: string) => {
  const user = await prisma.couple.findUnique({
    where: { id },
    select: {
      users: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
          subscriptionStart: true,
          subscriptionEnd: true,
        },
      },
    },
  });
  return user;
};

const updateUserRoleStatusIntoDB = async (id: string, role: UserRoleEnum) => {
  const result = await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      role: role,
    },
  });
  return result;
};

const updateUserApproval = async (userId: string) => {
  console.log(userId);
  // const user = await prisma.user.findUnique({
  //   where: { id: userId },
  //   select: {
  //     id: true,
  //     fullName: true,
  //     email: true,
  //     isApproved: true,
  //   },
  // });

  // if (!user) {
  //   throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  // }
  // const result = await prisma.user.update({
  //   where: { id: userId },
  //   data: {
  //     isApproved: true,
  //   },
  // });
  // return result;
};

const hardDeleteUserIntoDB = async (coupleId: string, adminId: string) => {
  const adminUser = await prisma.user.findUnique({
    where: {
      id: adminId,
      role: UserRoleEnum.ADMIN,
    },
  });
  if (!adminUser) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not an admin');
  }

  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: {
      users: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!couple || couple.users.length !== 2) {
    throw new AppError(httpStatus.NOT_FOUND, 'Valid couple not found');
  }

  const userIds = couple.users.map(u => u.id);

  return await prisma.$transaction(
    async tx => {
      // Step 1: Delete related records first (chats, rooms, etc.)
      await tx.chat.deleteMany({
        where: {
          OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }],
        },
      });

      await tx.room.deleteMany({ where: { coupleId } });

      // await tx.payment.deleteMany({ where: { userId: { in: userIds } } });

      await tx.event.deleteMany({
        where: {
          OR: [
            { createdById: { in: userIds } },
            { approvedById: { in: userIds } },
          ],
        },
      });

      await tx.billboard.deleteMany({ where: { coupleId } });

      await tx.notification.deleteMany({
        where: { receiverId: { in: userIds } },
      });

      // Step 2: Delete users FIRST (before couple, to avoid SetNull cascade issue)
      const deletedUsers = await tx.user.deleteMany({
        where: { coupleId },
      });

      // Step 3: Delete couple LAST (now no users linked)
      await tx.couple.delete({
        where: { id: coupleId },
      });

      // Return summary
      return {
        deletedCouple: { id: coupleId },
        deletedUsers: { count: deletedUsers.count, users: couple.users },
        message: `Couple ${coupleId} and ${deletedUsers.count} users deleted successfully`,
      };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );
};

const updateUserIntoDb = async (req: Request, id: string) => {
  // Step 1️⃣: Check if user exists
  const userInfo = await prisma.user.findUnique({
    where: { id },
  });

  if (!userInfo) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found with id: ' + id);
  }

  // Step 2️⃣: Parse incoming data
  const { fullName } = JSON.parse(req.body.data);

  // Step 3️⃣: Handle file upload (optional)
  const file = req.file as Express.Multer.File | undefined;

  let profileUrl: string | null = userInfo.profile;

  if (file) {
    const location = await uploadToDigitalOceanAWS(file);
    profileUrl = location.Location;
  }

  // Step 4️⃣: Update user in DB
  const result = await prisma.user.update({
    where: { id },
    data: {
      fullName,
      profile: profileUrl,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profile: true,
      role: true,
      status: true,
      nickName: true,
    },
  });

  if (!result) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update user profile',
    );
  }

  return result;
};

const softDeleteUserIntoDB = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  const result = await prisma.user.updateMany({
    where: { coupleId: user.coupleId },
    data: { isDeleted: true },
  });
  return result;
};

const updateMyProfileIntoDB = async (
  id: string,
  file: Express.Multer.File | undefined,
  payload: Partial<User>,
) => {
  return await prisma.$transaction(async tx => {
    const currentUser = await tx.user.findUnique({
      where: { id },
      include: {
        couple: {
          include: {
            users: {
              select: {
                id: true,
                fullName: true,
                nickName: true,
                email: true,
              },
              where: { id: { not: id } },
            },
          },
        },
      },
    });

    if (!currentUser) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (!currentUser.couple || currentUser.couple.users.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No partner found. Connect first.',
      );
    }

    const partner = currentUser.couple.users[0];

    const { nickName, email, role, ...ownUpdateData } = payload;

    let profileUrl: string | null = null;
    if (file) {
      const location = await uploadToDigitalOceanAWS(file);
      profileUrl = location.Location;
      ownUpdateData.profile = profileUrl;
    }

    const updatedCurrentUser = await tx.user.update({
      where: { id },
      data: ownUpdateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        profile: true,
        role: true,
        status: true,
      },
    });

    if (nickName) {
      await tx.user.update({
        where: { id: partner.id },
        data: { nickName: nickName as string },
      });
    }

    return updatedCurrentUser;
  });
};

export const UserServices = {
  getAllUsersFromDB,
  getMyProfileFromDB,
  getUserDetailsFromDB,
  updateUserRoleStatusIntoDB,
  updateUserStatus,
  updateUserApproval,
  softDeleteUserIntoDB,
  hardDeleteUserIntoDB,
  updateUserIntoDb,
  updateMyProfileIntoDB,
};
