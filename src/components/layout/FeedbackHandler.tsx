'use client';

import React, { useState, useEffect } from 'react';
import FeedbackFAB from '@/components/feedback/FeedbackFAB';
import FeedbackModal from '@/components/feedback/FeedbackModal';

const SCROLL_THRESHOLD = 50; // Pixels to scroll down before collapsing

const FeedbackHandler: React.FC = () => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isFabCollapsed, setIsFabCollapsed] = useState(false);

  const openFeedbackModal = () => setIsFeedbackModalOpen(true);
  const closeFeedbackModal = () => setIsFeedbackModalOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Collapse if scrolled down more than threshold, expand if scrolled up past it
      if (currentScrollY > SCROLL_THRESHOLD) {
        setIsFabCollapsed(true);
      } else {
        setIsFabCollapsed(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check in case the page loads already scrolled
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <>
      {/* Pass the collapsed state to the FAB */}
      <FeedbackFAB onClick={openFeedbackModal} isCollapsed={isFabCollapsed} />
      <FeedbackModal isOpen={isFeedbackModalOpen} onClose={closeFeedbackModal} />
    </>
  );
};

export default FeedbackHandler; 