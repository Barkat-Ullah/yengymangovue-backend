import { Request } from 'express';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { prisma } from '../../utils/prisma';
import { stripe } from '../../utils/stripe';
import Stripe from 'stripe';
import { PaymentStatus, SubscriptionType, UserRoleEnum } from '@prisma/client';

const createIntoDb = async (req: Request) => {
  const { title, price, duration, discountPercent, isDiscounted } = req.body;

  // Parse inputs
  const originalPrice = parseFloat(price);
  const discountPct = discountPercent
    ? parseFloat(discountPercent as string)
    : 0;

  // Validate discount logic
  if (isDiscounted && (!discountPct || discountPct <= 0 || discountPct > 100)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Discount percentage must be between 1 and 100',
    );
  }

  if (isDiscounted && discountPct >= 100) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Discount percentage cannot be 100% or more',
    );
  }

  // Calculate final price
  let finalPrice = originalPrice;
  if (isDiscounted && discountPct > 0) {
    finalPrice = originalPrice * (1 - discountPct / 100);
  }

  let stripeProductId: string | undefined;
  let stripePriceId: string | undefined;

  if (duration !== 'FREELY') {
    // Create Product on Stripe
    const product = await stripe.products.create({
      name: title,
      description: `Subscription plan - ${duration}${isDiscounted ? ` (${discountPct}% off)` : ''}`,
      active: true,
    });

    // Create Price on Stripe (use finalPrice)
    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(finalPrice * 100),
      currency: 'usd',
      recurring: {
        interval: duration === 'MONTHLY' ? 'month' : 'year',
      },
    });

    stripeProductId = product.id;
    stripePriceId = stripePrice.id;
  }

  // Create Subscription in DB
  const subscription = await prisma.subscription.create({
    data: {
      title,
      price: originalPrice,
      discountPercent: discountPct,
      duration,
      isDiscounted: Boolean(isDiscounted && discountPct > 0),
      stripeProductId,
      stripePriceId,
    },
  });

  return {
    ...subscription,
    discountedPrice: finalPrice,
  };
};

const getAllSubscription = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      role: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Build where clause based on role
  const where: any = {
    duration: {
      in: [SubscriptionType.MONTHLY, SubscriptionType.YEARLY],
    },
  };

  if (user.role === UserRoleEnum.USER) {
    where.isActive = true;
  }
  // For ADMIN, no isActive filter (shows all)

  const subscriptions = await prisma.subscription.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      price: true,
      duration: true,
      discountPercent: true,
      isDiscounted: true,
      stripePriceId: true,
      stripeProductId: true,
      isActive: true,
    },
  });

  // Transform: Calculate discounted price for each
  const transformedSubs = subscriptions.map(sub => {
    let discountedPrice = sub.price;
    if (sub.isDiscounted && sub.discountPercent && sub.discountPercent > 0) {
      discountedPrice = sub.price * (1 - sub.discountPercent / 100);
    }

    return {
      ...sub,
      discountedPrice: parseFloat(discountedPrice.toFixed(2)),
    };
  });

  return transformedSubs;
};

const buySubscription = async (userId: string, payload: any) => {
  const { subscriptionId, methodId } = payload;

  // Fetch data first (outside tx)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      couple: {
        include: {
          users: true,
          subscriptions: true,
        },
      },
    },
  });

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  if (!user.coupleId || !user.couple) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You must be connected to a couple to purchase a subscription.',
    );
  }

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  const isPaidSubscription =
    subscription.duration === SubscriptionType.MONTHLY ||
    subscription.duration === SubscriptionType.YEARLY;

  // Check couple-level active sub
  const hasActiveSub = user.couple.users.some(
    u => u.subscriptionEnd && u.subscriptionEnd > new Date(),
  );
  if (hasActiveSub) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Your couple already has an active subscription. Please cancel the current one before purchasing a new plan.',
    );
  }

  if (isPaidSubscription) {
    if (!methodId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Payment method ID is required for paid subscriptions.',
      );
    }

    if (!subscription.stripePriceId) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Subscription plan is missing Stripe Price ID. Contact support.',
      );
    }

    // Stripe calls OUTSIDE transaction
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user.id, coupleId: user.coupleId },
      });
      customerId = customer.id;
      // Update user (fast DB op; can be in tx below)
    }

    const retrievedMethod = await stripe.paymentMethods.retrieve(methodId);
    console.log({ retrievedMethod });
    await stripe.paymentMethods.attach(methodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: methodId },
    });

    const finalAmount =
      subscription.isDiscounted && subscription.discountPercent
        ? subscription.price -
          (subscription.price * subscription.discountPercent) / 100
        : subscription.price;

    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: subscription.stripePriceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    const latestInvoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = latestInvoice?.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Payment initiation failed. Could not retrieve payment intent.',
      );
    }

    const stripeSubscriptionId = stripeSubscription.id;
    const stripePaymentId = paymentIntent.id;

    // NOW start short transaction for DB ops only
    return await prisma.$transaction(async tx => {
      // Create payment record
      await tx.payment.create({
        data: {
          coupleId: user.coupleId as string,
          subscriptionId: subscription.id,
          amount: finalAmount,
          currency: 'usd',
          status: PaymentStatus.PENDING,
          stripePaymentId,
          stripeSubscriptionId,
          stripeCustomerId: customerId,
        },
      });

      return {
        message:
          'Payment initiated! Subscription will activate for you and your partner upon confirmation.',
        stripeSubscriptionId,
        clientSecret: paymentIntent.client_secret,
      };
    });
  } else {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Use connect flow for free subscription.',
    );
  }
};

const getOurSubscription = async (userId: string) => {
  // console.log('Fetching my Subscription for user:', userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      couple: {
        include: {
          subscriptions: true,
          users: {
            select: {
              id: true,
              fullName: true,
              email: true,
              subscriptionId: true,
              subscriptionStart: true,
              subscriptionEnd: true,
            },
          },
        },
      },
    },
  });
  // console.log({ user });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  const now = new Date();
  const subscriptionEnd = user.subscriptionEnd;

  // Check if user has active subscription
  const hasActiveSubscription =
    user.subscriptionEnd && user.subscriptionEnd > new Date();
  if (!hasActiveSubscription) {
    throw new AppError(httpStatus.NOT_FOUND, 'You do not have subscription');
  }

  const payment = await prisma.payment.findFirst({
    where: {
      coupleId: user.coupleId as string,
      status: PaymentStatus.SUCCESS,
    },
  });

  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  let remainingDays = 0;
  if (subscriptionEnd && hasActiveSubscription) {
    const timeDiffMs = subscriptionEnd.getTime() - now.getTime();
    remainingDays = Math.max(Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24)), 0);
  }

  if (remainingDays === 0) {
    await prisma.user.updateMany({
      where: {
        coupleId: user.coupleId,
      },
      data: {
        subscriptionStart: null,
        subscriptionEnd: null,
      },
    });
  }

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      subscriptionId: user.subscriptionId,
      subscriptionStart: user.subscriptionStart,
      subscriptionEnd: user.subscriptionEnd,
      remainingDays,
      hasActiveSubscription,
    },
    partner: user.couple?.users.find(u => u.id !== userId) || null,
  };
};

const getSubscriptionByIdFromDB = async (id: string) => {
  const sub = await prisma.subscription.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      price: true,
      duration: true,
      discountPercent: true,
      isDiscounted: true,
      stripePriceId: true,
      stripeProductId: true,
      isActive: true,
    },
  });

  // Early return if not found
  if (!sub) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  let discountedPrice = sub.price;
  if (sub.isDiscounted && sub.discountPercent && sub.discountPercent > 0) {
    discountedPrice = sub.price * (1 - sub.discountPercent / 100);
  }

  return {
    ...sub,
    discountedPrice: parseFloat(discountedPrice.toFixed(2)),
  };
};
const deleteMySubscription = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      couple: {
        include: {
          subscriptions: true,
          users: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!user.subscriptionEnd || user.subscriptionEnd < new Date()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You do not have an active subscription to cancel',
    );
  }

  // if (user.couple?.subscriptions) {
  //   await prisma.subscription.update({
  //     where: { id: user.couple.subscriptions.id },
  //     data: { coupleId: null },
  //   });
  // }

  // Update all users in the couple
  await prisma.user.updateMany({
    where: { coupleId: user.coupleId },
    data: {
      subscriptionStart: null,
      subscriptionEnd: null,
    },
  });

  return {
    message: 'Subscription cancelled for you and your partner',
  };
};

const updateIntoDb = async (id: string, data: Partial<any>) => {
  const { title, price, duration, discountPercent, isDiscounted, isActive } =
    data;

  const subscription = await prisma.subscription.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      price: true,
      discountPercent: true,
      duration: true,
      isDiscounted: true,
      stripePriceId: true,
      stripeProductId: true,
      coupleId: true,
      isActive: true,
    },
  });

  if (!subscription) {
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription not found');
  }

  // Prevent update if assigned to couple
  // if (subscription.coupleId) {
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'Cannot modify a subscription that is already assigned to a couple',
  //   );
  // }

  // Parse inputs if provided
  const originalPrice =
    price !== undefined ? parseFloat(price) : subscription.price;
  const discountPct =
    discountPercent !== undefined
      ? parseFloat(discountPercent as string)
      : subscription.discountPercent || 0;

  // Validate discount logic (if changed)
  if (isDiscounted && (!discountPct || discountPct <= 0 || discountPct > 100)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Discount percentage must be between 1 and 100',
    );
  }

  if (isDiscounted && discountPct >= 100) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Discount percentage cannot be 100% or more',
    );
  }

  // Calculate final price (recalculate if discount/price changed)
  let finalPrice = originalPrice;
  if (isDiscounted && discountPct > 0) {
    finalPrice = originalPrice * (1 - discountPct / 100);
  }

  let stripeProductId = subscription.stripeProductId;
  let stripePriceId: string | undefined;

  // Update Stripe (recreate price if price/discount/duration changed, as unit_amount immutable)
  if (subscription.duration !== 'FREELY') {
    if (!stripeProductId) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Missing Stripe Product ID. Cannot update paid subscription.',
      );
    }

    // Update Product (title, description if needed)
    if (title || discountPct !== subscription.discountPercent) {
      const discountText = isDiscounted ? ` (${discountPct}% off)` : '';
      await stripe.products.update(stripeProductId, {
        name: title || subscription.title,
        description: `${duration || subscription.duration} subscription plan${discountText}`,
      });
    }

    // Recreate Price (unit_amount and interval immutable in update)
    const newPrice = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: Math.round(finalPrice * 100),
      currency: 'usd',
      recurring: {
        interval:
          (duration || subscription.duration) === 'MONTHLY' ? 'month' : 'year',
      },
    });

    stripePriceId = newPrice.id;
  }

  // Build update data
  const updateData: any = {
    title: title || subscription.title,
    price: originalPrice,
    duration: duration || subscription.duration,
    discountPercent: discountPct,
    isDiscounted: Boolean(isDiscounted && discountPct > 0),
    stripePriceId,
    isActive,
  };

  const updatedSubscription = await prisma.subscription.update({
    where: { id },
    data: updateData,
  });

  return {
    ...updatedSubscription,
    discountedPrice: finalPrice,
  };
};
const softDeleteIntoDb = async (id: string) => {
  const subscription = await prisma.subscription.update({
    where: { id },
    data: { isActive: false },
  });

  return subscription;
};

export const SubscriptionServices = {
  createIntoDb,
  buySubscription,
  getAllSubscription,
  getOurSubscription,
  getSubscriptionByIdFromDB,
  updateIntoDb,
  softDeleteIntoDb,
  deleteMySubscription,
};
