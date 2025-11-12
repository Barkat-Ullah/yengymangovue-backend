import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const createIntoDb = async (
  userId: string,
  payload: { title: string; description: string },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.coupleId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User is not connected to any couple',
    );
  }

  const result = await prisma.billboard.create({
    data: {
      title: payload.title,
      description: payload.description,
      coupleId: user.coupleId,
      createdById: user.id,
    },
  });

  return result;
};

const getMyBillboard = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.coupleId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User is not connected to any couple',
    );
  }

  const result = await prisma.billboard.findMany({
    where: { coupleId: user.coupleId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  return result;
};

const getBillboardByIdFromDB = async (userId: string, id: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const result = await prisma.billboard.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Billboard not found');
  }

  return result;
};

const updateIntoDb = async (
  userId: string,
  id: string,
  data: Partial<{ title: string; description: string }>,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  const exist = await prisma.billboard.findUnique({
    where: { id },
  });

  if (!exist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Billboard not found');
  }

  const result = await prisma.billboard.update({
    where: { id },
    data,
  });

  return result;
};

const deleteIntoDb = async (userId: string, id: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  const exist = await prisma.billboard.findUnique({
    where: { id },
  });

  if (!exist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Billboard not found');
  }

  const result = await prisma.billboard.delete({
    where: { id },
  });

  return result;
};

export const BillboardServices = {
  createIntoDb,
  getMyBillboard,
  getBillboardByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
};
