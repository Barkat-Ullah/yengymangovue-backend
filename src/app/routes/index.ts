import express from 'express';
import { AuthRouters } from '../modules/Auth/Auth.routes';
import { UserRouters } from '../modules/User/user.routes';
import { PaymentRoutes } from '../modules/Payment/payment.route';
import { BillboardRoutes } from '../modules/Billboard/Billboard.routes';
import { SecurityRouter } from '../modules/Security/Security.routes';
import { EventRoutes } from '../modules/Event/Event.routes';
import { SubscriptionRoutes } from '../modules/Subscription/Subscription.routes';
import { MetaRoutes } from '../modules/Meta/Meta.routes';
import { notificationsRoute } from '../modules/Notifications/Notification.routes';
import { FaqRoutes } from '../modules/Faq/Faq.routes';

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
    route: notificationsRoute,
  },
  {
    path: '/security',
    route: SecurityRouter,
  },
  {
    path: '/event',
    route: EventRoutes,
  },
  {
    path: '/subscription',
    route: SubscriptionRoutes,
  },
  {
    path: '/meta',
    route: MetaRoutes,
  },
  {
    path: '/faq',
    route: FaqRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
