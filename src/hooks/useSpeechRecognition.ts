import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/services/i18n';

// Define types for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const navigate = useNavigate();
  const { language } = useLanguage();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        
        // Map our language codes to speech recognition locales
        const langMap: Record<string, string> = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'bn': 'bn-IN',
            'mr': 'mr-IN',
            'te': 'te-IN',
            'ta': 'ta-IN',
            'gu': 'gu-IN',
            'pa': 'pa-IN'
        };
        recog.lang = langMap[language] || 'hi-IN';

        recog.onstart = () => {
          setIsListening(true);
        };

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.toLowerCase();
          console.log('[Voice Command]:', transcript);
          handleVoiceCommand(transcript);
        };

        recog.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          if (event.error !== 'aborted') {
              toast.error('Voice recognition failed. Please try again.');
          }
        };

        recog.onend = () => {
          setIsListening(false);
        };

        setRecognition(recog);
      } else {
        console.warn('Speech Recognition API not supported in this browser.');
      }
    }
  }, [navigate, language]);

  const handleVoiceCommand = (command: string) => {
    // Simple keyword matching for navigation across different languages
    if (command.includes('स्लॉट') || command.includes('बुक') || command.includes('book') || command.includes('slot')) {
      toast.success('Navigating to Slot Booking');
      navigate('/farmer/book');
    } else if (command.includes('डैशबोर्ड') || command.includes('dashboard') || command.includes('home')) {
      toast.success('Navigating to Dashboard');
      navigate('/farmer/dashboard');
    } else if (command.includes('कतार') || command.includes('लाइन') || command.includes('queue') || command.includes('live')) {
      toast.success('Navigating to Live Queue');
      navigate('/farmer/queue');
    } else if (command.includes('मंडी') || command.includes('mandi') || command.includes('centre')) {
      toast.success('Navigating to Procurement Centres');
      navigate('/farmer/centres');
    } else {
      toast.info(`Command not recognized: "${command}"`);
    }
  };

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      try {
        recognition.start();
        toast('Listening...', { icon: '🎤' });
      } catch (e) {
        console.error(e);
      }
    } else if (!recognition) {
        toast.error('Voice commands are not supported in your browser.');
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition, isListening]);

  return { isListening, startListening, stopListening, isSupported: !!recognition };
}
