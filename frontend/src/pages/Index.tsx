
import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Reader } from '@/components/Reader';
import { Conversation } from '@/components/Conversation';

const Index = () => {
  const [bookText, setBookText] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');

  const handleFileAccepted = (text: string) => {
    setBookText(text);
  };

  const handleAskQuestion = (context: string) => {
    setSelectedContext(context);
  };

  return (
    <div className="container mx-auto py-8 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">AudioReader</h1>
      
      {!bookText ? (
        <FileUpload onFileAccepted={handleFileAccepted} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          <div className="lg:col-span-2">
            <Reader text={bookText} onAskQuestion={handleAskQuestion} />
          </div>
          <div className="lg:col-span-1">
            <Conversation context={selectedContext} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
