import crypto from 'crypto';

export const generateInviteCode = (): string => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};
