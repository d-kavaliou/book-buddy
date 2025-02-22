import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { AudioReader } from '@/components/Reader';
import { Conversation } from '@/components/Conversation';

const Index = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [currentContext, setCurrentContext] = useState<string>('');

  // This could be enhanced to get context from audio transcription
  const handleContextUpdate = (context: string) => {
    setCurrentContext(context);
  };

  return (
    <div className="container mx-auto py-8 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">AudioReader</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FileUpload onFileAccepted={setAudioFile} />
          
          {audioFile && (
            <div className="mt-6">
              <AudioReader 
                audioFile={audioFile}
                onContextUpdate={handleContextUpdate}  // Optional: implement if you want to get context from audio
              />
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <Conversation context={currentContext} />
        </div>
      </div>
    </div>
  );
};

export default Index;