import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { Request, Response } from 'express';
import { SubscriptionServices } from './Subscription.service';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  if (req.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only admin can create subscriptions');
  }
  const result = await SubscriptionServices.createIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Successfully created Subscription',
    data: result,
  });
});

const getAllSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionServices.getAllSubscription();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved all Subscription',
    data: result,
  });
});

const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  // console.log(req.user)
  const result = await SubscriptionServices.getOurSubscription(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved my Subscription',
    data: result,
  });
});

const getSubscriptionById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionServices.getSubscriptionByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully retrieved Subscription by id',
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionServices.updateIntoDb(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully updated Subscription',
    data: result,
  });
});

const buySubscriptionIntoDb = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SubscriptionServices.buySubscription(req.user.id,req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message || 'Successfully buy Subscription',
      data: result,
    });
  },
);

const softDeleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SubscriptionServices.softDeleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully soft deleted Subscription',
    data: result,
  });
});

const deleteMySubIntoDb = catchAsync(async (req: Request, res: Response) => {

  const result = await SubscriptionServices.deleteMySubscription(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully deleted my Subscription',
    data: result,
  });
});

export const SubscriptionController = {
  createIntoDb,
  getAllSubscription,
  getMySubscription,
  getSubscriptionById,
  updateIntoDb,
  buySubscriptionIntoDb,
  softDeleteIntoDb,
  deleteMySubIntoDb,
};
