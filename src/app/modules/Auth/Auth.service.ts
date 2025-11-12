import sendOtpViaMail, { generateOtpEmail } from './../../utils/sendMail';
import * as bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Secret, SignOptions } from 'jsonwebtoken';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { User, UserRoleEnum, UserStatus } from '@prisma/client';
import { Response } from 'express';
import {
  getOtpStatusMessage,
  otpExpiryTime,
  generateOTP,
} from '../../utils/otp';
import sendResponse from '../../utils/sendResponse';
import { generateToken } from '../../utils/generateToken';
import { insecurePrisma, prisma } from '../../utils/prisma';
import emailSender from './../../utils/sendMail';
import { generateInviteCode } from './Auth.helper';

// ======================== LOGIN WITH OTP ========================
const loginWithOtpFromDB = async (
  res: Response,
  payload: { email: string; password: string },
) => {
  const userData = await insecurePrisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!userData) {
    throw new AppError(401, 'User not found');
  }

  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    userData.password,
  );
  if (!isCorrectPassword)
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect');

  if (userData.role !== UserRoleEnum.ADMIN && !userData.isEmailVerified) {
    const otp = generateOTP().toString();

    await prisma.user.update({
      where: { email: userData.email },
      data: {
        otp,
        otpExpiry: otpExpiryTime(),
      },
    });

    sendOtpViaMail(payload.email, otp, 'OTP Verification');

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Please check your email for the verification OTP.',
      data: '',
    });
  } else {
    const accessToken = await generateToken(
      {
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as SignOptions['expiresIn'],
    );

    return {
      id: userData.id,
      name: userData.fullName,
      email: userData.email,
      role: userData.role,
      accessToken,
    };
  }
};

// ======================== REGISTER WITH OTP ========================
const registerWithOtpIntoDB = async (payload: User) => {
  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const isUserExist = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });
  if (isUserExist)
    throw new AppError(httpStatus.CONFLICT, 'User already exists');

  const otp = generateOTP().toString();
  const inviteCode = generateInviteCode();

  const newUser = await prisma.user.create({
    data: {
      ...payload,
      password: hashedPassword,
      otp,
      otpExpiry: otpExpiryTime(),
      invite_code: inviteCode,
      isConnected: false,
    },
  });
  try {
    const html = generateOtpEmail(otp);
    await emailSender(newUser.email, html, 'OTP Verification');
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send OTP email',
    );
  }
  return 'Please check mail to verify your email';
};

// ======================== GET INVITE CODE (POST-REGISTRATION) ========================
const getInviteCode = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { invite_code: true, isConnected: true },
  });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  if (user.isConnected || !user.invite_code) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No invite code available (already connected)',
    );
  }
  return {
    inviteCode: user.invite_code,
  };
};

// ======================== CONNECT WITH INVITE CODE (POST-REGISTRATION) ========================
const connectWithInviteCode = async (userId: string, inviteCode: string) => {
  return await prisma.$transaction(async tx => {
    const currentUser = await tx.user.findUnique({
      where: { id: userId },
    });
    if (!currentUser)
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    if (currentUser.isConnected) {
      throw new AppError(httpStatus.BAD_REQUEST, 'You are already connected');
    }

    const partner = await tx.user.findUnique({
      where: { invite_code: inviteCode },
    });
    if (!partner || partner.isConnected || partner.id === userId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Invalid invite code or already used',
      );
    }

    // Create Couple
    const couple = await tx.couple.create({ data: {} });

    // Link both to the couple
    await tx.user.update({
      where: { id: currentUser.id },
      data: { coupleId: couple.id, isConnected: true, invite_code: null },
    });

    await tx.user.update({
      where: { id: partner.id },
      data: { coupleId: couple.id, isConnected: true, invite_code: null },
    });

    return { message: 'Connected successfully!' };
  });
};
// ======================== COMMON OTP VERIFY (REGISTER + FORGOT) ========================
const verifyOtpCommon = async (payload: { email: string; otp: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      id: true,
      email: true,
      otp: true,
      otpExpiry: true,
      isEmailVerified: true,
      fullName: true,
      role: true,
      invite_code: true,
    },
  });

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found!');

  if (
    !user.otp ||
    user.otp !== payload.otp ||
    !user.otpExpiry ||
    new Date(user.otpExpiry).getTime() < Date.now()
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid or expired OTP');
  }

  let message = 'OTP verified successfully!';

  if (user.isEmailVerified === false) {
    await prisma.user.update({
      where: { email: user.email },
      data: { otp: null, otpExpiry: null, isEmailVerified: true },
    });

    message = 'Email verified successfully!';

    // Generate access token for registration flow
    const accessToken = await generateToken(
      {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as SignOptions['expiresIn'],
    );

    return {
      message,
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      code: user.invite_code,
      accessToken,
    };
  }
  // Step 5: Handle forgot password case
  else {
    await prisma.user.update({
      where: { email: user.email },
      data: { otp: null, otpExpiry: null },
    });

    message = 'OTP verified for password reset!';
    return { message };
  }
};

// ======================== RESEND OTP ========================
const resendVerificationWithOtp = async (email: string) => {
  const user = await insecurePrisma.user.findFirst({ where: { email } });
  if (!user) {
    throw new AppError(401, 'User not found');
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(httpStatus.FORBIDDEN, 'User is Suspended');
  }

  if (user.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }

  const otp = generateOTP().toString();
  const expiry = otpExpiryTime();

  await prisma.user.update({
    where: { email },
    data: { otp, otpExpiry: expiry },
  });

  try {
    await sendOtpViaMail(email, otp, 'OTP Verification');
  } catch {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send OTP email',
    );
  }

  return {
    message: 'Verification OTP sent successfully. Please check your inbox.',
  };
};

// ======================== CHANGE PASSWORD ========================
const changePassword = async (user: any, payload: any) => {
  const userData = await insecurePrisma.user.findUnique({
    where: { email: user.email, status: 'ACTIVE' },
  });

  if (!userData) {
    throw new AppError(401, 'User not found');
  }

  const isCorrectPassword = await bcrypt.compare(
    payload.oldPassword,
    userData.password,
  );
  if (!isCorrectPassword)
    throw new AppError(httpStatus.BAD_REQUEST, 'Password incorrect!');

  const hashedPassword = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: { id: userData.id },
    data: { password: hashedPassword },
  });

  return { message: 'Password changed successfully!' };
};

// ======================== FORGOT PASSWORD ========================
const forgetPassword = async (email: string) => {
  const userData = await prisma.user.findUnique({
    where: { email },
    select: { email: true, status: true, id: true, otpExpiry: true, otp: true },
  });
  if (!userData) {
    throw new AppError(401, 'User not found');
  }
  if (userData.status === UserStatus.SUSPENDED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User has been suspended');
  }

  if (
    userData.otp &&
    userData.otpExpiry &&
    new Date(userData.otpExpiry).getTime() > Date.now()
  ) {
    const message = getOtpStatusMessage(userData.otpExpiry);
    throw new AppError(httpStatus.CONFLICT, message);
  }

  const otp = generateOTP().toString();
  const expireTime = otpExpiryTime();

  try {
    await prisma.$transaction(async tx => {
      await tx.user.update({
        where: { email },
        data: { otp, otpExpiry: expireTime },
      });

      try {
        const html = generateOtpEmail(otp);
        await emailSender(userData.email, html, 'OTP Verification');
      } catch {
        await tx.user.update({
          where: { email },
          data: { otp: null, otpExpiry: null },
        });
        throw new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to send OTP email',
        );
      }
    });
  } catch {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP');
  }
};

// ======================== RESET PASSWORD ========================
const resetPassword = async (payload: { password: string; email: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found!');

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await prisma.user.update({
    where: { email: payload.email },
    data: { password: hashedPassword, otp: null, otpExpiry: null },
  });

  return { message: 'Password reset successfully' };
};

// ======================== EXPORT ========================
export const AuthServices = {
  loginWithOtpFromDB,
  registerWithOtpIntoDB,
  getInviteCode,
  connectWithInviteCode,
  resendVerificationWithOtp,
  changePassword,
  forgetPassword,
  resetPassword,
  verifyOtpCommon,
};
