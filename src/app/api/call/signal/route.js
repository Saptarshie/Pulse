// src/app/api/call/signal/route.js
// High-performance Next.js API route to forward WebRTC signaling payloads across devices
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

if (!globalThis.pulseCallClients) {
  globalThis.pulseCallClients = new Map();
}
if (!globalThis.pulsePendingCalls) {
  globalThis.pulsePendingCalls = new Map();
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const body = await request.json();
    const {
      type,
      recipient: rawRecipient,
      sender: rawSender,
      callType = "video",
      caller,
      sdp,
      candidate,
      reason
    } = body;

    let authenticatedUsername = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        authenticatedUsername = String(decoded.username || "").trim().toLowerCase();
      } catch (e) {
        // Invalid token
      }
    }

    const sender = String(rawSender || authenticatedUsername || "").trim().toLowerCase();
    const recipient = String(rawRecipient || "").trim().toLowerCase();

    if (!type || !recipient) {
      return new Response(JSON.stringify({ success: false, error: "Missing type or recipient" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const payload = {
      type,
      sender,
      recipient,
      callType,
      caller: caller || { username: sender },
      sdp,
      candidate,
      reason,
      timestamp: Date.now()
    };

    // Track or clear pending calls for instant recovery
    if (type === "call:initiate") {
      globalThis.pulsePendingCalls.set(recipient, payload);
      // Auto-clear after 45s if unanswered
      setTimeout(() => {
        if (globalThis.pulsePendingCalls.get(recipient)?.timestamp === payload.timestamp) {
          globalThis.pulsePendingCalls.delete(recipient);
        }
      }, 45000);
    } else if (type === "call:accept" || type === "call:reject" || type === "call:hangup") {
      globalThis.pulsePendingCalls.delete(recipient);
      globalThis.pulsePendingCalls.delete(sender);
    }

    // 1. Deliver to SSE clients connected to Next.js
    let deliveredCount = 0;
    if (globalThis.pulseCallClients && globalThis.pulseCallClients.has(recipient)) {
      const controllers = globalThis.pulseCallClients.get(recipient);
      const sseText = `event: signal\ndata: ${JSON.stringify(payload)}\n\n`;
      const encoded = new TextEncoder().encode(sseText);
      controllers.forEach((ctrl) => {
        try {
          ctrl.enqueue(encoded);
          deliveredCount++;
        } catch (err) {
          controllers.delete(ctrl);
        }
      });
    }

    // Also notify other tabs for sender if call was ended/rejected elsewhere
    if ((type === "call:hangup" || type === "call:reject") && sender && globalThis.pulseCallClients.has(sender)) {
      const senderControllers = globalThis.pulseCallClients.get(sender);
      const sseText = `event: signal\ndata: ${JSON.stringify(payload)}\n\n`;
      const encoded = new TextEncoder().encode(sseText);
      senderControllers.forEach((ctrl) => {
        try {
          ctrl.enqueue(encoded);
        } catch (err) {
          senderControllers.delete(ctrl);
        }
      });
    }

    // 2. Forward to standalone WebSocket server if running (localhost dev mode)
    try {
      const wsPort = process.env.WS_PORT || "3005";
      fetch(`http://127.0.0.1:${wsPort}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(400)
      }).catch(() => {});
    } catch {
      // WS server optional
    }

    return new Response(
      JSON.stringify({
        success: true,
        deliveredCount,
        recipientOnline: deliveredCount > 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Signaling POST handler error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
