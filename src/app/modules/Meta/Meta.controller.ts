import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { MetaServices } from './Meta.service';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await MetaServices.createIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created Meta',
    data: result,
  });
});

const getAllMeta = catchAsync(async (req: Request, res: Response) => {
  const { period } = req.query;
  const result = await MetaServices.getAllMeta( period as string);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all Meta',
    data: result,
  });
});

const getMyMeta = catchAsync(async (req: Request, res: Response) => {
  const result = await MetaServices.getMyMeta(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved my Meta',
    data: result,
  });
});

const getMetaById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MetaServices.getMetaByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved Meta by id',
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MetaServices.updateIntoDb(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated Meta',
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MetaServices.deleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted Meta',
    data: result,
  });
});

const softDeleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await MetaServices.softDeleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully soft deleted Meta',
    data: result,
  });
});

export const MetaController = {
  createIntoDb,
  getAllMeta,
  getMyMeta,
  getMetaById,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
