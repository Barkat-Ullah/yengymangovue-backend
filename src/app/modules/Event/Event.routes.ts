import express from 'express';
import { EventController } from './Event.controller';
import validateRequest from '../../middlewares/validateRequest';
import { EventValidation } from './Event.validation';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

router.get('/our-event', auth(UserRoleEnum.USER), EventController.getMyEvent);
router.get('/:id', auth(UserRoleEnum.USER), EventController.getEventById);

router.post(
  '/',
  auth(UserRoleEnum.USER),
  validateRequest.body(EventValidation.createEventZodSchema),
  EventController.createIntoDb,
);

router.patch(
  '/:id',
  auth(UserRoleEnum.USER),
  validateRequest.body(EventValidation.updateEventZodSchema),
  EventController.updateIntoDb,
);

router.delete('/:id', auth(UserRoleEnum.USER), EventController.deleteIntoDb);
router.delete(
  '/soft/:id',
  auth(UserRoleEnum.USER),
  EventController.softDeleteIntoDb,
);

export const EventRoutes = router;
