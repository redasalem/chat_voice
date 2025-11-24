'use client';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  Room,
  RoomEvent,
  LocalAudioTrack,
} from 'livekit-client';
import {v4 as uuidv4} from 'uuid';

export type Message = {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp?: number;
};

type UseChatOptions = {
  roomName: string;
  participantName: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
};

type LiveKitConnectionInfo = {
  token: string;
  url: string;
};

// ==================== Rate Limiting Config ====================
const RATE_LIMIT_COOLDOWN = 5000; // 5 seconds between requests
const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

export function useChat({
  roomName,
  participantName,
  onConnected,
  onDisconnected,
  onError,
}: UseChatOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addMessage = (message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, {
      id: uuidv4(), 
      timestamp: Date.now(),
      ...message
    }]);
  };

  // ==================== Cooldown Timer ====================
  const startCooldownTimer = useCallback(() => {
    const endTime = lastRequestTimeRef.current + RATE_LIMIT_COOLDOWN;
    
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      
      if (remaining > 0) {
        cooldownTimerRef.current = setTimeout(updateTimer, 1000);
      }
    };
    
    updateTimer();
  }, []);

  const canMakeRequest = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    
    if (timeSinceLastRequest < RATE_LIMIT_COOLDOWN) {
      const waitSeconds = Math.ceil((RATE_LIMIT_COOLDOWN - timeSinceLastRequest) / 1000);
      addMessage({
        text: `⏳ Please wait ${waitSeconds} seconds before sending another message.`,
        role: 'assistant'
      });
      return false;
    }
    
    return true;
  }, []);

  // ==================== LiveKit Connection ====================
  const getLiveKitInfo = useCallback(async (): Promise<LiveKitConnectionInfo | null> => {
    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({roomName, participantName}),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch LiveKit info');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      onError?.(error as Error);
      return null;
    }
  }, [roomName, participantName, onError]);

  const connect = useCallback(async () => {
    const liveKitInfo = await getLiveKitInfo();
    
    if (!liveKitInfo || !liveKitInfo.token || !liveKitInfo.url) {
      onError?.(new Error('Missing token or LiveKit URL.'));
      return;
    }

    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    newRoom
      .on(RoomEvent.Connected, () => {
        setIsConnected(true);
        onConnected?.();
      })
      .on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setRoom(null);
        onDisconnected?.();
      });
    
    try {
      await newRoom.connect(liveKitInfo.url, liveKitInfo.token);
      setRoom(newRoom);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [getLiveKitInfo, onConnected, onDisconnected, onError]);

  const disconnect = useCallback(() => {
    room?.disconnect();
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
  }, [room]);

  // ==================== Recording ====================
  const startRecording = useCallback(async () => {
    if (!room || isRecording || isThinking) return;
    
    // Check rate limit before starting
    if (!canMakeRequest()) {
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      const track = new LocalAudioTrack(stream.getAudioTracks()[0]);
      await room.localParticipant.publishTrack(track);
      localAudioTrackRef.current = track;

      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        audioChunksRef.current = [];
        await sendAudioToApi(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      onError?.(error as Error);
      addMessage({
        text: '❌ Failed to access microphone. Please check permissions.',
        role: 'assistant'
      });
    }
  }, [room, isRecording, isThinking, canMakeRequest, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (localAudioTrackRef.current) {
        room?.localParticipant.unpublishTrack(localAudioTrackRef.current);
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
    }
  }, [isRecording, room]);

  // ==================== API Communication with Retry Logic ====================
  const sendAudioToApi = async (audioBlob: Blob, retryCount = 0) => {
    setIsThinking(true);
    lastRequestTimeRef.current = Date.now();
    startCooldownTimer();
    
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    
    reader.onloadend = async () => {
      const audioDataUri = reader.result as string;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({audioDataUri}),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || 'Failed to get response from chat API';
          
          // Handle Rate Limit Error
          if (errorMessage.includes('Quota exceeded') || errorMessage.includes('rate limit')) {
            const rateLimitError = new Error('Rate limit reached. Please wait a moment.');
            rateLimitError.name = 'RateLimitError';
            throw rateLimitError;
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // Add user transcription
        if (data.transcription) {
          addMessage({text: data.transcription, role: 'user'});
        }

        // Add AI response
        if (data.aiResponse?.text && data.aiResponse?.audioDataUri) {
          addMessage({text: data.aiResponse.text, role: 'assistant'});

          // Play AI audio response
          const aiAudio = new Audio(data.aiResponse.audioDataUri);
          aiAudio.play().catch(e => {
            console.error('Audio playback error:', e);
            onError?.(e as Error);
          });
        }
        
      } catch (error: any) {
        console.error('API Error:', error);
        
        // Handle Rate Limit Error with Retry
        if (error.name === 'RateLimitError' && retryCount < MAX_RETRIES) {
          const waitTime = RETRY_DELAY * (retryCount + 1);
          addMessage({
            text: `⏳ Rate limit reached. Retrying in ${waitTime / 1000} seconds... (${retryCount + 1}/${MAX_RETRIES})`,
            role: 'assistant'
          });
          
          setTimeout(() => {
            sendAudioToApi(audioBlob, retryCount + 1);
          }, waitTime);
          
          return; // Don't set isThinking to false yet
        }
        
        // Max retries reached or other error
        if (error.name === 'RateLimitError') {
          addMessage({
            text: '⚠️ Too many requests! Please wait 30 seconds and try again.',
            role: 'assistant'
          });
        } else {
          addMessage({
            text: `❌ Error: ${error.message}`,
            role: 'assistant'
          });
        }
        
        onError?.(error);
      } finally {
        setIsThinking(false);
      }
    };
    
    reader.onerror = () => {
      setIsThinking(false);
      addMessage({
        text: '❌ Failed to process audio. Please try again.',
        role: 'assistant'
      });
    };
  };

  // ==================== Cleanup ====================
  useEffect(() => {
    return () => {
      room?.disconnect();
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, [room]);

  return {
    connect,
    disconnect,
    isConnected,
    messages,
    startRecording,
    stopRecording,
    isRecording,
    isThinking,
    cooldownRemaining, // Export cooldown for UI display
  };
}