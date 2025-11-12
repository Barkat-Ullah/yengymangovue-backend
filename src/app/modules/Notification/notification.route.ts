import express from 'express';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { notificationsControllers } from './notification.controller';
import validateRequest from '../../middlewares/validateRequest';
import { notificationValidation } from './notification.validation';

export const NotificationsRouters = express.Router();

// Get all notifications for the authenticated user
NotificationsRouters.get(
  '/',
  auth('ANY'),
  notificationsControllers.getAllNotifications,
);

// Get all users by a specific notification ID
NotificationsRouters.get(
  '/users/:notificationId',
  auth('ADMIN'),
  notificationsControllers.getUsersByNotification,
);

// Mark a specific notification as read for the authenticated user
NotificationsRouters.patch(
  '/read/:notificationId',
  auth('ANY'),
  notificationsControllers.markNotificationAsRead,
);

// Get the unread notification count for the authenticated user
NotificationsRouters.get(
  '/unread/count',
  auth('ANY'),
  notificationsControllers.getUnreadNotificationCount,
);

// Mark all notifications as read for the authenticated user
NotificationsRouters.patch(
  '/read-all',
  auth('ANY'),
  notificationsControllers.markAllNotificationsAsRead,
);