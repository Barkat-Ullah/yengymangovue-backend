import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { PaymentStatus, UserRoleEnum } from '@prisma/client';

const getAllPayments = async (query: Record<string, any>) => {
  const { page = 1, limit = 10, status, ...otherQuery } = query;

  // Build where clause
  const where: any = {
    ...otherQuery,
  };

  // Default to non-pending statuses, but allow override
  if (status) {
    where.status = status;
  } else {
    where.status = {
      in: [PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELED],
    };
  }

  const total = await prisma.payment.count({ where });

  const payments = await prisma.payment.findMany({
    where,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      stripePaymentId: true,
      stripeSubscriptionId: true,
      stripeCustomerId: true,
      subscription: {
        select: {
          duration: true,
          title: true,
        },
      },

      couple: {
        select: {
          id: true,
          users: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  // Transformation: No need for Map if IDs are unique (they are)
  let totalRevenue = 0;
  const transformedData = payments.map(payment => {
    if (payment.status === PaymentStatus.SUCCESS && payment.amount > 0) {
      totalRevenue += payment.amount;
    }

    let customerName = 'Unknown';
    if (
      payment.couple &&
      payment.couple.users &&
      payment.couple.users.length > 0
    ) {
      const coupleNames = payment.couple.users
        .map((u: any) => u.fullName)
        .sort()
        .join(' & ');
      customerName = coupleNames;
    }

    // FIXED: Get plan from subscription
    const plan = payment.subscription?.duration ?? 'FREELY';

    return {
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      stripePaymentId: payment.stripePaymentId,
      stripeSubscriptionId: payment.stripeSubscriptionId,
      stripeCustomerId: payment.stripeCustomerId,
      customerName,
      plan,
      planTitle: payment.subscription?.title || plan, // Optional: full title
      formattedDate: new Date(payment.createdAt).toLocaleDateString('en-CA'),
      createdAt: payment.createdAt,
    };
  });

  const totalPage = Math.ceil(total / Number(limit));

  return {
    success: true,
    statusCode: 200,
    message: 'All payments retrieved successfully (Admin)',
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage,
      totalRevenue,
    },
    data: transformedData,
  };
};
const singleTransactionHistory = async (query: {
  id: string;
  userId?: string;
}) => {
  const result = await prisma.payment.findUnique({
    where: query,
    select: {
      id: true,
      amount: true,
      // userId: true,
      paymentMethodType: true,
      createdAt: true,
      stripeCustomerId: true,
      stripePaymentId: true,
      stripeSessionId: true,
      currency: true,
      status: true,
      // user: {
      //   select: {
      //     profile: true,
      //     fullName: true,
      //     email: true,
      //   },
      // },
    },
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Transaction history not found');
  }
  return result;
};
const singleTransactionHistoryBySessionId = async (query: {
  stripeSessionId: string;
  userId?: string;
}) => {
  const result = await prisma.payment.findUnique({
    where: query,
    select: {
      id: true,
      amount: true,
      // userId: true,
      paymentMethodType: true,
      createdAt: true,
      stripeCustomerId: true,
      stripePaymentId: true,
      stripeSessionId: true,
      currency: true,
      status: true,

      // user: {
      //   select: {
      //     profile: true,
      //     fullName: true,

      //     email: true,
      //   },
      // },
    },
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Transaction history not found');
  }
  return result;
};

const cancelPayment = async (
  id: string,
  userId: string,
  role: UserRoleEnum,
) => {
  return await prisma.payment.update({
    where: {
      id,
      ...(role !== 'ADMIN' && { userId }),
    },
    data: {
      status: 'CANCELED',
    },
  });
};

export const PaymentService = {
  getAllPayments,
  singleTransactionHistory,
  cancelPayment,
  singleTransactionHistoryBySessionId,
};
