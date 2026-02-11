'use client';
import { LandingVoiceAIWidget } from '@/components/LandingVoiceAIWidget';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden relative bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
      
      <main className="flex flex-col items-center text-center space-y-6 md:space-y-8 z-10">
        <h1 className="font-extrabold text-4xl md:text-6xl tracking-tight max-w-3xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          AI Voice Chatbot by LiveKit - GemKit
        </h1>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
          Talk to your AI chatbot with your voice, powered by LiveKit & GenKit.
        </p>

        {/* Feature badges = update some info */}
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
            🎤 Voice Powered
          </span>
          <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
            🤖 AI Driven
          </span>
          <span className="px-4 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-sm font-medium">
            ⚡ Real-time
          </span>
        </div>
      </main>

      {/* Widget container */}
      <div className="mt-12 w-full max-w-3xl z-10">
        <LandingVoiceAIWidget />
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Footer */}
      <footer className="absolute bottom-8 text-center text-sm text-gray-500 dark:text-gray-400 z-10">
        <p className="text-base md:text-lg font-medium">
          Built with <span className="text-red-500 animate-pulse">❤️</span> by <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Reda Salem</span>
        </p>
      </footer>
    </div>
  );
}
