import { useConversation } from '@11labs/react';
import { useCallback, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MessageSquare, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { log } from 'console';

interface ContextData {
  context: string;
  start_position: number;
  end_position: number;
}

interface ConversationProps {
  currentTime: number;
  audioFileName?: string;
}

export function Conversation({ currentTime, audioFileName }: ConversationProps) {
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);
  const [currentContext, setCurrentContext] = useState<ContextData | null>(null);
  
  const conversation = useConversation({
    onConnect: () => {
      toast({ title: "Connected to agent", description: "You can start speaking now" });
      setIsStarting(false);
    },
    onDisconnect: () => {
      toast({ title: "Disconnected from agent" });
      setCurrentContext(null);
    },
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setIsStarting(false);
    },
  });

  const fetchContext = async (): Promise<ContextData | null> => {
    try {
      const response = await fetch('http://localhost:8000/api/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: currentTime,
          fileName: audioFileName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch context');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching context:', error);
      toast({
        title: "Error",
        description: "Failed to fetch context for current timestamp",
        variant: "destructive"
      });
      return null;
    }
  };

  const startConversation = useCallback(async () => {
    try {
      setIsStarting(true);
      
      // 1. Get microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 2. Fetch context for current timestamp
      const contextData = await fetchContext();
      if (!contextData) {
        setIsStarting(false);
        return;
      }

      console.log('Context:', contextData);
      
      setCurrentContext(contextData);
      
      // 3. Start conversation with context
      const prompt = `You are an AI assistant helping with audio content.
        Current timestamp: ${currentTime} seconds.
        File: ${audioFileName}
        
        Current context from the transcript:
        "${contextData.context}"
        
        Please use this context to provide relevant answers to the user's questions.`;

      await conversation.startSession({
        agentId: 'YOUR_AGENT_ID',
        overrides: {
          agent: {
            prompt: { prompt }
          }
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation. Please make sure you have a working microphone.",
        variant: "destructive"
      });
      setIsStarting(false);
      setCurrentContext(null);
    }
  }, [conversation, currentTime, audioFileName, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setCurrentContext(null);
  }, [conversation]);

  return (
    <Card className="p-6 glass-panel">
      <div className="flex flex-col gap-6">
        <div className="flex justify-center gap-4">
          <Button
            onClick={startConversation}
            disabled={conversation.status === 'connected' || isStarting}
            variant="default"
            className="w-40"
          >
            <Mic className="mr-2 h-4 w-4" />
            {isStarting ? 'Starting...' : 'Start'}
          </Button>
          <Button
            onClick={stopConversation}
            disabled={conversation.status !== 'connected'}
            variant="destructive"
            className="w-40"
          >
            <MicOff className="mr-2 h-4 w-4" />
            Stop
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              conversation.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span>Status: {conversation.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</span>
          </div>
          
          {currentContext && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Current Context:</p>
              <p className="text-sm text-muted-foreground">{currentContext.context}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}