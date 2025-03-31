'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ShareHandlerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sharedUrl = searchParams.get('url');

    if (sharedUrl) {
      // Construct the target URL for the article reader view
      const readerUrl = `/article?url=${encodeURIComponent(sharedUrl)}`;
      console.log(`Share Target: Received URL "${sharedUrl}", redirecting to ${readerUrl}`);
      // Redirect to the article reader page
      router.replace(readerUrl);
    } else {
      // If no URL is found, redirect to the home page
      console.warn('Share Target: No URL parameter found, redirecting to home.');
      router.replace('/');
    }
  }, [router, searchParams]); // Dependencies ensure this runs when params change

  // Render a simple loading state while redirecting
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      Processing shared link...
    </div>
  );
} 