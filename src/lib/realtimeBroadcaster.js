// src/lib/realtimeBroadcaster.js
// Unified broadcaster emitting to WebSocket server and SSE clients

export async function broadcastRealtimeMessage({ sender, recipient, message }) {
  const payload = {
    type: "message",
    sender: sender?.toLowerCase(),
    recipient: recipient?.toLowerCase(),
    message,
    timestamp: new Date().toISOString()
  };

  // 1. Deliver to in-process SSE clients if any
  if (globalThis.pulseSSEClients) {
    const sseClients = globalThis.pulseSSEClients;
    const sendSSE = (username) => {
      if (username && sseClients.has(username)) {
        const controllers = sseClients.get(username);
        const sseText = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
        const encoded = new TextEncoder().encode(sseText);
        controllers.forEach((controller) => {
          try {
            controller.enqueue(encoded);
          } catch (e) {
            controllers.delete(controller);
          }
        });
      }
    };
    sendSSE(payload.recipient);
    sendSSE(payload.sender);
  }

  // 2. Deliver to standalone WebSocket server (port 3005)
  try {
    const wsPort = process.env.WS_PORT || "3005";
    await fetch(`http://127.0.0.1:${wsPort}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Fast timeout so it never slows down the Server Action if WS server is off
      signal: AbortSignal.timeout(1000)
    }).catch(() => {});
  } catch (err) {
    // Silently ignore if WS server is not currently running
  }
}
