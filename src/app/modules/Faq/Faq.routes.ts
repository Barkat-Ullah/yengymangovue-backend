import express from 'express';
import { FaqController } from './Faq.controller';
import validateRequest from '../../middlewares/validateRequest';
import { FaqValidation } from './Faq.validation';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

router.get('/', FaqController.getAllFaq);
router.get('/:id', FaqController.getFaqById);

router.post(
  '/',
  auth(UserRoleEnum.ADMIN),
  validateRequest.body(FaqValidation.createFaqZodSchema),
  FaqController.createIntoDb,
);

router.patch(
  '/:id',
  validateRequest.body(FaqValidation.updateFaqZodSchema),
  FaqController.updateIntoDb,
);

router.delete('/:id', FaqController.deleteIntoDb);

export const FaqRoutes = router;
