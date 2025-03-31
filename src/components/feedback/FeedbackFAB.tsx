'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface FeedbackFABProps {
  onClick: () => void;
  isCollapsed: boolean;
}

const FeedbackFAB: React.FC<FeedbackFABProps> = ({ onClick, isCollapsed }) => {
  return (
    <motion.button
      layout
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-3 
                 bg-blue-500 hover:bg-blue-600 text-white shadow-lg
                 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 
                 dark:focus:ring-offset-gray-900 transition-colors duration-200
                 font-semibold hover:shadow-xl 
                 ${isCollapsed ? 'rounded-full p-4' : 'rounded-lg px-6 py-3'}`}
      aria-label="Open feedback form"
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {!isCollapsed && <span className="px-1">Give Feedback</span>}
      <span role="img" aria-hidden="true" className="text-lg">🙏</span>
    </motion.button>
  );
};

export default FeedbackFAB; 