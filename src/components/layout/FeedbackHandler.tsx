'use client';

import React, { useState } from 'react';
import FeedbackFAB from '@/components/feedback/FeedbackFAB';
import FeedbackModal from '@/components/feedback/FeedbackModal';

const FeedbackHandler: React.FC = () => {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const openFeedbackModal = () => setIsFeedbackModalOpen(true);
  const closeFeedbackModal = () => setIsFeedbackModalOpen(false);

  return (
    <>
      <FeedbackFAB onClick={openFeedbackModal} />
      <FeedbackModal isOpen={isFeedbackModalOpen} onClose={closeFeedbackModal} />
    </>
  );
};

export default FeedbackHandler; 