import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { BillboardServices } from './Billboard.service';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await BillboardServices.createIntoDb(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created Billboard',
    data: result,
  });
});

const getMyBillboard = catchAsync(async (req: Request, res: Response) => {
  const result = await BillboardServices.getMyBillboard(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved my Billboard',
    data: result,
  });
});

const getBillboardById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BillboardServices.getBillboardByIdFromDB(
    req.user.id,
    id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved Billboard by id',
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BillboardServices.updateIntoDb(
    req.user.id,
    id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated Billboard',
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BillboardServices.deleteIntoDb(req.user.id, id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted Billboard',
    data: result,
  });
});

export const BillboardController = {
  createIntoDb,
  getMyBillboard,
  getBillboardById,
  updateIntoDb,
  deleteIntoDb,
};
