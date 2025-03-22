import { useState, useEffect, useRef } from 'react';

interface UseTTSOptions {
  text: string;
  autoPlay?: boolean;
}

interface UseTTSReturn {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  progress: number; // 0 to 1
  duration: number; // in seconds
  currentTime: number; // in seconds
  seekTo: (position: number) => void; // position from 0 to 1
  seekForward: (seconds?: number) => void; // skip forward by seconds
  seekBackward: (seconds?: number) => void; // skip backward by seconds
}

// Function to truncate text at a sentence boundary
function truncateAtSentenceBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const searchText = text.substring(0, maxLength);
  
  // Try to find the last sentence ending
  const endPunctuation = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
  
  let lastIndex = -1;
  for (const punctuation of endPunctuation) {
    const index = searchText.lastIndexOf(punctuation);
    if (index > lastIndex) {
      lastIndex = index + punctuation.length;
    }
  }
  
  // If no sentence ending found, try paragraph breaks
  if (lastIndex === -1) {
    const paraBreak = searchText.lastIndexOf('\n\n');
    if (paraBreak !== -1) {
      return searchText.substring(0, paraBreak) + '...';
    }
    
    // Try a line break
    const lineBreak = searchText.lastIndexOf('\n');
    if (lineBreak !== -1) {
      return searchText.substring(0, lineBreak) + '...';
    }
    
    // Try a word boundary
    const lastSpace = searchText.lastIndexOf(' ');
    if (lastSpace !== -1) {
      return searchText.substring(0, lastSpace) + '...';
    }
  }
  
  if (lastIndex !== -1) {
    return searchText.substring(0, lastIndex) + '...';
  }
  
  // Last resort
  return searchText + '...';
}

export function useTTS({ text, autoPlay = false }: UseTTSOptions): UseTTSReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Cleanup function
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Function to fetch and play audio
  const fetchAudio = async () => {
    if (!text.trim()) {
      setError("No text to convert to speech");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Enhanced text cleaning to better prepare for TTS
      const cleanText = text
        .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
        .replace(/&nbsp;/g, ' ')            // Replace HTML entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        
        // Aggressive cleanup of BBC references and metadata
        .replace(/\bBBC\b/g, '')            // Remove BBC acronym
        .replace(/\bBBC\s+News\b/gi, '')    // Remove BBC News
        .replace(/\bBBC\s+\w+\b/gi, '')     // Remove BBC [Something]
        
        // Remove author and role patterns
        .replace(/by\s+[A-Z][a-z]+\s+[A-Z][a-z]+/gi, '')  // Remove "by First Last"
        .replace(/[A-Z][a-z]+\s+[A-Z][a-z]+,?\s+(?:Presenter|Reporter|Correspondent|Editor)/gi, '')
        .replace(/(?:Presenter|Reporter|Correspondent|Editor)[,\s]*/gi, '')
        .replace(/with\s+[A-Z][a-z]+\s+[A-Z][a-z]+/gi, '')
        
        // Remove media references
        .replace(/Image(?:\s+source|\s+caption)?:.*?(?:\n|$)/gi, '')
        .replace(/Photo(?:\s+by|\s+caption)?:.*?(?:\n|$)/gi, '')
        .replace(/Picture(?:\s+by|\s+caption)?:.*?(?:\n|$)/gi, '')
        .replace(/Source:.*?(?:\n|$)/gi, '')
        
        // Remove time references
        .replace(/\d+\s+(?:hour|minute|second)s?\s+ago/gi, '')
        .replace(/Published\s+\d+\s+\w+\s+ago/gi, '')
        .replace(/Last\s+updated.*?ago/gi, '')
        .replace(/\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi, '')
        
        // Remove social media handles and related content
        .replace(/@[a-zA-Z0-9_]+/g, '')
        .replace(/Follow us on.*?(?:\n|$)/gi, '')
        .replace(/Follow our.*?on.*?(?:\n|$)/gi, '')
        
        // Normalize spaces and remove special characters
        .replace(/•/g, '')
        .replace(/\s+/g, ' ')              // Normalize all whitespace
        .replace(/\n+/g, '\n')             // Normalize line breaks
        .trim();
      
      const textLength = cleanText.length;
      console.log('Cleaned text for TTS, length:', textLength);
      
      // Add client-side length validation to avoid server errors
      let processedText = cleanText;
      if (textLength > 25000) {
        console.log('Text too long for TTS API, truncating to 25000 chars');
        // Find a good breakpoint to truncate
        processedText = truncateAtSentenceBoundary(cleanText, 25000);
        console.log(`Truncated from ${textLength} to ${processedText.length} chars`);
      }
      
      // Call the API endpoint to get the audio
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: processedText }),
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        
        try {
          if (response.headers.get('content-type')?.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
            
            // Handle specific error cases
            if (response.status === 413 || errorData.error?.includes('length')) {
              errorMessage = 'Text is too long for text-to-speech conversion. Try a shorter article.';
            } else if (response.status === 429) {
              errorMessage = 'Too many requests. Please try again in a moment.';
            } else if (response.status >= 500) {
              errorMessage = 'Server error. The text-to-speech service is temporarily unavailable.';
            }
            
            console.error('Detailed error:', errorData);
          }
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
        }
        
        throw new Error(errorMessage);
      }
      
      // Get the audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Set up audio context for progress tracking
      const audioContextClass = window.AudioContext || 
                           (window as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      
      if (!audioContextClass) {
        throw new Error('AudioContext not supported in this browser');
      }
      
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      
      audioContextRef.current = new audioContextClass();
      
      if (!audioContextRef.current) {
        throw new Error('Failed to create AudioContext');
      }
      
      const source = audioContextRef.current.createMediaElementSource(audio);
      source.connect(audioContextRef.current.destination);
      
      // Add event listeners
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });
      
      // Track duration once metadata is loaded
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      // Track progress
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress(audio.currentTime / audio.duration);
          setCurrentTime(audio.currentTime);
        }
      });
      
      // Auto play if enabled
      if (autoPlay) {
        audio.play().catch(e => {
          console.error('Auto-play failed:', e);
          setError('Auto-play failed. Please interact with the page first.');
        });
      }
      
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError((err as Error).message || 'Failed to generate or play speech');
      console.error('TTS error:', err);
    }
  };
  
  // Play function
  const play = async () => {
    if (isPlaying) return;
    
    if (!audioRef.current) {
      await fetchAudio();
    }
    
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
      });
    }
  };
  
  // Pause function
  const pause = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  // Stop function (pause and reset position)
  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }
  };
  
  // Seek to a specific position (0-1)
  const seekTo = (position: number) => {
    if (audioRef.current && audioRef.current.duration) {
      const targetTime = audioRef.current.duration * Math.max(0, Math.min(1, position));
      audioRef.current.currentTime = targetTime;
      setProgress(position);
      setCurrentTime(targetTime);
    }
  };
  
  // Skip forward by seconds
  const seekForward = (seconds = 5) => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds);
      audioRef.current.currentTime = newTime;
      if (audioRef.current.duration) {
        setProgress(newTime / audioRef.current.duration);
      }
      setCurrentTime(newTime);
    }
  };
  
  // Skip backward by seconds
  const seekBackward = (seconds = 5) => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - seconds);
      audioRef.current.currentTime = newTime;
      if (audioRef.current.duration) {
        setProgress(newTime / audioRef.current.duration);
      }
      setCurrentTime(newTime);
    }
  };
  
  return {
    isLoading,
    isPlaying,
    error,
    play,
    pause,
    stop,
    progress,
    duration,
    currentTime,
    seekTo,
    seekForward,
    seekBackward
  };
} 