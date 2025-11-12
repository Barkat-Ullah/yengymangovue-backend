import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PageContentServices } from './Security.service';
import httpStatus from 'http-status';



 const createPageContent = catchAsync(
  async (req: Request, res: Response) => {
    const { type, title } = req.body;
    const page = await PageContentServices.createPageContent({ type, title });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Page content created',
      data: page,
    });
  },
);

 const getPageContent = catchAsync(
  async (req: Request, res: Response) => {
    const type = req.params.type as 'REFUND' | 'TERMS' | 'PRIVACY';
    const page = await PageContentServices.getPageContent(type);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Page content fetched',
      data: page,
    });
  },
);

 const updatePageContent = catchAsync(
  async (req: Request, res: Response) => {
    const type = req.params.type as 'REFUND' | 'TERMS' | 'PRIVACY';
    const { title } = req.body;
    const page = await PageContentServices.updatePageContent(type, title);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Page content updated',
      data: page,
    });
  },
);

export const PageContentController = {
  createPageContent,
  getPageContent,
  updatePageContent,
};