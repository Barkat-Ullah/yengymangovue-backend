import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { PaymentStatus, UserRoleEnum } from '@prisma/client';

const getAllPayments = async (query: Record<string, any>) => {
  const { page = 1, limit = 10, status, ...otherQuery } = query;

  const where: any = {
    ...otherQuery,
  };

  if (status) {
    where.status = status; 
  }

  const total = await prisma.payment.count({ where });
  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
          coupleId: true,
          couple: {
            select: {
              id: true,
              subscriptions: {
                select: { title: true, duration: true },
              },
              users: {
                select: { fullName: true },
                where: { isDeleted: false },
              },
            },
          },
        },
      },

    },
    orderBy: { createdAt: 'desc' },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });

  // Transformation
  const uniquePayments = new Map<string, any>();
  let totalRevenue = 0;

  payments.forEach(payment => {
    const key = payment.id; 

    if (payment.status === 'SUCCESS' && payment.amount > 0) {
      totalRevenue += payment.amount;
    }

    let customerName = payment.user.fullName;
    let plan =
      payment.user.couple?.subscriptions?.title ||
      payment.user.couple?.subscriptions?.duration
        ?.toLowerCase()
        ?.replace('monthly', 'Monthly')
        .replace('yearly', 'Yearly') ||
      'N/A';
    if (
      payment.user.coupleId &&
      payment.user.couple &&
      payment.user.couple.users?.length > 0
    ) {
      const coupleNames = payment.user.couple.users
        .map((u: any) => u.fullName)
        .sort()
        .join(' & ');
      customerName = coupleNames;
    }

    const transformedPayment = {
      ...payment,
      customerName,
      plan,
      formattedDate: new Date(payment.createdAt).toLocaleDateString('en-CA'),
    };

    uniquePayments.set(key, transformedPayment);
  });

  const transformedData = Array.from(uniquePayments.values());

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
      userId: true,
      paymentMethodType: true,
      createdAt: true,
      stripeCustomerId: true,
      stripePaymentId: true,
      stripeSessionId: true,
      currency: true,
      status: true,
      user: {
        select: {
          profile: true,
          fullName: true,
          email: true,
        },
      },
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
      userId: true,
      paymentMethodType: true,
      createdAt: true,
      stripeCustomerId: true,
      stripePaymentId: true,
      stripeSessionId: true,
      currency: true,
      status: true,

      user: {
        select: {
          profile: true,
          fullName: true,

          email: true,
        },
      },
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
