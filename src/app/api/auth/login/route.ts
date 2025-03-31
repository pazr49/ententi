import { NextRequest, NextResponse } from 'next/server';
import { signIn } from '@/utils/supabaseAuth';
import { z } from 'zod';

// Define the schema for the request body
const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email format." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validationResult = LoginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data; // Use validated data

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