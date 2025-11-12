import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { notificationServices } from './notification.service';

// Get all notifications for the logged-in user
const getAllNotifications = catchAsync(async (req, res) => {
  const result = await notificationServices.getAllNotificationsByUser(req.user.id, req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

// Get users who received a specific notification
const getUsersByNotification = catchAsync(async (req, res) => {
  const { notificationId } = req.params;
  const result = await notificationServices.getUsersByNotification(notificationId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Users by notification retrieved successfully',
    data: result,
  });
});

// Mark a specific notification as read for the logged-in user
const markNotificationAsRead = catchAsync(async (req, res) => {
  const { notificationId } = req.params;
  const result = await notificationServices.markNotificationAsRead(notificationId, req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Notification marked as read successfully',
    data: result,
  });
});

// Get unread notification count for the logged-in user
const getUnreadNotificationCount = catchAsync(async (req, res) => {
  const result = await notificationServices.getUnreadNotificationCount(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Unread notification count retrieved successfully',
    data: result,
  });
});

// Mark all notifications as read for the logged-in user
const markAllNotificationsAsRead = catchAsync(async (req, res) => {
  const result = await notificationServices.markAllNotificationsAsRead(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'All notifications marked as read successfully',
    data: result,
  });
});


export const notificationsControllers = {
  getAllNotifications,
  getUsersByNotification,
  markNotificationAsRead,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
};
