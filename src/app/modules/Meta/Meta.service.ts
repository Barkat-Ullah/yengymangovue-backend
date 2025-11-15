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
  const dateWhere = {
    createdAt: {
      gte: periodStart,
      lte: periodEnd,
    },
  };
  const totalCouple = await prisma.couple.count({ where: dateWhere });
  const totalSubscription = await prisma.subscription.count({
    where: { isActive: true },
  });
  const totalRevenue = await prisma.payment
    .aggregate({
      where: {
        status: PaymentStatus.SUCCESS,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    })
    .then(agg => agg._sum.amount || 0);

  const monthlyPlanUser = await prisma.couple.count({
    where: {
      subscriptions: {
        duration: SubscriptionType.MONTHLY,
      },
    },
  });
  const yearlyPlanUser = await prisma.couple.count({
    where: {
      subscriptions: {
        duration: SubscriptionType.YEARLY,
      },
    },
  });
 const monthlyGrowth = await getMonthlyRevenue();
  console.log({ monthlyPlanUser, yearlyPlanUser });

  console.log({ totalCouple, totalRevenue, totalSubscription });

  return {
    totalCouple,
    totalRevenue,
    totalSubscription,
    monthlyPlanUser,
    yearlyPlanUser,
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
