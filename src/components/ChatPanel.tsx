'use client';
import { cn } from '@/lib/utils';
import { MessageList } from './MessageList';
import { VoiceRecorder } from './VoiceRecorder';
import { type Message } from '@/hooks/useChat';
import { Sparkles, Bot, Wifi, WifiOff } from 'lucide-react';

type ChatPanelProps = {
  isOpen: boolean;
  messages: Message[];
  isRecording: boolean;
  isThinking: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  isConnected?: boolean; // Optional connection status
};

export function ChatPanel({
  isOpen,
  messages,
  isRecording,
  isThinking,
  startRecording,
  stopRecording,
  isConnected = true,
}: ChatPanelProps) {
  return (
    <div
      className={cn(
        'fixed bottom-24 right-6 z-[1000] w-[calc(100vw-3rem)] max-w-md h-[70vh] max-h-[700px]',
        'rounded-3xl shadow-2xl transition-all duration-500 ease-out',
        'bg-gradient-to-br from-white/95 via-white/90 to-blue-50/80 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-purple-950/80',
        'backdrop-blur-2xl border border-gray-200/50 dark:border-gray-700/50',
        'ring-1 ring-black/5 dark:ring-white/5',
        isOpen
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header with gradient */}
        <header className="relative p-5 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Animated bot icon */}
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                {/* Sparkle effect */}
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
              </div>
              
              <div>
                <h2 className="font-headline text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Voice Assistant
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-green-500" />
                      <span>Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-red-500" />
                      <span>Connecting...</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Status indicator */}
            {isThinking && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  Thinking...
                </span>
              </div>
            )}
          </div>

          {/* Decorative gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        </header>

        {/* Messages area with custom scrollbar */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
          <MessageList messages={messages} isThinking={isThinking} />
        </div>

        {/* Footer with glass effect */}
        <footer className="relative p-5 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-b-3xl">
          {/* Decorative gradient line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          
          <div className="flex justify-center items-center">
            <VoiceRecorder
              isRecording={isRecording}
              onStart={startRecording}
              onStop={stopRecording}
            />
          </div>

          {/* Helper text */}
          {!isRecording && messages.length === 0 && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3 animate-fade-in">
              Tap the microphone to start talking
            </p>
          )}
        </footer>
      </div>

      {/* Ambient glow effect */}
      <div className="absolute -inset-px bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl -z-10 opacity-50" />
    </div>
  );
}