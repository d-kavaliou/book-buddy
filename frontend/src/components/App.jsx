import React, { useState } from 'react';
import AudioPlayer from './AudioPlayer';
import VoiceInput from './VoiceInput';
import VoiceOutput from './VoiceOutput';
import FileUpload from './FileUpload';
import FileList from './FileList';
import '../styles/App.css';

const App = () => {
  const [response, setResponse] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const handleUserQuery = async (query) => {
    console.log('User Query:', query);
    setResponse('This is a sample response from the system.');
    setAudioUrl('/api/placeholder/320/40');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Audiobook Voice Interaction App</h1>
      <AudioPlayer />
      <VoiceInput onQuery={handleUserQuery} />
      <VoiceOutput text={response} audioUrl={audioUrl} />
      <FileUpload />
      <FileList />
    </div>
  );
};

export default App;