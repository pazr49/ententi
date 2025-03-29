'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { AuthProvider } from '@/context/AuthContext';
import { SavedArticlesProvider } from '@/context/SavedArticlesContext';
import { Navbar } from '@/components/layout'; // Assuming Navbar is here or adjust path

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a Supabase client instance (only runs once per component instance)
  const [supabaseClient] = useState(() => createClientComponentClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <AuthProvider>
        <SavedArticlesProvider>
          <Navbar />
          {/* Render the rest of the app components passed as children */}
          {children} 
        </SavedArticlesProvider>
      </AuthProvider>
    </SessionContextProvider>
  );
} 