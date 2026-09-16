// src/app/api/call/stream/route.js
// Universal Server-Sent Events (SSE) stream for low-latency WebRTC call signaling across devices
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Global in-memory registry of active call SSE clients per username
if (!globalThis.pulseCallClients) {
  globalThis.pulseCallClients = new Map();
}

// Global in-memory registry of active ringing calls for quick recovery on reconnect
if (!globalThis.pulsePendingCalls) {
  globalThis.pulsePendingCalls = new Map();
}

export async function GET(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  // Also support token query parameter as fallback for cross-origin or service worker scenarios
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get("token");
  const activeToken = token || queryToken;

  if (!activeToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  let username = null;
  try {
    const decoded = jwt.verify(activeToken, process.env.JWT_SECRET || "secret");
    username = String(decoded.username || "").trim().toLowerCase();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!username) {
    return new Response(JSON.stringify({ error: "Invalid username" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      if (!globalThis.pulseCallClients.has(username)) {
        globalThis.pulseCallClients.set(username, new Set());
      }
      globalThis.pulseCallClients.get(username).add(controller);

      // Send initial connection confirmation event
      const initData = `event: connected\ndata: ${JSON.stringify({
        status: "connected",
        username,
        timestamp: Date.now()
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initData));

      // Deliver any pending incoming call that arrived recently (within 40 seconds)
      if (globalThis.pulsePendingCalls.has(username)) {
        const pending = globalThis.pulsePendingCalls.get(username);
        if (Date.now() - pending.timestamp < 40000) {
          const callEvent = `event: signal\ndata: ${JSON.stringify(pending)}\n\n`;
          controller.enqueue(new TextEncoder().encode(callEvent));
        } else {
          globalThis.pulsePendingCalls.delete(username);
        }
      }

      // Keep-alive heartbeat every 15s to keep connections alive through Cloudflare/Render proxies
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: keep-alive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        if (globalThis.pulseCallClients.has(username)) {
          const userSet = globalThis.pulseCallClients.get(username);
          userSet.delete(controller);
          if (userSet.size === 0) {
            globalThis.pulseCallClients.delete(username);
          }
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
