import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { EventServices } from './Event.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await EventServices.createIntoDb(req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Event created successfully',
    data: result,
  });
});

const getMyEvent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { date } = req.query;

  const result = await EventServices.getMyEvent(userId, date as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Events retrieved successfully',
    data: result,
  });
});

const getEventById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const result = await EventServices.getEventByIdFromDB(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event retrieved successfully',
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const data = req.body;

  const result = await EventServices.updateIntoDb(id, userId, data);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event updated successfully',
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const result = await EventServices.deleteIntoDb(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event deleted successfully',
    data: result,
  });
});

const softDeleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const result = await EventServices.softDeleteIntoDb(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event soft deleted successfully',
    data: result,
  });
});

export const EventController = {
  createIntoDb,
  getMyEvent,
  getEventById,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
