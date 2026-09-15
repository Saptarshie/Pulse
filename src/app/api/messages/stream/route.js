// src/app/api/messages/stream/route.js
// Native Next.js 15 Server-Sent Events (SSE) stream for real-time messaging fallback
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Global registry of active SSE clients per username
if (!globalThis.pulseSSEClients) {
  globalThis.pulseSSEClients = new Map();
}

export async function GET(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let username = null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    username = decoded.username?.toLowerCase();
  } catch (err) {
    return new Response("Invalid token", { status: 401 });
  }

  if (!username) {
    return new Response("Invalid username", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      if (!globalThis.pulseSSEClients.has(username)) {
        globalThis.pulseSSEClients.set(username, new Set());
      }
      globalThis.pulseSSEClients.get(username).add(controller);

      // Send initial connected event
      const initData = `event: connected\ndata: ${JSON.stringify({ username, timestamp: Date.now() })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initData));

      // Keep-alive heartbeat every 20s to prevent connection drop
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`: keep-alive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 20000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        if (globalThis.pulseSSEClients.has(username)) {
          const userSet = globalThis.pulseSSEClients.get(username);
          userSet.delete(controller);
          if (userSet.size === 0) {
            globalThis.pulseSSEClients.delete(username);
          }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
