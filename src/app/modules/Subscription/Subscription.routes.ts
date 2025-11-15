import express from 'express';
import { SubscriptionController } from './Subscription.controller';
import validateRequest from '../../middlewares/validateRequest';
import { SubscriptionValidation } from './Subscription.validation';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

router.get(
  '/',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  SubscriptionController.getAllSubscription,
);
router.get(
  '/my-subscription',
  auth(UserRoleEnum.USER),
  SubscriptionController.getMySubscription,
);
router.get(
  '/:id',
  auth(UserRoleEnum.USER),
  SubscriptionController.getSubscriptionById,
);

router.post(
  '/',
  auth(UserRoleEnum.ADMIN),
  validateRequest.body(SubscriptionValidation.createSubscriptionZodSchema),
  SubscriptionController.createIntoDb,
);
router.post(
  '/buy-subscription',
  auth(UserRoleEnum.USER),
  SubscriptionController.buySubscriptionIntoDb,
);

router.patch(
  '/:id',
  auth(UserRoleEnum.ADMIN),
  validateRequest.body(SubscriptionValidation.updateSubscriptionZodSchema),
  SubscriptionController.updateIntoDb,
);

router.delete(
  '/',
  auth(UserRoleEnum.USER),
  SubscriptionController.deleteMySubIntoDb,
);
router.delete(
  '/soft/:id',
  auth(UserRoleEnum.ADMIN),
  SubscriptionController.softDeleteIntoDb,
);

export const SubscriptionRoutes = router;
