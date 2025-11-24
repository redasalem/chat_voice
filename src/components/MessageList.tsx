'use client';
import { type Message } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { Bot, User, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

type MessageListProps = {
  messages: Message[];
  isThinking: boolean;
};

export function MessageList({ messages, isThinking }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            'flex items-start gap-3',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {/* Bot Avatar */}
          {message.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={cn(
              'max-w-[80%] p-3 rounded-xl shadow-sm',
              message.role === 'user'
                ? 'bg-blue-100 text-blue-900 rounded-br-none'
                : 'bg-gray-100 text-gray-900 rounded-bl-none'
            )}
          >
            <p className="text-sm">{message.text}</p>
          </div>

          {/* User Avatar */}
          {message.role === 'user' && (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-gray-700">
              <User className="w-5 h-5" />
            </div>
          )}
        </div>
      ))}

      {/* Thinking Loader */}
      {isThinking && (
        <div className="flex items-start gap-3 justify-start">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div className="max-w-[80%] p-3 rounded-xl bg-gray-100 text-gray-900 rounded-bl-none flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            <span className="text-sm">Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
}
