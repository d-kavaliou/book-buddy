
import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileUpload } from '@/components/FileUpload';
import { AudioReader } from '@/components/Reader';
import Conversation from '@/components/Conversation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import logo3 from '@/assets/logo3.svg';

interface AudioProcessingError {
  title: string;
  description: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export default function Index() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<AudioProcessingError | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const savedPositionRef = useRef<number>(0);

  const handleFileAccepted = async (file: File) => {
    try {
      setError(null);
      setAudioFile(file);
      setIsProcessing(true);
    } catch (err) {
      setError({
        title: "Upload Error",
        description: "Failed to process the audio file"
      });
      setIsProcessing(false);
    }
  };

  const handleProcessedAudio = async (filename: string | null) => {
    if (!filename) {
      setError({
        title: "Processing Error",
        description: "No filename received from server"
      });
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/uploads/${filename}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'audio/mpeg' });
      
      setAudioFile(file);
      setIsProcessing(false);
      setError(null);
    } catch (err) {
      setError({
        title: "Processing Error",
        description: "Failed to load processed audio file"
      });
      setIsProcessing(false);
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  const handleStartConversation = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStopConversation = useCallback(() => {
    // Resume playing when conversation stops
    setIsPlaying(true);
  }, []);

  const handleBeforeChunkPlay = useCallback((time: number) => {
    savedPositionRef.current = time;
  }, []);

  const handleAfterChunkPlay = useCallback(() => {
    setCurrentTime(savedPositionRef.current);
  }, []);

  return (
    <div className="container mx-auto py-8 min-h-screen">
      <div className="flex justify-center items-center gap-3 mb-8">
        <img src={logo3} alt="Book Buddy Logo" className="h-10 w-10" />
        <h1 className="text-4xl font-bold">Book Buddy</h1>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {error.title}: {error.description}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <FileUpload 
            onFileAccepted={handleFileAccepted}
            setAudioFile={handleProcessedAudio}
          />
          
          {audioFile && !isProcessing && (
            <div className="mt-6">
              <AudioReader 
                audioFile={audioFile}
                onTimeUpdate={handleTimeUpdate}
                onPlayStateChange={handlePlayStateChange}
                isPlaying={isPlaying}
                currentTime={currentTime}
                onSetTime={setCurrentTime}
              />
            </div>
          )}

          {isProcessing && (
            <div className="mt-6 text-center">
              <div className="animate-pulse">
                <p className="text-lg">Processing audio file...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          )}
        </Card>

        <div className="lg:col-span-1 space-y-4">
          <Conversation 
            currentTime={currentTime}
            audioFileName={audioFile?.name}
            audioUrl={audioFile ? URL.createObjectURL(audioFile) : undefined}
            onStartConversation={handleStartConversation}
            onStopConversation={handleStopConversation}
            onBeforeChunkPlay={handleBeforeChunkPlay}
            onAfterChunkPlay={handleAfterChunkPlay}
          />
          <Link 
            to="/notes" 
            className="w-full block text-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            View Notes
          </Link>
        </div>
      </div>
    </div>
  );
}