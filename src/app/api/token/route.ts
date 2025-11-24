import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ==================== Rate Limiting ====================
const TOKEN_REQUEST_LIMIT = 20; // Max token requests per time window
const TIME_WINDOW = 60 * 1000; // 1 minute
const tokenRequestCounts = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function checkTokenRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = tokenRequestCounts.get(key);

  if (record && now > record.resetTime) {
    tokenRequestCounts.delete(key);
  }

  const current = tokenRequestCounts.get(key);

  if (!current) {
    tokenRequestCounts.set(key, {
      count: 1,
      resetTime: now + TIME_WINDOW,
    });
    return { allowed: true, remaining: TOKEN_REQUEST_LIMIT - 1, resetIn: TIME_WINDOW };
  }

  if (current.count >= TOKEN_REQUEST_LIMIT) {
    const resetIn = current.resetTime - now;
    return { allowed: false, remaining: 0, resetIn: Math.max(0, resetIn) };
  }

  current.count++;
  const remaining = TOKEN_REQUEST_LIMIT - current.count;
  const resetIn = current.resetTime - now;

  return { allowed: true, remaining, resetIn };
}

// ==================== Main Handler ====================
export async function POST(req: NextRequest) {
  try {
    // ===== Rate Limit Check =====
    const rateLimitKey = getRateLimitKey(req);
    const { allowed, remaining, resetIn } = checkTokenRateLimit(rateLimitKey);

    if (!allowed) {
      const waitSeconds = Math.ceil(resetIn / 1000);
      console.warn(`🚫 Rate limit exceeded for ${rateLimitKey}`);
      
      return NextResponse.json(
        { 
          error: `Too many token requests. Please wait ${waitSeconds} seconds.`,
          rateLimitExceeded: true,
          retryAfter: waitSeconds
        },
        { 
          status: 429,
          headers: {
            'Retry-After': waitSeconds.toString(),
            'X-RateLimit-Limit': TOKEN_REQUEST_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + resetIn).toISOString(),
          }
        }
      );
    }

    // ===== Parse Request Body =====
    const body = await req.json();
    const { roomName, participantName } = body;

    // ===== Input Validation =====
    if (!roomName || !participantName) {
      console.warn('⚠️ Missing required fields:', { roomName: !!roomName, participantName: !!participantName });
      return NextResponse.json(
        { error: 'Missing roomName or participantName' },
        { status: 400 }
      );
    }

    // Validate input format (prevent injection attacks)
    const validRoomName = /^[a-zA-Z0-9_-]+$/.test(roomName);
    const validParticipantName = /^[a-zA-Z0-9_-]+$/.test(participantName);

    if (!validRoomName || !validParticipantName) {
      console.warn('⚠️ Invalid format:', { roomName, participantName });
      return NextResponse.json(
        { error: 'Invalid roomName or participantName format. Use only letters, numbers, hyphens, and underscores.' },
        { status: 400 }
      );
    }

    // ===== Load Environment Variables =====
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    // Check if credentials are set
    if (!apiKey || !apiSecret || !wsUrl) {
      console.error('❌ LiveKit credentials not configured:', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasWsUrl: !!wsUrl
      });
      
      return NextResponse.json(
        { error: 'Server configuration error: LiveKit credentials not set.' },
        { status: 500 }
      );
    }

    // Validate WebSocket URL format
    if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
      console.error('❌ Invalid LiveKit URL format:', wsUrl);
      return NextResponse.json(
        { error: 'Invalid LiveKit URL configuration.' },
        { status: 500 }
      );
    }

    console.log('🎫 Generating token for:', { roomName, participantName });

    // ===== Generate LiveKit Access Token =====
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName, // Display name
      ttl: '10m', // Token valid for 10 minutes
      metadata: JSON.stringify({
        createdAt: new Date().toISOString(),
        roomName: roomName
      })
    });

    // Add room permissions
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate JWT token
    const token = await at.toJwt();

    console.log('✅ Token generated successfully for room:', roomName);

    // ===== Return Success Response =====
    const response = NextResponse.json({
      token,
      url: wsUrl,
      expiresIn: 600, // seconds
      roomName,
      participantName
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', TOKEN_REQUEST_LIMIT.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(Date.now() + resetIn).toISOString());

    return response;

  } catch (error) {
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('❌ Error in /api/token:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Map specific errors
      if (errorMessage.includes('Invalid API key')) {
        statusCode = 401;
        errorMessage = 'Invalid LiveKit credentials.';
      } else if (errorMessage.includes('timeout')) {
        statusCode = 504;
        errorMessage = 'Token generation timeout. Please try again.';
      }
    } else {
      console.error('❌ Unknown error in /api/token:', error);
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

// ==================== Health Check Endpoint ====================
export async function GET(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const isConfigured = !!(apiKey && apiSecret && wsUrl);

  return NextResponse.json({
    status: isConfigured ? 'ok' : 'misconfigured',
    livekit: {
      configured: isConfigured,
      url: wsUrl ? '✅ Set' : '❌ Missing',
      credentials: (apiKey && apiSecret) ? '✅ Set' : '❌ Missing'
    },
    timestamp: new Date().toISOString()
  });
}

// ==================== Cleanup ====================
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of tokenRequestCounts.entries()) {
    if (now > record.resetTime) {
      tokenRequestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);