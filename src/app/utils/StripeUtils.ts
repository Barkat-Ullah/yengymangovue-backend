import { Request, Response } from 'express';
import { PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { stripe } from './stripe';
import { prisma } from './prisma';
import catchAsync from './catchAsync';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import sendResponse from './sendResponse';
import config from '../../config';

const handlePaymentIntentSucceeded = async (
  paymentIntent: Stripe.PaymentIntent,
) => {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentId: paymentIntent.id },
    include: {
      subscription: true,
    },
  });

  if (payment && payment.status === PaymentStatus.PENDING) {
    await prisma.$transaction(async tx => {
      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCESS },
      });

      // Calculate and set dates for couple users (initial activation)
      const startDate = new Date();
      const endDate = new Date(startDate);
      if (payment.subscription.duration === 'MONTHLY') {
        endDate.setMonth(startDate.getMonth() + 1);
      } else if (payment.subscription.duration === 'YEARLY') {
        endDate.setFullYear(startDate.getFullYear() + 1);
      }

      await tx.user.updateMany({
        where: { coupleId: payment.coupleId },
        data: {
          subscriptionId: payment.subscriptionId,
          subscriptionStart: startDate,
          subscriptionEnd: endDate,
        },
      });
    });

    console.log(
      `Payment ${payment.id} succeeded and subscription activated for couple ${payment.coupleId}`,
    );
  }
};

const handlePaymentIntentFailed = async (
  paymentIntent: Stripe.PaymentIntent,
) => {
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentId: paymentIntent.id },
  });

  if (payment) {
    await prisma.$transaction(async tx => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      // Cleanup user fields
      await tx.user.updateMany({
        where: { coupleId: payment.coupleId },
        data: {
          subscriptionId: null,
          subscriptionStart: null,
          subscriptionEnd: null,
        },
      });
    });

    console.log(
      `Payment ${payment.id} failed and fields cleared for couple ${payment.coupleId}`,
    );
  }
};

const handleSubscriptionCanceled = async (
  subscription: Stripe.Subscription,
) => {
  const payment = await prisma.payment.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (payment) {
    await prisma.$transaction(async tx => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.CANCELED },
      });

      await tx.user.updateMany({
        where: { coupleId: payment.coupleId },
        data: {
          subscriptionId: null,
          subscriptionStart: null,
          subscriptionEnd: null,
        },
      });

      // Deactivate subscription
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: { isActive: false },
      });
    });

    console.log(
      `Subscription ${subscription.id} canceled for couple ${payment.coupleId}`,
    );
  }
};

export const StripeWebHook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Missing Stripe signature');
  }

  const rawBody = req.body as Buffer; // Assume raw body middleware is used
  const result = await StripeHook(rawBody, sig);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Webhook processed successfully',
    data: result,
  });
});

export const StripeHook = async (
  rawBody: Buffer,
  signature: string | string[] | undefined,
) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature as string,
      config.stripe.stripe_webhook as string,
    );
  } catch (err) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Webhook signature verification failed: ${(err as Error).message}`,
    );
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(
          event.data.object as Stripe.Subscription,
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Webhook processing failed: ${error.message}`,
    );
  }
};
