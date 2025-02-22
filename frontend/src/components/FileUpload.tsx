import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Music } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
}

export const FileUpload = ({ onFileAccepted }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    onFileAccepted(file);
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'audio/aac': ['.aac'],
      'audio/x-m4a': ['.m4a']
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 transition-colors duration-200',
        'glass-panel cursor-pointer hover:border-primary/50',
        isDragActive && 'border-primary bg-primary/5'
      )}
    >
      <input {...getInputProps()} />
      <Music className="w-12 h-12 mb-4 text-primary/50" />
      <p className="text-lg font-medium mb-2">Drop your audio file here</p>
      <p className="text-sm text-muted-foreground mb-4">Supports MP3, WAV, OGG, AAC, M4A</p>
      <Button variant="outline">Select Audio</Button>
    </div>
  );
};