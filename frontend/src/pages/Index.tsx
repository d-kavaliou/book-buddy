import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { AudioReader } from '@/components/Reader';
import Conversation from '@/components/Conversation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

interface AudioProcessingError {
  title: string;
  description: string;
}

export default function Index() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<AudioProcessingError | null>(null);

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
      const response = await fetch(`http://localhost:8000/uploads/${filename}`);
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

  return (
    <div className="container mx-auto py-8 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">Book Buddy</h1>
      
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
            apiEndpoint="http://localhost:8000"
          />
          
          {audioFile && !isProcessing && (
            <div className="mt-6">
              <AudioReader 
                audioFile={audioFile}
                onTimeUpdate={handleTimeUpdate}
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

        <div className="lg:col-span-1">
          <Conversation 
            currentTime={currentTime}
            audioFileName={audioFile?.name}
          />
        </div>
      </div>
    </div>
  );
}