import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/utils/supabaseAuth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Sign up the user
    const data = await signUp(email, password);

    return NextResponse.json(
      { 
        message: 'Signup successful. Please check your email to confirm your account.',
        user: data.user
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Signup error:', error);
    const err = error as { message: string };
    
    return NextResponse.json(
      { error: err.message || 'An error occurred during signup' },
      { status: 500 }
    );
  }
} 