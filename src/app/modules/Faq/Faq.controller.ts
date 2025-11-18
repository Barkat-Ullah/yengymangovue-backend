import catchAsync from "../../utils/catchAsync";
import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";
import { Request, Response } from "express";
import { FaqServices } from "./Faq.service";

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.createIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Successfully created Faq",
    data: result,
  });
});

const getAllFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.getAllFaq(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrieved all Faq",
    data: result,
  });
});

const getMyFaq = catchAsync(async (req: Request, res: Response) => {  
  const result = await FaqServices.getMyFaq(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrieved my Faq",
    data: result,
  });
});

const getFaqById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FaqServices.getFaqByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrieved Faq by id",
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FaqServices.updateIntoDb(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully updated Faq",
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FaqServices.deleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully deleted Faq",
    data: result,
  });
});

const softDeleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await FaqServices.softDeleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully soft deleted Faq",
    data: result,
  });
});

export const FaqController = {
  createIntoDb,
  getAllFaq,
  getMyFaq, 
  getFaqById,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
