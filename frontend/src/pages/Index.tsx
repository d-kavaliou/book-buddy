import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { AudioReader } from '@/components/Reader';
import { Conversation } from '@/components/Conversation';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileAccepted = (file: File) => {
    setAudioFile(file);
    setIsProcessing(true);
  };

  const handleProcessedAudio = (filename: string | null) => {
    if (filename) {
      fetch(`http://localhost:8000/uploads/${filename}`)
        .then(response => response.blob())
        .then(blob => {
          const file = new File([blob], filename, { type: 'audio/mpeg' });
          setAudioFile(file);
          setIsProcessing(false);
          
          toast({
            title: "Audio Ready",
            description: "Your audio file has been processed and is ready for playback",
          });
        })
        .catch(error => {
          console.error('Error fetching processed audio:', error);
          setIsProcessing(false);
          toast({
            title: "Error",
            description: "Failed to load processed audio",
            variant: "destructive"
          });
        });
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  return (
    <div className="container mx-auto py-8 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">AudioReader</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
        </div>

        <div className="lg:col-span-1">
          <Conversation 
            currentTime={currentTime}
            audioFileName={audioFile?.name}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;