'use client';
import { useState } from 'react';
import { ChatButton } from './ChatButton';
import { ChatPanel } from './ChatPanel';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

export function LandingVoiceAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const roomName = 'landing-voice-ai-room';
  const participantName = `user-${uuidv4()}`;

  const {
    connect,
    disconnect,
    messages,
    startRecording,
    stopRecording,
    isRecording,
    isThinking,
    isConnected,
  } = useChat({
    roomName,
    participantName,
    onConnected: () => {},
    onDisconnected: () => {},
    onError: (error) => {
      console.error('Chat Error:', error);
      if (error.name === 'RateLimitError') {
        toast({
          variant: 'destructive',
          title: 'Too many requests',
          description: 'Please wait a moment before trying again.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Uh oh! Something went wrong.',
          description: error.message || 'An unknown error occurred.',
        });
      }
    },
  });

  const handleToggleChat = () => {
    if (isOpen) {
      disconnect();
    } else {
      connect();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative">
      {/* Chat Toggle Button */}
      <ChatButton isOpen={isOpen} onClick={handleToggleChat} />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={isOpen}
        messages={messages}
        isRecording={isRecording}
        isThinking={isThinking}
        startRecording={startRecording}
        stopRecording={stopRecording}
      />
    </div>
  );
}
