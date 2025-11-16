import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from '../utils/verifyToken';
import config from '../../config';
import { Secret } from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  role?: 'USER';
}

export const onlineUsers = new Set<string>();
const userSockets = new Map<string, ExtendedWebSocket>();

export async function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('New user connected');

    ws.on('message', async (data: string) => {
      try {
        const parsedData = JSON.parse(data);
        switch (parsedData.event) {
          case 'authenticate': {
            const token = parsedData.token;

            if (!token) {
              console.log('No token provided');
              ws.close();
              return;
            }

            const user = verifyToken(token, config.jwt.access_secret as Secret);

            if (!user) {
              console.log('Invalid token');
              ws.close();
              return;
            }

            const { id } = user;

            ws.userId = id;
            ws.role = user.role as 'USER';
            onlineUsers.add(id);
            userSockets.set(id, ws);

            broadcastToAll(wss, {
              event: 'userStatus',
              data: { userId: id, isOnline: true },
            });
            break;
          }
          // Couple Message (only to partner)
          case 'message': {
            const { receiverId, message } = parsedData;

            if (!ws.userId || !receiverId || !message) {
              console.log('Invalid message payload');
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            // Validation: Ensure sender and receiver are partners (same couple)
            const sender = await prisma.user.findUnique({
              where: { id: ws.userId },
              select: { coupleId: true },
            });

            const receiver = await prisma.user.findUnique({
              where: { id: receiverId },
              select: { coupleId: true },
            });

            if (!sender || !receiver || sender.coupleId !== receiver.coupleId) {
              console.log('Validation failed: Not partners');
              ws.send(
                JSON.stringify({
                  event: 'error',
                  message: 'Can only message your partner',
                }),
              );
              return;
            }

            const coupleId = sender.coupleId as string;

            // Get or create room for couple
            let room = await prisma.room.findUnique({
              where: { coupleId },
            });

            if (!room) {
              room = await prisma.room.create({
                data: { coupleId },
              });
            }

            // Save chat in room
            const chat = await prisma.chat.create({
              data: {
                roomId: room.id,
                senderId: ws.userId,
                receiverId,
                message,
              },
            });

            // Send to receiver if online
            const receiverSocket = userSockets.get(receiverId);
            if (
              receiverSocket &&
              receiverSocket.readyState === WebSocket.OPEN
            ) {
              receiverSocket.send(
                JSON.stringify({ event: 'message', data: chat }),
              );
            }

            // Echo to sender
            ws.send(JSON.stringify({ event: 'message', data: chat }));
            break;
          }
          // Fetch Couple Chats (partner only)
          case 'fetchChats': {
            const { receiverId } = parsedData;
            if (!ws.userId || !receiverId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            // Validation: Same couple check (as above)
            const sender = await prisma.user.findUnique({
              where: { id: ws.userId },
              select: { coupleId: true },
            });

            const receiver = await prisma.user.findUnique({
              where: { id: receiverId },
              select: { coupleId: true },
            });

            if (!sender || !receiver || sender.coupleId !== receiver.coupleId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid partner' }),
              );
              return;
            }

            const coupleId = sender.coupleId!;

            // Get room
            const room = await prisma.room.findUnique({
              where: { coupleId },
            });

            if (!room) {
              ws.send(JSON.stringify({ event: 'fetchChats', data: [] }));
              return;
            }

            // Fetch chats
            const chats = await prisma.chat.findMany({
              where: { roomId: room.id },
              orderBy: { createdAt: 'asc' },
              include: {
                sender: { select: { fullName: true, nickName: true } },
              },
            });

            // Mark as read for sender
            await prisma.chat.updateMany({
              where: { roomId: room.id, receiverId: ws.userId, isRead: false },
              data: { isRead: true },
            });

            ws.send(JSON.stringify({ event: 'fetchChats', data: chats }));
            break;
          }
          // Unread Messages (for partner)
          case 'unReadMessages': {
            const { receiverId } = parsedData;
            if (!ws.userId || !receiverId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid payload' }),
              );
              return;
            }

            // Validation (same as above)
            const sender = await prisma.user.findUnique({
              where: { id: ws.userId },
              select: { coupleId: true },
            });
            const receiver = await prisma.user.findUnique({
              where: { id: receiverId },
              select: { coupleId: true },
            });
            if (!sender || !receiver || sender.coupleId !== receiver.coupleId) {
              ws.send(
                JSON.stringify({ event: 'error', message: 'Invalid partner' }),
              );
              return;
            }

            const coupleId = sender.coupleId!;

            const room = await prisma.room.findUnique({ where: { coupleId } });
            if (!room) {
              ws.send(
                JSON.stringify({
                  event: 'unReadMessages',
                  data: { messages: [], count: 0 },
                }),
              );
              return;
            }

            const unReadMessages = await prisma.chat.findMany({
              where: { roomId: room.id, isRead: false, receiverId: ws.userId },
              include: { sender: { select: { fullName: true } } },
            });

            ws.send(
              JSON.stringify({
                event: 'unReadMessages',
                data: {
                  messages: unReadMessages,
                  count: unReadMessages.length,
                },
              }),
            );
            break;
          }
          // Online Users (filtered to partners only, optional)
          case 'onlineUsers': {
            if (!ws.userId) return;

            // Get partner's ID
            const user = await prisma.user.findUnique({
              where: { id: ws.userId },
              select: {
                coupleId: true,
                couple: { select: { users: { select: { id: true } } } },
              },
            });

            if (!user?.couple) {
              ws.send(JSON.stringify({ event: 'onlineUsers', data: [] }));
              return;
            }

            const partnerId = user.couple.users.find(
              u => u.id !== ws.userId,
            )?.id;

            const isPartnerOnline = partnerId && onlineUsers.has(partnerId);

            ws.send(
              JSON.stringify({
                event: 'onlineUsers',
                data: { partnerOnline: isPartnerOnline },
              }),
            );
            break;
          }
          default:
            console.log('Unknown event type:', parsedData.event);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({ event: 'error', message: 'Server error' }));
      }
    });

    ws.on('close', async () => {
      const extendedWs = ws as ExtendedWebSocket;
      if (extendedWs.userId) {
        const userId = extendedWs.userId;
        onlineUsers.delete(userId);
        userSockets.delete(userId);
        // Broadcast to partner only
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { couple: { select: { users: { select: { id: true } } } } },
        });
        const partnerId = user?.couple?.users.find(u => u.id !== userId)?.id;
        if (partnerId) {
          const partnerSocket = userSockets.get(partnerId);
          if (partnerSocket && partnerSocket.readyState === WebSocket.OPEN) {
            partnerSocket.send(
              JSON.stringify({
                event: 'userStatus',
                data: { userId, isOnline: false },
              }),
            );
          }
        }
      }
      console.log('User disconnected');
    });
  });

  return wss;
}

function broadcastToAll(wss: WebSocketServer, message: object) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
