
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileAccepted: (text: string) => void;
}

export const FileUpload = ({ onFileAccepted }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onFileAccepted(text);
    };
    
    reader.readAsText(file);
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
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
      <Upload className="w-12 h-12 mb-4 text-primary/50" />
      <p className="text-lg font-medium mb-2">Drop your book file here</p>
      <p className="text-sm text-muted-foreground mb-4">or click to select</p>
      <Button variant="outline">Select File</Button>
    </div>
  );
};
