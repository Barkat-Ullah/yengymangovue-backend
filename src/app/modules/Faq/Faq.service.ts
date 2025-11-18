
import { Request } from "express";

const createIntoDb = async (req:Request) => {

  return null;
};

const getAllFaq = async (query: Record<string, any>) => {
  console.log(query);
  return [];
};

const getMyFaq = async (userId: string) => {  
 
  console.log('Fetching my Faq for user:', userId);
  return []; 
};

const getFaqByIdFromDB = async (id: string) => {
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

export const FaqServices = {
  createIntoDb,
  getAllFaq,
  getMyFaq, 
  getFaqByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
