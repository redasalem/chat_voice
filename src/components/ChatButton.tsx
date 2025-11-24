'use client';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type ChatButtonProps = {
  isOpen: boolean;
  onClick: () => void;
};

export function ChatButton({ isOpen, onClick }: ChatButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[1001]">
      {/* Pulse animation ring */}
      {!isOpen && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-ping opacity-20" />
      )}
      
      <Button
        onClick={onClick}
        className={cn(
          'relative flex items-center justify-center h-16 w-16 rounded-full shadow-2xl transition-all duration-300 ease-out group',
          'hover:scale-110 hover:shadow-3xl active:scale-95',
          'focus:outline-none focus:ring-4 focus:ring-offset-2',
          isOpen 
            ? 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300 focus:ring-gray-300' 
            : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:ring-purple-400'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {/* Icon with rotation animation */}
        <div className={cn(
          'transition-all duration-300',
          isOpen ? 'rotate-90' : 'rotate-0'
        )}>
          {isOpen ? (
            <X className="h-7 w-7" strokeWidth={2.5} />
          ) : (
            <div className="relative">
              <MessageCircle className="h-7 w-7" strokeWidth={2.5} />
              {/* Sparkle indicator */}
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-pulse" />
            </div>
          )}
        </div>

        {/* Hover glow effect */}
        <div className={cn(
          'absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          !isOpen && 'bg-white/20 blur-sm'
        )} />
      </Button>

      {/* Notification badge (optional - uncomment if needed) */}
      {/* {!isOpen && (
        <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">3</span>
        </div>
      )} */}
    </div>
  );
}