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

interface TimestampResponse {
  start_time: number;
  end_time: number;
}

interface ConversationProps {
  currentTime: number;
  audioFileName?: string;
  audioUrl?: string;
  onStartConversation?: () => void;
  onStopConversation?: () => void;
  onBeforeChunkPlay?: (time: number) => void;
  onAfterChunkPlay?: () => void;
  onPlayerStateChange?: (disabled: boolean) => void;
  onTemporaryTimeChange?: (time: number) => void;
}


const ELEVEN_LABS_API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY as string | undefined;
const ELEVEN_LABS_AGENT_ID = import.meta.env.VITE_ELEVEN_LABS_AGENT_ID as string | undefined;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

if (!ELEVEN_LABS_API_KEY) {
  console.error('Environment variable VITE_ELEVEN_LABS_API_KEY is not defined');
}
if (!ELEVEN_LABS_AGENT_ID) {
  console.error('Environment variable VITE_ELEVEN_LABS_AGENT_ID is not defined');
}
if (!BACKEND_URL) {
  console.error('Environment variable VITE_BACKEND_URL is not defined');
}

export default function Conversation({
  currentTime,
  audioFileName,
  audioUrl,
  onStartConversation,
  onBeforeChunkPlay,
  onAfterChunkPlay,
  onStopConversation,
  onPlayerStateChange,
  onTemporaryTimeChange
}: ConversationProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<ContextData | null>(null);
  const [firstMessage, setFirstMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const getAudioTimestamps = async (contextText: string): Promise<TimestampResponse> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/timestamps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_text: contextText,
          file_name: audioFileName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timestamps');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching timestamps:', error);
      throw error;
    }
  };

  const cleanupAudioPlayer = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
  };

  const cleanupMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const currentSessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const updateSessionId = useCallback((newSessionId: string | null) => {
    currentSessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
  }, []);
  
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to agent');
      setIsStarting(false);
      setError(null);
    },
    onDisconnect: async (details: DisconnectionDetails) => {
      console.log('Disconnection details:', details);
      
      if (details.reason === 'error') {
        console.error('Connection error context:', details.context);
        
        // Only attempt reconnect if sessionId is a valid string
        console.error('Connection error context:', details.context);
        const currentSessionId = currentSessionIdRef.current;
        if (typeof currentSessionId === 'string') {
          await startConversation(currentSessionId);
        }
      } else {
        onStopConversation();
      }
    },
    onMessage: (message) => {
      console.log('Message:', message);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      setError(error.message);
      setIsStarting(false);
      
      cleanupMediaStream();
      cleanupAudioPlayer();
    },
  });

  const clientTools = useCallback(() => ({
    play_chunk: async ({ contextText }) => {
      try {
        if (!audioUrl) {
          throw new Error('No ElevenLabs audio stream URL available');
        }
  
        // Wait for ElevenLabs stream to initialize
        console.log('Waiting for ElevenLabs stream to initialize...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        console.log('ElevenLabs stream should be ready');
  
        // Get timestamps from API for this chunk of text
        const { start_time, end_time } = await getAudioTimestamps(contextText);
        console.log('Playing chunk:', contextText);
        console.log('Start time:', start_time);
        console.log('End time:', end_time);
  
        // Create new audio player for ElevenLabs stream
        const elevenLabsAudio = new Audio(audioUrl);
        elevenLabsAudio.currentTime = start_time;
        
        return new Promise((resolve, reject) => {
          // Monitor playback time to ensure exact chunk playback
          const checkTime = () => {
            if (elevenLabsAudio.currentTime >= end_time) {
              elevenLabsAudio.pause();
              resolve({
                status: 'success',
                played_chunk: {
                  text: contextText,
                  start: start_time,
                  end: end_time
                }
              });
            } else {
              requestAnimationFrame(checkTime);
            }
          };
  
          elevenLabsAudio.play()
            .then(() => requestAnimationFrame(checkTime))
            .catch(error => {
              console.error('ElevenLabs stream playback error:', error);
              reject(error);
            });
  
          elevenLabsAudio.onerror = (error) => {
            console.error('ElevenLabs audio stream error:', error);
            reject(error);
          };
        });
      } catch (error) {
        console.error('Error in ElevenLabs chunk playback:', error);
        throw error;
      }
    }
  }), [audioUrl]);

  const fetchContext = useCallback(async (): Promise<ContextData | null> => {
    if (currentTime < 1) {
      return null;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/context`, {
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

  const startConversation = useCallback(async (existingSessionId?: string) => {
    try {
      setIsStarting(true);
      setError(null);
      
      if (onStartConversation) {
        onStartConversation();
      }
      if (onPlayerStateChange) {
        onPlayerStateChange(true);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const validSessionId = typeof existingSessionId === 'string' ? existingSessionId : undefined;
      console.log('Valid session ID:', validSessionId);
      
      const contextData = await fetchContext();
      setCurrentContext(contextData);
  
      let conversationHistory = '';
      let nextFirstMessage = null;
      
      // Only fetch history if we have an existing session
      if (validSessionId) {
        try {
          conversationHistory = await fetchConversationHistory(validSessionId);
          const greetings = ['lets continue?'];
          nextFirstMessage = greetings[Math.floor(Math.random() * greetings.length)];
        } catch (error) {
          console.warn('Failed to fetch history for existing session, starting new session');
        }
      }
  
      setHistory(conversationHistory);
      setFirstMessage(nextFirstMessage);
  
      // Start session with existing ID if available
      const newSessionId = await conversation.startSession({
        agentId: ELEVEN_LABS_AGENT_ID,
        sessionId: existingSessionId, // Pass existing session ID if available
        dynamicVariables: {
          context: contextData?.context || 'No context available yet',
          history: conversationHistory || 'No history available yet',
          first_message: nextFirstMessage || "Hi, I'm Book Buddy. How can I help you today?"
        },
        clientTools: clientTools()
      });
  
      updateSessionId(newSessionId);
      console.log('Session started with ID:', newSessionId);
  
      await conversation.setVolume({ volume: 0.8 });
      
    } catch (error) {
      console.error('Start conversation error:', error);
      setError('Failed to start conversation. Please check your microphone access.');
      setIsStarting(false);
      setCurrentContext(null);
      cleanupMediaStream();
  
      if (onPlayerStateChange) {
        onPlayerStateChange(false);
      }
    }
  }, [conversation, currentTime, audioFileName, fetchContext, onStartConversation, onPlayerStateChange, clientTools, fetchConversationHistory]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setCurrentContext(null);
      cleanupMediaStream();
      cleanupAudioPlayer();

      // Re-enable player and notify parent to resume playing
      if (onPlayerStateChange) {
        onPlayerStateChange(false);
      }
      if (onStopConversation) {
        onStopConversation();
      }
    } catch (error) {
      setError('Failed to stop conversation');
    }
  }, [conversation, onStopConversation, onPlayerStateChange]);

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
            onClick={(e) => {
              if (conversation.status === 'connected') {
                stopConversation();
              } else {
                startConversation(sessionId || undefined);
              }
            }}
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