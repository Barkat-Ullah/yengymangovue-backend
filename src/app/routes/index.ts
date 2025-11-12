import express from 'express';
import { NotificationsRouters } from '../modules/Notification/notification.route';
import { AuthRouters } from '../modules/Auth/Auth.routes';
import { UserRouters } from '../modules/User/user.routes';
import { PaymentRoutes } from '../modules/Payment/payment.route';
import { BillboardRoutes } from '../modules/Billboard/Billboard.routes';
import { SecurityRoutes } from '../modules/Security/Security.routes';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRouters,
  },
  {
    path: '/user',
    route: UserRouters,
  },
  {
    path: '/bill-board',
    route: BillboardRoutes,
  },
  {
    path: '/payment',
    route: PaymentRoutes,
  },
  {
    path: '/notifications',
    route: NotificationsRouters,
  },
  {
    path: '/security',
    route: SecurityRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
