import { EventStatus, Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import { Request } from 'express';
import AppError from '../../errors/AppError';
import { prisma } from '../../utils/prisma';

const createIntoDb = async (req: Request) => {
  const userId = req.user?.id;
  const { title, description, date, time, location, lat, lon } = req.body;

  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  // Check if user is connected to a couple
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { couple: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.coupleId || !user.couple) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You must be connected to a partner to create events',
    );
  }

  // Create the event
  const event = await prisma.event.create({
    data: {
      title,
      description,
      date: new Date(date),
      time,
      location,
      lat,
      lon,
      status: EventStatus.PENDING,
      createdById: userId,
      coupleId: user.coupleId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
      couple: true,
    },
  });

  return event;
};

const getMyEvent = async (userId: string) => {
  // console.log('Fetching my Event for user:', userId);

  // Get user's couple information
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.coupleId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not connected to any partner',
    );
  }

  // Get all events for this couple
  const events = await prisma.event.findMany({
    where: {
      coupleId: user.coupleId,
      // isDeleted: false,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Auto-update past events
  const now = new Date();
  const eventsToUpdate = events.filter(
    event =>
      event.date < now &&
      event.status !== EventStatus.PAST &&
      event.status !== EventStatus.CANCELLED,
  );

  if (eventsToUpdate.length > 0) {
    await prisma.event.updateMany({
      where: {
        id: { in: eventsToUpdate.map(e => e.id) },
      },
      data: {
        status: EventStatus.PAST,
      },
    });

    // Refresh events after update
    return await prisma.event.findMany({
      where: {
        coupleId: user.coupleId,
        // isDeleted: false,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profile: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profile: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  return events;
};

const getEventByIdFromDB = async (id: string, userId: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
      // couple: {
      //   include: {
      //     users: {
      //       select: {
      //         id: true,
      //         fullName: true,
      //         email: true,
      //         profile: true,
      //       },
      //     },
      //   },
      // },
    },
  });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // Check if user belongs to this couple
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true },
  });

  if (user?.coupleId !== event.coupleId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have access to this event',
    );
  }

  return event;
};

const updateIntoDb = async (id: string, userId: string, data: any) => {
  const { title, description, date, time, location, status, lat, lon } = data;

  // Get the event
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      couple: {
        include: {
          users: true,
        },
      },
    },
  });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // Check if user belongs to this couple
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true },
  });

  if (user?.coupleId !== event.coupleId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have access to this event',
    );
  }

  const updateData: Prisma.EventUpdateInput = {};

  // If the creator is updating basic details
  if (userId === event.createdById) {
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = new Date(date);
    if (time !== undefined) updateData.time = time;
    if (location !== undefined) updateData.location = location;
    if (lat) updateData.lat = parseFloat(lat);
    if (lon) updateData.lon = parseFloat(lon);
  }

  // If the partner is approving/cancelling
  if (userId !== event.createdById && status !== undefined) {
    if (status === EventStatus.APPROVED) {
      updateData.status = EventStatus.APPROVED;
      updateData.approvedBy = {
        connect: { id: userId },
      };
    } else if (status === EventStatus.CANCELLED) {
      updateData.status = EventStatus.CANCELLED;
      updateData.approvedBy = {
        connect: { id: userId },
      };
    }
  }

  // Update the event
  const updatedEvent = await prisma.event.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: true,
        },
      },
    },
  });

  return updatedEvent;
};

const deleteIntoDb = async (id: string, userId: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // Check if user belongs to this couple
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true },
  });

  if (user?.coupleId !== event.coupleId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have access to delete this event',
    );
  }

  // Only creator can permanently delete
  if (userId !== event.createdById) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only the event creator can permanently delete this event',
    );
  }

  await prisma.event.delete({
    where: { id },
  });

  return { message: 'Event deleted successfully' };
};

const softDeleteIntoDb = async (id: string, userId: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
  });

  if (!event) {
    throw new AppError(httpStatus.NOT_FOUND, 'Event not found');
  }

  // Check if user belongs to this couple
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true },
  });

  if (user?.coupleId !== event.coupleId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have access to delete this event',
    );
  }

  // Both partners can soft delete
  const softDeletedEvent = await prisma.event.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });

  return softDeletedEvent;
};

export const EventServices = {
  createIntoDb,
  getMyEvent,
  getEventByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
