import express from 'express';
import { BillboardController } from './Billboard.controller';
import validateRequest from '../../middlewares/validateRequest';
import { BillboardValidation } from './Billboard.validation';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

router.get(
  '/our-board',
  auth(UserRoleEnum.USER),
  BillboardController.getMyBillboard,
);
router.get(
  '/:id',
  auth(UserRoleEnum.USER),
  BillboardController.getBillboardById,
);

router.post(
  '/',
  auth(UserRoleEnum.USER),
  validateRequest.body(BillboardValidation.createBillboardZodSchema),
  BillboardController.createIntoDb,
);

router.patch(
  '/:id',
  auth(UserRoleEnum.USER),
  validateRequest.body(BillboardValidation.updateBillboardZodSchema),
  BillboardController.updateIntoDb,
);

router.delete(
  '/:id',
  auth(UserRoleEnum.USER),
  BillboardController.deleteIntoDb,
);

export const BillboardRoutes = router;
