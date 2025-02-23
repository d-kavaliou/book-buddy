import { useConversation } from '@11labs/react';
import { useCallback, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Mic, MicOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DisconnectionDetails } from '@11labs/client';

interface ContextData {
  context: string;
  start_position: number;
  end_position: number;
}

interface ConversationProps {
  currentTime: number;
  audioFileName?: string;
}

const ELEVEN_LABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY as string | undefined;
const ELEVEN_LABS_AGENT_ID = import.meta.env.ELEVEN_LABS_AGENT_ID as string | undefined;

if (!ELEVEN_LABS_API_KEY) {
  console.error('Environment variable VITE_ELEVEN_LABS_API_KEY is not defined');
}
if (!ELEVEN_LABS_AGENT_ID) {
  console.error('Environment variable ELEVEN_LABS_AGENT_ID is not defined');
}

export default function Conversation({ currentTime, audioFileName }: ConversationProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<ContextData | null>(null);
  const [firstMessage, setFirstMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to agent');
      setIsStarting(false);
      setError(null);
    },
    onDisconnect: (details: DisconnectionDetails) => {
      console.log('Disconnection details:', details);
      
      let reasonMessage = 'Unknown disconnection reason';
      
      if (details.reason === 'error') {
        reasonMessage = `Error: ${details.message}`;
        console.error('Connection error context:', details.context);
      } else if (details.reason === 'agent') {
        const closeEvent = details.context;
        reasonMessage = `Agent disconnected (Code: ${closeEvent.code}, ${closeEvent.reason || 'No reason provided'})`;
      } else if (details.reason === 'user') {
        reasonMessage = 'User initiated disconnect';
      }
      
      setCurrentContext(null);
      setError(null);
      setHistory(null);
      setFirstMessage(null);
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    },
    onMessage: (message) => {
      console.log('Message:', message);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setError(error.message);
      setIsStarting(false);
      // Clean up on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    },
  });

  const fetchContext = useCallback(async (): Promise<ContextData | null> => {

    if (currentTime < 1) {
      return null;
    }

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

      return await response.json();
    } catch (error) {
      setError('Failed to fetch context for current timestamp');
      return null;
    }
  }, [currentTime, audioFileName]);

  const fetchConversationHistory = useCallback(async (sid: string): Promise<string> => {
    try {
      console.log('Fetching conversation history for session:', sid);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${sid}`, {
        headers: {
          'xi-api-key': ELEVEN_LABS_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversation history');
      }

      const data = await response.json();
      console.log('Raw API response:', data);
      
      const history = data.transcript
        .map(turn => `${turn.role === 'agent' ? 'agent' : 'user'}: ${turn.message}`)
        .join('\n');

      console.log('Conversation history:', history);
      return history;
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
      return '';
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setIsStarting(true);
      setError(null);
      
      // Get microphone permission and store the stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const contextData = await fetchContext();
      setCurrentContext(contextData);

      console.log('sessionId to fetch history:', sessionId);

      let conversationHistory = '';
      let nextFirstMessage = null;
      
      if (sessionId) {
        conversationHistory = await fetchConversationHistory(sessionId);
        
        // Random selection of greeting for returning sessions
        const greetings = ['hey again', 'hey', 'lets continue'];
        nextFirstMessage = greetings[Math.floor(Math.random() * greetings.length)];
        
        console.log('Previous session ID:', sessionId);
        console.log('Conversation history:', conversationHistory || 'No history found');
      }

      setHistory(conversationHistory);
      setFirstMessage(nextFirstMessage);

      const newSessionId = await conversation.startSession({
        agentId: ELEVEN_LABS_AGENT_ID,
        dynamicVariables: {
          context: contextData?.context || 'No context available yet',
          history: conversationHistory || 'No history available yet',
          first_message: nextFirstMessage || "Hi, I'm Eric. How can I help you today?"
        }
      });

      setSessionId(newSessionId);
      console.log('New session started with ID:', newSessionId);

      // Set initial volume
      await conversation.setVolume({ volume: 0.8 });
    } catch (error) {
      console.error('Start conversation error:', error);
      setError('Failed to start conversation. Please check your microphone access.');
      setIsStarting(false);
      setCurrentContext(null);
      
      // Clean up on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [conversation, currentTime, audioFileName, fetchContext, sessionId, fetchConversationHistory]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setCurrentContext(null);
      
      // Clean up media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    } catch (error) {
      setError('Failed to stop conversation');
    }
  }, [conversation]);

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-center">
          <Button
            onClick={conversation.status === 'connected' ? stopConversation : startConversation}
            disabled={isStarting}
            variant={conversation.status === 'connected' ? "destructive" : "default"}
            className="w-40"
          >
            {conversation.status === 'connected' ? (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Disconnect
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                {isStarting ? 'Connecting...' : 'Connect'}
              </>
            )}
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