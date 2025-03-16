'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, profile, signOut, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Add scroll event listener to detect when page is scrolled
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : 'navbar-default'}`}>
      <div className="navbar-container">
        <div className="navbar-content">
          <div className="navbar-logo-container">
            <Link href="/" className="navbar-logo-link">
              <svg 
                className="navbar-logo-icon" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M21.9 4.4c-1.8-1.8-4.1-2.7-6.5-2.7-2.5 0-4.8 1-6.5 2.7L8.3 5l-.6.6c-1.8 1.8-2.7 4.1-2.7 6.5 0 2.5 1 4.8 2.7 6.5 1.8 1.8 4.1 2.7 6.5 2.7 2.5 0 4.8-1 6.5-2.7 1.8-1.8 2.7-4.1 2.7-6.5 0-2.5-1-4.8-2.7-6.5l-.8-.7zM17 17c-1.3 1.3-3.1 2-4.9 2-1.8 0-3.6-.7-4.9-2-1.3-1.3-2-3.1-2-4.9 0-1.8.7-3.6 2-4.9l.6-.6.6-.6c1.3-1.3 3.1-2 4.9-2 1.8 0 3.6.7 4.9 2 1.3 1.3 2 3.1 2 4.9 0 1.8-.7 3.6-2 4.9l-.2.2z" />
              </svg>
              <span className="navbar-logo-text">PocketClone</span>
            </Link>
          </div>
    
          <div className="navbar-menu">
            <div className="navbar-menu-items">
              <Link href="/" className="navbar-link">
                <span>Home</span>
                <span className="navbar-link-underline"></span>
              </Link>
              <Link href="/saved" className="navbar-link">
                <span>Saved Articles</span>
                <span className="navbar-link-underline"></span>
              </Link>
              
              {isLoading ? (
                <div className="text-gray-600 dark:text-gray-300 px-3 py-2 text-base">
                  <div className="loading-pulse">
                    <div className="loading-pulse-bar"></div>
                  </div>
                </div>
              ) : user ? (
                <div className="navbar-dropdown">
                  <button
                    onClick={toggleMenu}
                    className="navbar-dropdown-button"
                  >
                    <span className="mr-1">{profile?.display_name || user.email}</span>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                  
                  {isMenuOpen && (
                    <div className="navbar-dropdown-content">
                      <Link href="/profile" className="navbar-dropdown-item">
                        Profile
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="navbar-dropdown-item w-full text-left"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/auth/login" className="navbar-button">
                    Log In
                  </Link>
                  <Link href="/auth/signup" className="navbar-button-primary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="navbar-mobile-button"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="navbar-mobile-menu">
          <div className="navbar-mobile-menu-container">
            <Link href="/" className="navbar-mobile-link">
              Home
            </Link>
            <Link href="/saved" className="navbar-mobile-link">
              Saved Articles
            </Link>
            
            {isLoading ? (
              <div className="text-gray-600 dark:text-gray-300 px-3 py-2 text-base">
                <div className="loading-pulse">
                  <div className="loading-pulse-bar"></div>
                </div>
              </div>
            ) : user ? (
              <>
                <Link href="/profile" className="navbar-mobile-link">
                  Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="navbar-mobile-link w-full text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="navbar-mobile-link">
                  Log In
                </Link>
                <Link href="/auth/signup" className="navbar-mobile-link mt-1">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 