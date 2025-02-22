import React, { useState } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

const VoiceInput = ({ onQuery }) => {
  const [recording, setRecording] = useState(false);
  const { transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const handleRecord = () => {
    resetTranscript();
    setRecording(true);
    startListening();
  };

  const handleStop = () => {
    stopListening();
    setRecording(false);
    if (transcript.trim() !== '') {
      onQuery(transcript);
    }
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <button 
        onClick={recording ? handleStop : handleRecord}
        className={`${recording ? 'bg-red-500' : 'bg-blue-500'} text-white px-4 py-2 rounded hover:opacity-90`}
      >
        {recording ? 'Stop Recording' : 'Record Question'}
      </button>
      <p className="mt-2 text-gray-700">{transcript}</p>
    </div>
  );
};

export default VoiceInput;
