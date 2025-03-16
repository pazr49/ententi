import { NextResponse } from 'next/server';
import { signOut } from '@/utils/supabaseAuth';

export async function POST() {
  try {
    await signOut();

    return NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Logout error:', error);
    const err = error as { message: string };
    
    return NextResponse.json(
      { error: err.message || 'An error occurred during logout' },
      { status: 500 }
    );
  }
} 