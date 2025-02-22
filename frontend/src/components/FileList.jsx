import React, { useState, useEffect } from 'react';

const FileList = () => {
  const [files] = useState([
    'sample-audio-1.mp3',
    'sample-text-1.txt',
    'sample-audio-2.mp3'
  ]);

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Uploaded Files</h2>
      <ul className="space-y-2">
        {files.map((file, index) => (
          <li key={index} className="hover:bg-gray-200 p-2 rounded">
            <a href={`#${file}`} className="text-blue-500 hover:underline">
              {file}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileList;
