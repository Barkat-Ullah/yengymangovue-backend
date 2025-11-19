import { prisma } from '../../utils/prisma';
import { Request } from 'express';

const createIntoDb = async (req: Request) => {
  const { title, description } = req.body;

  const result = await prisma.faq.create({
    data: {
      title,
      description,
    },
  });

  return result;
};

const getAllFaq = async (query: Record<string, any>) => {
  const result = await prisma.faq.findMany({
    orderBy: { createdAt: 'desc' },
    omit: { createdAt: true, updatedAt: true },
  });

  return result;
};

const getMyFaq = async (userId: string) => {
  // If FAQs are user-specific, add userId field in model
  // Placeholder as you requested:

  console.log('User ID:', userId);

  const result = await prisma.faq.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return result;
};

const getFaqByIdFromDB = async (id: string) => {
  const result = await prisma.faq.findUnique({
    where: { id },
  });
  return result;
};

const updateIntoDb = async (id: string, data: Partial<any>) => {
  const result = await prisma.faq.update({
    where: { id },
    data,
  });
  return result;
};

const deleteIntoDb = async (id: string) => {
  const result = await prisma.faq.delete({
    where: { id },
  });
  return result;
};

const softDeleteIntoDb = async (id: string) => {
  // For soft delete add field: isDeleted Boolean @default(false)
  const result = await prisma.faq.update({
    where: { id },
    data: { description: '[deleted]' },
  });
  return result;
};

export const FaqServices = {
  createIntoDb,
  getAllFaq,
  getMyFaq,
  getFaqByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
