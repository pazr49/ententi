'use client';

import React from 'react';
import FeedbackForm from './FeedbackForm';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        // Backdrop div
        <motion.div
          key="backdrop"
          initial={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
          animate={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
          exit={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-45"
          onClick={onClose}
        />
      )}
      
      {isOpen && (
        // Modal div
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.3, x: 20, y: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, x: 20, y: 20 }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 25,
          }}
          className="fixed 
                     sm:bottom-6 sm:right-6 left-auto sm:left-auto sm:max-w-md 
                     bottom-0 right-0 left-0 
                     sm:w-full w-full max-h-[90vh] overflow-y-auto
                     z-50 bg-white dark:bg-gray-800 rounded-lg sm:rounded-lg rounded-b-none
                     shadow-xl border border-indigo-50 dark:border-gray-700 
                     sm:m-4 m-0 origin-bottom-right"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-6 py-4 border-b border-indigo-100 dark:border-gray-700 sticky top-0 z-10">
            <h2 className="text-xl font-bold text-indigo-900 dark:text-white">Share Your Feedback</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Thanks for being an early tester! 💫 Your insights are shaping Ententi&apos;s future - what would you like to see improved?
            </p>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close feedback modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Form content */}
          <div className="p-6">
            <FeedbackForm onClose={onClose} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackModal; 