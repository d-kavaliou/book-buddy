
'use client';

import { useConversation } from '@11labs/react';
import { useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MessageSquare, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConversationProps {
  context?: string;
}

export function Conversation({ context }: ConversationProps) {
  const { toast } = useToast();
  const conversation = useConversation({
    onConnect: () => toast({ title: "Connected to agent", description: "You can start speaking now" }),
    onDisconnect: () => toast({ title: "Disconnected from agent" }),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => toast({ 
      title: "Error", 
      description: error.message, 
      variant: "destructive" 
    }),
  });

  const startConversation = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: 'YOUR_AGENT_ID', // Replace with your agent ID
        overrides: {
          agent: {
            prompt: {
              prompt: `You are an AI assistant helping with a book. Here's the current context from the book: ${context || 'No context provided'}. Please use this context to provide more relevant answers.`
            }
          }
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation. Please make sure you have a working microphone.",
        variant: "destructive"
      });
    }
  }, [conversation, context, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <Card className="p-6 glass-panel">
      <div className="flex flex-col gap-6">
        <div className="flex justify-center gap-4">
          <Button
            onClick={startConversation}
            disabled={conversation.status === 'connected'}
            variant="default"
            className="w-40"
          >
            <Mic className="mr-2 h-4 w-4" />
            Start
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
        </div>
      </div>
    </Card>
  );
}
