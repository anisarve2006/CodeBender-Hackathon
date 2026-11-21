import { z } from 'zod';
import { COMMON_PASSWORDS } from '@/lib/auth/common-passwords';

export const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required').max(100),
    email: z.string().email('Valid email is required').toLowerCase().trim(),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(128, 'Password must be under 128 characters')
      .refine((pwd) => !COMMON_PASSWORDS.has(pwd.toLowerCase()), {
        message: 'This password is too common. Please choose a stronger one.',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      const emailUsername = data.email.split('@')[0]?.toLowerCase();
      return !emailUsername || !data.password.toLowerCase().includes(emailUsername);
    },
    {
      message: 'Password must not contain your email username',
      path: ['password'],
    },
  );

export const signinSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16, 'Invalid or missing reset token'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .max(128)
      .refine((pwd) => !COMMON_PASSWORDS.has(pwd.toLowerCase()), {
        message: 'This password is too common. Please choose a stronger one.',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateAccountProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  timezone: z.string().min(2).max(50).optional(),
  phone: z.string().max(20).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
