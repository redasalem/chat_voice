'use client';
import { Mic } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type VoiceRecorderProps = {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function VoiceRecorder({
  isRecording,
  onStart,
  onStop,
}: VoiceRecorderProps) {
  const handleToggleRecording = () => {
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse background when recording */}
      {isRecording && (
        <div className="absolute inset-0 bg-red-300/30 rounded-full animate-pulse"></div>
      )}

      <Button
        onClick={handleToggleRecording}
        className={cn(
          'relative w-20 h-20 rounded-full transition-colors duration-300 shadow-md flex items-center justify-center',
          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
        )}
      >
        <Mic className="w-10 h-10 text-white" />
      </Button>
    </div>
  );
}
