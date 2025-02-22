import React, { useRef, useState } from 'react';

const AudioPlayer = () => {
  const [progress, setProgress] = useState(0);
  
  const handlePlay = () => {
    console.log('Playing audio...');
  };
  
  const handlePause = () => {
    console.log('Pausing audio...');
  };
  
  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <audio controls className="w-full mb-2">
        <source src="/api/placeholder/320/40" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      <div className="h-2 bg-gray-200 rounded">
        <div 
          className="h-full bg-blue-500 rounded" 
          style={{ width: `${progress}%` }} 
        />
      </div>
      <div className="mt-2 flex gap-2">
        <button 
          onClick={handlePlay}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Play
        </button>
        <button 
          onClick={handlePause}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Pause
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;
