'use client';

import React from 'react';

interface FeedbackFABProps {
  onClick: () => void;
}

const FeedbackFAB: React.FC<FeedbackFABProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-6 py-3 
                bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg
                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 
                dark:focus:ring-offset-gray-900 transition-colors duration-200
                font-semibold shadow-md hover:shadow-xl"
      aria-label="Open feedback form"
    >
      <span className="px-1">Give Feedback</span>
      <span role="img" aria-hidden="true" className="text-lg">🙏</span>
    </button>
  );
};

export default FeedbackFAB; 