import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/utils/supabaseAuth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Send password reset email
    await resetPassword(email);

    return NextResponse.json(
      { message: 'Password reset email sent. Please check your inbox.' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Password reset error:', error);
    const err = error as { message: string };
    
    return NextResponse.json(
      { error: err.message || 'An error occurred during password reset' },
      { status: 500 }
    );
  }
} 