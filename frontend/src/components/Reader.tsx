
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

interface ReaderProps {
  text: string;
  onAskQuestion: (context: string) => void;
}

export const Reader = ({ text, onAskQuestion }: ReaderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [words, setWords] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (text) {
      setWords(text.split(/\s+/));
    }
    
    // Initialize speech synthesis
    speechRef.current = window.speechSynthesis;
    return () => {
      if (speechRef.current) {
        speechRef.current.cancel();
      }
    };
  }, [text]);

  useEffect(() => {
    if (isPlaying) {
      startReading();
    } else {
      stopReading();
    }
  }, [isPlaying, currentWordIndex]);

  const startReading = () => {
    if (!speechRef.current || words.length === 0) return;

    speechRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(words[currentWordIndex]);
    utteranceRef.current = utterance;

    utterance.onend = () => {
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    speechRef.current.speak(utterance);
  };

  const stopReading = () => {
    if (speechRef.current) {
      speechRef.current.cancel();
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const replayWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    }
  };

  const getCurrentContext = () => {
    const contextStart = Math.max(0, currentWordIndex - 50);
    const contextEnd = Math.min(words.length, currentWordIndex + 50);
    return words.slice(contextStart, contextEnd).join(' ');
  };

  useEffect(() => {
    if (scrollRef.current && words.length > 0) {
      const wordElements = scrollRef.current.getElementsByTagName('span');
      if (wordElements[currentWordIndex]) {
        wordElements[currentWordIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [currentWordIndex]);

  return (
    <div className="flex flex-col h-full gap-6">
      <Card className="p-4 glass-panel">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayback}
              className="h-10 w-10"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={replayWord}
              className="h-10 w-10"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
          </div>
          <Slider
            className="w-full max-w-md"
            value={[currentWordIndex]}
            max={words.length - 1}
            step={1}
            onValueChange={(value) => {
              setCurrentWordIndex(value[0]);
              if (isPlaying) {
                startReading();
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => onAskQuestion(getCurrentContext())}
            className="h-10 w-10"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <ScrollArea className="flex-1 rounded-lg glass-panel p-6">
        <div ref={scrollRef} className="reader-content">
          {words.map((word, index) => (
            <span
              key={index}
              className={cn(
                'inline-block cursor-pointer px-0.5 rounded transition-colors duration-200',
                currentWordIndex === index && 'highlighted-word'
              )}
              onClick={() => {
                setCurrentWordIndex(index);
                if (isPlaying) {
                  startReading();
                }
              }}
            >
              {word}{' '}
            </span>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
