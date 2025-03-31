'use client';

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase'; // Import your existing Supabase client

type FeedbackType = 'Bug' | 'Feature request' | 'General feedback' | 'Translation Issue';

interface FeedbackFormProps {
  onClose: () => void; // Function to close the modal after submission
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onClose }) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('General feedback');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    // Basic validation
    if (!description.trim()) {
      setError('Please enter a description.');
      setIsSubmitting(false);
      return;
    }
    if (description.length > 5000) { // Match DB constraint
      setError('Description cannot exceed 5000 characters.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Get user session to check if logged in
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null; // Will be null for anonymous users
      
      // Get the plain text value without emoji for submission
      const feedbackValue = feedbackType.replace(/^[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, '');

      // Insert feedback into Supabase using the plain text value
      const { error: insertError } = await supabase.from('feedback').insert([
        {
          feedback_type: feedbackValue, // Send plain text
          description,
          user_id: userId,
        },
      ]);

      // Check for Supabase insertion error
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        // Provide a more specific error message if possible
        if (insertError.message.includes('check constraint') && insertError.message.includes('feedback_description_check')) {
          throw new Error('Description cannot be empty or exceed 5000 characters.');
        } else if (insertError.message.includes('violates row-level security policy')) {
          throw new Error('You do not have permission to submit feedback in this way.');
        }
        throw insertError; // Throw the original error for other cases
      }

      // Show success message
      setSuccessMessage('Thank you for your feedback! We appreciate your input.');
      setDescription('');
      // Temporarily reset state without emoji
      setFeedbackType('General feedback');
      
      // Close the modal after a short delay
      setTimeout(onClose, 2000);

    } catch (err: unknown) { // Type err as unknown for better type safety
      // Log the entire error object for detailed debugging
      console.error('Feedback submission error object:', err);
      // Check if it's an Error object before accessing message
      let errorMessage = 'An unexpected error occurred. Please check the console for details.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="feedbackType" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Feedback Type
        </label>
        <select
          id="feedbackType"
          name="feedbackType"
          value={feedbackType}
          onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
          disabled={isSubmitting}
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
        >
          <option>🐞 Bug</option>
          <option>💡 Feature request</option>
          <option>🌐 Translation Issue</option>
          <option>💬 General feedback</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          required
          maxLength={5000}
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
          placeholder="Please describe the bug, feature request, or your general feedback..."
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description.length}/5000 characters</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !!successMessage}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </div>
    </form>
  );
};

export default FeedbackForm; 