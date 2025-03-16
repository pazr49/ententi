'use client';

import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <svg 
                className="h-8 w-8 text-red-500" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M21.9 4.4c-1.8-1.8-4.1-2.7-6.5-2.7-2.5 0-4.8 1-6.5 2.7L8.3 5l-.6.6c-1.8 1.8-2.7 4.1-2.7 6.5 0 2.5 1 4.8 2.7 6.5 1.8 1.8 4.1 2.7 6.5 2.7 2.5 0 4.8-1 6.5-2.7 1.8-1.8 2.7-4.1 2.7-6.5 0-2.5-1-4.8-2.7-6.5l-.8-.7zM17 17c-1.3 1.3-3.1 2-4.9 2-1.8 0-3.6-.7-4.9-2-1.3-1.3-2-3.1-2-4.9 0-1.8.7-3.6 2-4.9l.6-.6.6-.6c1.3-1.3 3.1-2 4.9-2 1.8 0 3.6.7 4.9 2 1.3 1.3 2 3.1 2 4.9 0 1.8-.7 3.6-2 4.9l-.2.2z" />
              </svg>
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">PocketClone</span>
            </Link>
          </div>
          
          <nav className="flex space-x-4">
            <Link 
              href="/" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Home
            </Link>
            <Link 
              href="/saved" 
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Saved
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
} 