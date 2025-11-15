import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import { PaymentStatus } from '@prisma/client';

export const getDateRange = (period: string, offset: number = 0) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let start: Date, end: Date;

  switch (period.toLowerCase()) {
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
      break;
    case 'yearly':
      const year = now.getFullYear() - offset;
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
      break;
    default:
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Invalid period: monthly or yearly',
      );
  }

  end.setHours(23, 59, 59, 999);

  return { start, end };
};


export const getMonthlyRevenue = async () => {
  const currentYear = new Date().getFullYear();

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const monthlyRevenue = [];

  for (let month = 0; month < 12; month++) {
    const start = new Date(currentYear, month, 1);
    const end = new Date(currentYear, month + 1, 0, 23, 59, 59);

    const revenue = await prisma.payment.aggregate({
      where: {
        status: PaymentStatus.SUCCESS,
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    monthlyRevenue.push({
      month: months[month],
      revenue: revenue._sum.amount || 0,
    });
  }

  return monthlyRevenue;
};
