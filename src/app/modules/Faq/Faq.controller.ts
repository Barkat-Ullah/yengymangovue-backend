import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { FaqServices } from './Faq.service';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.createIntoDb(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created FAQ',
    data: result,
  });
});

const getAllFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.getAllFaq(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all FAQs',
    data: result,
  });
});

const getMyFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.getMyFaq(req.user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved my FAQs',
    data: result,
  });
});

const getFaqById = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.getFaqByIdFromDB(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved FAQ',
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.updateIntoDb(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated FAQ',
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.deleteIntoDb(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted FAQ',
    data: result,
  });
});

const softDeleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.softDeleteIntoDb(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully soft deleted FAQ',
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
