import { NextRequest, NextResponse } from 'next/server';
import { signUp } from '@/utils/supabaseAuth';
import { z } from 'zod';

// Define the schema for the request body
const SignupSchema = z.object({
  email: z.string().email({ message: "Invalid email format." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validationResult = SignupSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data; // Use validated data

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