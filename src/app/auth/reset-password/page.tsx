'use client';

import React from 'react';
import AuthForm from '@/components/AuthForm';
import { useAuth } from '@/context/AuthContext';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  
  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
  };
  
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-indigo-50/50 via-blue-50/30 to-white dark:from-gray-900 dark:via-gray-900/80 dark:to-gray-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-indigo-900 dark:text-white mb-2">Reset Password</h2>
          <p className="text-gray-600 dark:text-gray-400">Enter your email to receive a password reset link</p>
        </div>
        <AuthForm type="reset-password" onSubmit={handleResetPassword} />
      </div>
    </div>
  );
} 