import React, { useState } from 'react';

const FileUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState('audio');
  const [uploadResponse, setUploadResponse] = useState('');

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleTypeChange = (e) => {
    setFileType(e.target.value);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('file_type', fileType);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setUploadResponse(data.message || 'Upload failed');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResponse('Upload failed');
    }
  };

  return (
    <div>
      <h2>Upload Audiobook / Text</h2>
      <input type="file" onChange={handleFileChange} />
      <select value={fileType} onChange={handleTypeChange}>
        <option value="audio">Audio</option>
        <option value="text">Text</option>
      </select>
      <button onClick={handleUpload}>Upload</button>
      <p>{uploadResponse}</p>
    </div>
  );
};

export default FileUpload;
