import { NotificationType, NotificationUser, User } from '@prisma/client';
import QueryBuilder from '../../builder/QueryBuilder';
import { getSocket } from '../../utils/socket';
import { prisma } from '../../utils/prisma';

const createNotification = async (payload: {
  title: string;
  message: string;
  type: NotificationType;
  userIds: string[];
  redirectEndpoint?: string
}) => {
  const { title, message, type, userIds, redirectEndpoint } = payload;

  const io = getSocket();

  // Create the notification
  const notification = await prisma.notification.create({
    data: {
      title,
      message,
      type,
      redirectEndpoint: redirectEndpoint || ''
    },
  });

  // Save notification recipients and emit socket events
  if (userIds.length > 0) {
    const NotificationUsers = userIds.map(userId => ({
      notificationId: notification.id,
      userId,
    }));

    await prisma.notificationUser.createMany({
      data: NotificationUsers,
    });

    userIds.forEach(id => {
      console.log(`Emitting to user: ${id}`);
      io.to(id).emit('notification', {
        ...notification,
        isRead: false,
      });
      console.log(`Notification emitted to ${id}`);
    });

    console.log(`Notification sent to ${userIds.length} users:`, userIds);
  } else {
    console.log('No users provided for notification');
  }

  return notification;
};

const getAllNotificationsByUser = async (
  id: string,
  query: Record<string, unknown>,
) => {
  query.userId = id;
  const notificationQuery = new QueryBuilder(
    prisma.notificationUser,
    query,
  );
  const result = await notificationQuery
    .search(['name'])
    .filter()
    .sort()
    .exclude()
    .paginate()
    .customFields({
      id: true,
      isRead: true,
      notificationId: true,
      createdAt: true,
      notification: {
        select: {
          id: true,
          message: true,
          createdAt: true,
          title: true,
          type: true,
          redirectEndpoint: true
        }
      },
      receivedAt: true,
      updatedAt: true,
      userId: true,
      user: {
        select: {
          fullName: true,
        
          email: true,
          role: true
        }
      }
    })
    .execute();
  return result
};

const getUsersByNotification = async (notificationId: string) => {
  const users = await prisma.notificationUser.findMany({
    where: {
      notificationId: notificationId,
    },
    include: {
      user: true,
    },
  });

  return users.map(recipient => recipient.user);
};

const markNotificationAsRead = async (
  notificationId: string,
  userId: string,
) => {
  const updatedRecipient = await prisma.notificationUser.updateMany({
    where: {
      notificationId: notificationId,
      userId: userId,
    },
    data: {
      isRead: true,
    },
  });

  return updatedRecipient;
};

const getUnreadNotificationCount = async (userId: string) => {
  const count = await prisma.notificationUser.count({
    where: {
      userId: userId,
      isRead: false,
    },
  });

  return count;
};

const markAllNotificationsAsRead = async (userId: string) => {
  const updatedRecipients = await prisma.notificationUser.updateMany({
    where: {
      userId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return updatedRecipients;
};

export const notificationServices = {
  createNotification,
  getAllNotificationsByUser,
  getUsersByNotification,
  markNotificationAsRead,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
};