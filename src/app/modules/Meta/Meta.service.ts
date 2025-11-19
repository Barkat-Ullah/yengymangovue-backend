import { Request } from 'express';
import { prisma } from '../../utils/prisma';
import { PaymentStatus, SubscriptionType } from '@prisma/client';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { getDateRange, getMonthlyRevenue } from './Meta.constant';

const createIntoDb = async (req: Request) => {
  return null;
};

const getAllMeta = async (period: string = 'monthly') => {
  if (typeof period !== 'string') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Period must be a string');
  }

  const { start: periodStart, end: periodEnd } = getDateRange(period);

  // Date range for filtering
  const dateWhere = {
    createdAt: {
      gte: periodStart,
      lte: periodEnd,
    },
  };

  // Total couples created in this period
  const totalCouple = await prisma.couple.count({
    where: dateWhere,
  });

  // Total subscriptions (active only)
  const totalSubscription = await prisma.subscription.count({
    where: { isActive: true },
  });

  // Total revenue in selected period
  const totalRevenue = await prisma.payment
    .aggregate({
      where: {
        status: PaymentStatus.SUCCESS,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    })
    .then(agg => agg._sum.amount || 0);

  // Count active monthly subscriptions (per couple)
  const monthlyPlanUsersCount = await prisma.user.count({
    where: {
      subscriptionEnd: { gt: new Date() },
      subscriptionId: {
        in: await prisma.subscription
          .findMany({
            where: { duration: 'MONTHLY' },
            select: { id: true },
          })
          .then(subs => subs.map(s => s.id)),
      },
    },
  });

  const yearlyPlanUsersCount = await prisma.user.count({
    where: {
      subscriptionEnd: { gt: new Date() },
      subscriptionId: {
        in: await prisma.subscription
          .findMany({
            where: { duration: 'YEARLY' },
            select: { id: true },
          })
          .then(subs => subs.map(s => s.id)),
      },
    },
  });

  console.log({ monthlyPlanUsersCount, yearlyPlanUsersCount });

  const monthlyGrowth = await getMonthlyRevenue();

  return {
    totalCouple,
    totalRevenue,
    totalSubscription,
    monthlyPlanUsersCount,
    yearlyPlanUsersCount,
    monthlyGrowth,
  };
};

const getMyMeta = async (userId: string) => {
  console.log('Fetching my Meta for user:', userId);
  return [];
};

const getMetaByIdFromDB = async (id: string) => {
  console.log(id);
  return null;
};

const updateIntoDb = async (id: string, data: Partial<any>) => {
  console.dir({ id, data });
  return null;
};

const deleteIntoDb = async (id: string) => {
  console.log(id);
  return null;
};

const softDeleteIntoDb = async (id: string) => {
  console.log(id);
  return null;
};

export const MetaServices = {
  createIntoDb,
  getAllMeta,
  getMyMeta,
  getMetaByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
