import { PrismaClient } from '@prisma/client';
import { PageContent } from '@prisma/client';
const prisma = new PrismaClient();

interface ICreatePageContent {
  type: 'REFUND' | 'TERMS' | 'PRIVACY';
  title: string;
}
const createPageContent = async (
  payload: ICreatePageContent,
): Promise<PageContent> => {
  const page = await prisma.pageContent.create({
    data: payload,
  });
  return page;
};

const getPageContent = async (
  type: 'REFUND' | 'TERMS' | 'PRIVACY',
): Promise<PageContent | null> => {
  return await prisma.pageContent.findFirst({
    where: { type },
  });
};

const updatePageContent = async (
  type: 'REFUND' | 'TERMS' | 'PRIVACY',
  title: string,
): Promise<PageContent> => {
  const page = await prisma.pageContent.updateMany({
    where: { type },
    data: { title },
  });

  // Since updateMany returns count, fetch the updated content
  const updatedPage = await prisma.pageContent.findFirst({ where: { type } });
  if (!updatedPage) throw new Error('PageContent not found after update');
  return updatedPage;
};

export const PageContentServices = {
  createPageContent,
  getPageContent,
  updatePageContent,
};
