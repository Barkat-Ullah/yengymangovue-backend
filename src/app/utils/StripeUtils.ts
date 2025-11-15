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

export const StripeWebHook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    throw new AppError(httpStatus.NOT_FOUND, 'Missing Stripe signature');
  }

  const result = await StripeHook(req.body, sig);
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
      // Payment succeeded - update payment status to SUCCESS
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      // Payment failed - update payment status to FAILED
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      // Invoice payment succeeded (for subscription renewals)
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;

      // Invoice payment failed
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // Subscription deleted/cancelled
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      // Subscription updated
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      // Checkout session completed (if using Checkout)
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      // Checkout session expired
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // res.status(500).send(`Webhook Error: ${error.message}`);
  }
};

// Handle successful payment intent
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
) {
  console.log('Payment succeeded:', paymentIntent.id);

  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: paymentIntent.id },
    include: {
      user: {
        include: {
          couple: true,
        },
      },
    },
  });

  if (payment) {
    // Update payment status to SUCCESS
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCESS },
    });

    console.log(`Payment ${payment.id} marked as SUCCESS`);
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: paymentIntent.id },
    include: {
      user: {
        include: {
          couple: true,
        },
      },
    },
  });

  if (payment) {
    // Update payment status to FAILED
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });

    // Cancel subscription for user and partner if payment failed
    if (payment.user.coupleId) {
      // Update both users in the couple
      await prisma.user.updateMany({
        where: { coupleId: payment.user.coupleId },
        data: {
          subscriptionStart: null,
          subscriptionEnd: null,
        },
      });

      // Unlink subscription from couple
      await prisma.subscription.updateMany({
        where: { coupleId: payment.user.coupleId },
        data: { coupleId: null },
      });

      console.log(`Subscription cancelled for couple ${payment.user.coupleId}`);
    } else {
      // Cancel for single user
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionStart: null,
          subscriptionEnd: null,
        },
      });

      console.log(`Subscription cancelled for user ${payment.userId}`);
    }

    console.log(`Payment ${payment.id} marked as FAILED`);
  }
}

// Handle successful invoice payment (for subscription renewals)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);

  if (!invoice.subscription) {
    console.log('No subscription attached to invoice');
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
    include: {
      user: {
        include: {
          couple: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (payment) {
    // Create new payment record for renewal
    const newPayment = await prisma.payment.create({
      data: {
        userId: payment.userId,
        subscriptionId: payment.subscriptionId,
        amount: invoice.amount_paid / 100, 
        status: PaymentStatus.SUCCESS,
        stripePaymentId: (invoice.payment_intent as string) || '',
        stripeSubscriptionId: invoice.subscription as string,
        stripeCustomerId: invoice.customer as string,
      },
    });

    // Update subscription end date based on invoice period
    const periodEnd = new Date(invoice.period_end * 1000);

    // Update for both users if in couple
    if (payment.user.coupleId) {
      await prisma.user.updateMany({
        where: { coupleId: payment.user.coupleId },
        data: {
          subscriptionEnd: periodEnd,
        },
      });

      console.log(
        `Subscription renewed for couple ${payment.user.coupleId} until ${periodEnd}`,
      );
    } else {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionEnd: periodEnd,
        },
      });

      console.log(
        `Subscription renewed for user ${payment.userId} until ${periodEnd}`,
      );
    }

    console.log(`Created renewal payment record: ${newPayment.id}`);
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);

  if (!invoice.subscription) {
    console.log('No subscription attached to invoice');
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
    include: {
      user: {
        include: {
          couple: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (payment) {
    // Create failed payment record for renewal attempt
    await prisma.payment.create({
      data: {
        userId: payment.userId,
        subscriptionId: payment.subscriptionId,
        amount: invoice.amount_due / 100,
        status: PaymentStatus.FAILED,
        stripePaymentId: (invoice.payment_intent as string) || '',
        stripeSubscriptionId: invoice.subscription as string,
        stripeCustomerId: invoice.customer as string,
      },
    });

    console.log(`Payment failure recorded for subscription renewal`);
    // Note: Stripe will automatically retry failed payments
    // You may want to notify the user about the failed payment
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);

  const payment = await prisma.payment.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: {
      user: {
        include: {
          couple: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (payment) {
    // Cancel for both users in couple
    if (payment.user.coupleId) {
      await prisma.user.updateMany({
        where: { coupleId: payment.user.coupleId },
        data: {
          subscriptionStart: null,
          subscriptionEnd: null,
        },
      });

      // Unlink subscription from couple
      await prisma.subscription.updateMany({
        where: { coupleId: payment.user.coupleId },
        data: { coupleId: null },
      });

      console.log(`Subscription cancelled for couple ${payment.user.coupleId}`);
    } else {
      // Cancel for single user
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionStart: null,
          subscriptionEnd: null,
        },
      });

      console.log(`Subscription cancelled for user ${payment.userId}`);
    }
  }
}

// Handle subscription update (status changes, plan changes, etc.)
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);

  const payment = await prisma.payment.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    include: {
      user: {
        include: {
          couple: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (payment) {
    // Update subscription end date based on current period
    const periodEnd = new Date(subscription.current_period_end * 1000);

    // Update for both users if in couple
    if (payment.user.coupleId) {
      await prisma.user.updateMany({
        where: { coupleId: payment.user.coupleId },
        data: {
          subscriptionEnd: periodEnd,
        },
      });

      console.log(
        `Updated subscription end date for couple ${payment.user.coupleId} to ${periodEnd}`,
      );
    } else {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionEnd: periodEnd,
        },
      });

      console.log(
        `Updated subscription end date for user ${payment.userId} to ${periodEnd}`,
      );
    }

    // If subscription is cancelled but not yet expired
    if (
      subscription.status === 'canceled' ||
      subscription.cancel_at_period_end
    ) {
      console.log(
        `Subscription ${subscription.id} will be cancelled at period end: ${periodEnd}`,
      );
    }
  }
}

// Handle checkout session completed (if using Stripe Checkout)
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  console.log('Checkout session completed:', session.id);

  // If you're using Stripe Checkout, you might have stored the session ID
  if (session.payment_intent) {
    const payment = await prisma.payment.findFirst({
      where: { stripeSessionId: session.id },
      include: {
        user: {
          include: {
            couple: true,
          },
        },
      },
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          stripePaymentId: session.payment_intent as string,
        },
      });

      console.log(`Checkout session completed for payment ${payment.id}`);
    }
  }
}

// Handle checkout session expired
async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log('Checkout session expired:', session.id);

  const payment = await prisma.payment.findFirst({
    where: { stripeSessionId: session.id },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.CANCELED },
    });

    console.log(`Checkout session expired for payment ${payment.id}`);
  }
}
