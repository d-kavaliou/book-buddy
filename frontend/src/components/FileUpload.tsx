import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Music, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useToast } from './ui/use-toast';
import { Progress } from './ui/progress';

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
  setAudioFile: (file: string | null) => void;
  apiEndpoint?: string;
}

interface UploadResponse {
  message: string;
  filename: string;
  file_type: string;
}

export const FileUpload = ({ 
  onFileAccepted, 
  setAudioFile,
  apiEndpoint
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const checkProcessingStatus = async (filename: string) => {
    try {
      const response = await fetch(`${apiEndpoint}/status/${filename}`);
      const data = await response.json();
      
      if (data.status === 'completed') {
        setIsProcessing(false);
        setAudioFile(filename);
        toast({
          title: "Success",
          description: "Audio processing completed",
        });
      } else if (data.status === 'failed') {
        setIsProcessing(false);
        toast({
          title: "Error",
          description: "Audio processing failed",
          variant: "destructive",
        });
      } else {
        // If still processing, check again in 2 seconds
        setTimeout(() => checkProcessingStatus(filename), 2000);
      }
    } catch (error) {
      console.error('Status check error:', error);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: "Failed to check processing status",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_type', file.type);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      const response = await new Promise<UploadResponse>((resolve, reject) => {
        xhr.open('POST', `${apiEndpoint}/upload`, true);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });

      setIsUploading(false);
      setIsProcessing(true);
      
      toast({
        title: "Upload Complete",
        description: "Audio processing started",
      });

      onFileAccepted(file);
      
      // Start checking processing status
      checkProcessingStatus(response.filename);

    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    handleUpload(file);
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
    disabled: isUploading || isProcessing,
  });

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 transition-colors duration-200',
          'glass-panel cursor-pointer hover:border-primary/50',
          isDragActive && 'border-primary bg-primary/5',
          (isUploading || isProcessing) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <>
            <Loader2 className="w-12 h-12 mb-4 text-primary/50 animate-spin" />
            <p className="text-lg font-medium mb-2">Uploading...</p>
            <div className="w-full max-w-xs">
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="w-12 h-12 mb-4 text-primary/50 animate-spin" />
            <p className="text-lg font-medium mb-2">Processing audio...</p>
          </>
        ) : (
          <>
            <Music className="w-12 h-12 mb-4 text-primary/50" />
            <p className="text-lg font-medium mb-2">Drop your audio file here</p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports MP3, WAV, OGG, AAC, M4A
            </p>
            <Button variant="outline" disabled={isUploading || isProcessing}>
              Select Audio
            </Button>
          </>
        )}
      </div>
    </div>
  );
};