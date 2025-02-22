import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface AudioReaderProps {
  audioFile: File;
  onContextUpdate?: (context: string) => void;
}

export const AudioReader = ({ audioFile, onContextUpdate }: AudioReaderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);

  useEffect(() => {
    audioUrl.current = URL.createObjectURL(audioFile);
    
    if (audioRef.current) {
      audioRef.current.src = audioUrl.current;
    }

    return () => {
      if (audioUrl.current) {
        URL.revokeObjectURL(audioUrl.current);
      }
    };
  }, [audioFile]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      if (onContextUpdate) {
        const context = `Currently at ${formatTime(audioRef.current.currentTime)} of ${formatTime(audioRef.current.duration)} in audio file: ${audioFile.name}`;
        onContextUpdate(context);
      }
    }
  };

  const handleSliderChange = (value: number[]) => {
    const time = value[0];
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAskQuestion = () => {
    if (onContextUpdate && audioRef.current) {
      const context = `At timestamp ${formatTime(currentTime)} in audio file: ${audioFile.name}`;
      onContextUpdate(context);
    }
  };

  // Format file name for display by removing extension
  const displayName = audioFile.name.replace(/\.[^/.]+$/, '');

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="truncate text-lg font-semibold">
          {displayName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
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
                onClick={skipBackward}
                className="h-10 w-10"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={skipForward}
                className="h-10 w-10"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              {onContextUpdate && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAskQuestion}
                  className="h-10 w-10"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <Slider
            className="w-full"
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSliderChange}
          />

          <audio
            ref={audioRef}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      </CardContent>
    </Card>
  );
};