import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/utils/supabaseAuth';

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

    // Sign in the user
    const data = await signIn(email, password);

    return NextResponse.json(
      { 
        message: 'Login successful',
        user: data.user,
        session: data.session
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Login error:', error);
    const err = error as { message: string };
    
    // Handle specific error cases
    if (err.message.includes('Invalid login credentials')) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: err.message || 'An error occurred during login' },
      { status: 500 }
    );
  }
} 