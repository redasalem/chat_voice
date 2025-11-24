import { NextRequest, NextResponse } from 'next/server';
import { transcribeUserSpeech } from '@/ai/flows/transcribe-user-speech';
import { generateAIResponse } from '@/ai/flows/generate-ai-response';
import { convertTextToSpeech } from '@/ai/flows/convert-text-to-speech';

export const dynamic = 'force-dynamic';

// ==================== Rate Limiting ====================
const REQUEST_LIMIT = 10; // Max requests per time window
const TIME_WINDOW = 60 * 1000; // 1 minute in milliseconds
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: NextRequest): string {
  // Use IP address or a session identifier
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = requestCounts.get(key);

  // Clean up old entries periodically
  if (record && now > record.resetTime) {
    requestCounts.delete(key);
  }

  const current = requestCounts.get(key);

  if (!current) {
    // First request from this key
    requestCounts.set(key, {
      count: 1,
      resetTime: now + TIME_WINDOW,
    });
    return { allowed: true, remaining: REQUEST_LIMIT - 1, resetIn: TIME_WINDOW };
  }

  if (current.count >= REQUEST_LIMIT) {
    const resetIn = current.resetTime - now;
    return { allowed: false, remaining: 0, resetIn: Math.max(0, resetIn) };
  }

  // Increment count
  current.count++;
  const remaining = REQUEST_LIMIT - current.count;
  const resetIn = current.resetTime - now;

  return { allowed: true, remaining, resetIn };
}

// ==================== Main Handler ====================
export async function POST(req: NextRequest) {
  try {
    // ===== Rate Limit Check =====
    const rateLimitKey = getRateLimitKey(req);
    const { allowed, remaining, resetIn } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      const waitSeconds = Math.ceil(resetIn / 1000);
      return NextResponse.json(
        { 
          error: `Rate limit exceeded. Please wait ${waitSeconds} seconds before trying again.`,
          rateLimitExceeded: true,
          retryAfter: waitSeconds
        },
        { 
          status: 429,
          headers: {
            'Retry-After': waitSeconds.toString(),
            'X-RateLimit-Limit': REQUEST_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + resetIn).toISOString(),
          }
        }
      );
    }

    // ===== Input Validation =====
    const { audioDataUri } = await req.json();

    if (!audioDataUri) {
      return NextResponse.json(
        { error: 'Missing audioDataUri' },
        { status: 400 }
      );
    }

    // Validate data URI format
    if (!audioDataUri.startsWith('data:audio/')) {
      return NextResponse.json(
        { error: 'Invalid audio data format' },
        { status: 400 }
      );
    }

    console.log('🎤 Processing audio request...');

    // ===== 1. Transcribe audio to text =====
    let transcription = '';
    try {
      const transcribeResult = await transcribeUserSpeech({ audioDataUri });
      transcription = transcribeResult.transcription;
      console.log('✅ Transcription:', transcription);
    } catch (error) {
      console.error('❌ Transcription error:', error);
      
      // Check if it's a quota/rate limit error
      if (error instanceof Error && 
          (error.message.includes('quota') || 
           error.message.includes('rate limit') ||
           error.message.includes('429'))) {
        return NextResponse.json(
          { 
            error: 'AI service quota exceeded. Please try again in a few moments.',
            quotaExceeded: true
          },
          { status: 429 }
        );
      }
      
      throw error; // Re-throw other errors
    }
    
    // If transcription is empty or only whitespace, stop processing
    if (!transcription || !transcription.trim()) {
      console.log('⚠️ Empty transcription, skipping AI response');
      return NextResponse.json({ 
        transcription: '',
        aiResponse: {
          text: 'Sorry, I couldn\'t understand that. Please try again.',
          audioDataUri: '',
        }
      });
    }

    // ===== 2. Generate AI response from text =====
    let aiTextResponse = '';
    try {
      const aiResult = await generateAIResponse({ transcription });
      aiTextResponse = aiResult.response;
      console.log('✅ AI Response:', aiTextResponse);
    } catch (error) {
      console.error('❌ AI generation error:', error);
      
      // Check for quota errors
      if (error instanceof Error && 
          (error.message.includes('quota') || 
           error.message.includes('rate limit') ||
           error.message.includes('429'))) {
        return NextResponse.json(
          { 
            error: 'AI service is busy. Please try again shortly.',
            quotaExceeded: true
          },
          { status: 429 }
        );
      }
      
      throw error;
    }
    
    // If AI response text is empty, return transcription only
    if (!aiTextResponse || !aiTextResponse.trim()) {
      console.log('⚠️ Empty AI response');
      return NextResponse.json({
        transcription: transcription,
        aiResponse: {
          text: 'I\'m not sure how to respond to that.',
          audioDataUri: '',
        },
      });
    }

    // ===== 3. Convert AI text response to speech =====
    let aiAudioDataUri = '';
    try {
      const ttsResult = await convertTextToSpeech({ text: aiTextResponse });
      aiAudioDataUri = ttsResult.audioDataUri;
      console.log('✅ TTS generated successfully');
    } catch (error) {
      console.error('❌ TTS error:', error);
      
      // If TTS fails, still return the text response
      return NextResponse.json({
        transcription: transcription,
        aiResponse: {
          text: aiTextResponse,
          audioDataUri: '',
        },
      });
    }

    // ===== 4. Return success response =====
    const response = NextResponse.json({
      transcription: transcription,
      aiResponse: {
        text: aiTextResponse,
        audioDataUri: aiAudioDataUri,
      },
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', REQUEST_LIMIT.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(Date.now() + resetIn).toISOString());

    console.log('✅ Request completed successfully');
    return response;

  } catch (error) {
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('❌ Error in /api/chat:', error);
      
      // Map specific errors to status codes
      if (errorMessage.includes('timeout')) {
        statusCode = 504;
        errorMessage = 'Request timeout. Please try again.';
      } else if (errorMessage.includes('network')) {
        statusCode = 503;
        errorMessage = 'Service temporarily unavailable.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        statusCode = 429;
        errorMessage = 'Too many requests. Please wait a moment.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// ==================== Cleanup old rate limit entries ====================
// Run cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);
