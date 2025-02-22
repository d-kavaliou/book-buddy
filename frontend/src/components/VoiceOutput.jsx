import React, { useState } from 'react';

const VoiceOutput = ({ text, audioUrl }) => {
    return (
      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <p className="mb-2">{text}</p>
        {audioUrl && (
          <audio controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        )}
      </div>
    );
  };

  export default VoiceOutput;