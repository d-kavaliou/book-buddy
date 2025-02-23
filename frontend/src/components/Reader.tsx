import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface AudioReaderProps {
  audioFile: File;
  onContextUpdate?: (context: string) => void;
  onTimeUpdate?: (time: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  isPlaying: boolean;
  currentTime: number;
  onSetTime: (time: number) => void;
  disabled?: boolean; // New prop
}

export const AudioReader = ({
  audioFile,
  onContextUpdate,
  onTimeUpdate,
  onPlayStateChange,
  isPlaying,
  currentTime,
  onSetTime,
  disabled = false
}: AudioReaderProps) => {
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const skipUpdate = useRef(false);

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
    if (audioRef.current && !skipUpdate.current) {
      audioRef.current.currentTime = currentTime;
    }
    skipUpdate.current = false;
  }, [currentTime]);

  useEffect(() => {
    if (audioRef.current) {
      if (disabled) {
        // Ensure audio is paused when disabled
        audioRef.current.pause();
        if (onPlayStateChange) {
          onPlayStateChange(false);
        }
      } else if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, disabled, onPlayStateChange]);

  const getButtonClass = () => {
    return `h-10 w-10 ${disabled ? 'cursor-not-allowed opacity-50' : ''}`;
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !disabled) {
      const time = audioRef.current.currentTime;
      skipUpdate.current = true;
      if (onTimeUpdate) {
        onTimeUpdate(time);
      }
      if (onContextUpdate) {
        const context = `Currently at ${formatTime(time)} of ${formatTime(audioRef.current.duration)}`;
        onContextUpdate(context);
      }
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (!disabled) {
      const time = value[0];
      onSetTime(time);
    }
  };

  const skipForward = () => {
    if (audioRef.current && !disabled) {
      onSetTime(Math.min(audioRef.current.currentTime + 10, duration));
    }
  };

  const skipBackward = () => {
    if (audioRef.current && !disabled) {
      onSetTime(Math.max(audioRef.current.currentTime - 10, 0));
    }
  };

  const handlePlayPause = () => {
    if (!disabled && onPlayStateChange) {
      onPlayStateChange(!isPlaying);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`glass-panel ${disabled ? 'opacity-50' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="truncate text-lg font-semibold">
          {audioFile.name.replace(/\.[^/.]+$/, '')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePlayPause}
                className={getButtonClass()}
                disabled={disabled}
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
                className={getButtonClass()}
                disabled={disabled}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={skipForward}
                className={getButtonClass()}
                disabled={disabled}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>

          <Slider
            className={`w-full ${disabled ? 'cursor-not-allowed' : ''}`}
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSliderChange}
            disabled={disabled}
          />

          <audio
            ref={audioRef}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => !disabled && onPlayStateChange?.(false)}
          />
        </div>
      </CardContent>
    </Card>
  );
};