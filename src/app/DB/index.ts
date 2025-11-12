import { UserRoleEnum } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import config from '../../config';
import { prisma } from '../utils/prisma';

const adminData = {
  fullName: 'Admin',
  email: 'admin@gmail.com',
  password: '123456',
  role: UserRoleEnum.ADMIN,
  isEmailVerified: true,
};

const seedSuperAdmin = async () => {
  try {
    // Check if a super admin already exists
    const isSuperAdminExists = await prisma.user.findFirst({
      where: {
        // role: UserRoleEnum.ADMIN,
        email:adminData.email
      },
    });

    // If not, create one
    if (!isSuperAdminExists) {
      adminData.password = await bcrypt.hash(
        config.super_admin_password as string,
        Number(config.bcrypt_salt_rounds) || 12,
      );
      await prisma.user.create({
        data: adminData,
      });
      console.log('✅ Super Admin created successfully.');
    } else {
      console.log('❌ Super Admin already exists.');
    }
  } catch (error) {
    console.error('Error seeding Super Admin:', error);
  }
};

export default seedSuperAdmin;
