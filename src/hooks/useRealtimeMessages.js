// src/hooks/useRealtimeMessages.js
// High-performance real-time messaging hook with WebSocket primary and SSE fallback
"use client";

import { useEffect, useRef, useState } from "react";

export function useRealtimeMessages(currentUsername, onMessageReceived) {
  const [connectionType, setConnectionType] = useState("disconnected");
  const wsRef = useRef(null);
  const sseRef = useRef(null);
  const onMessageRef = useRef(onMessageReceived);

  useEffect(() => {
    onMessageRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    if (!currentUsername) return;

    let isMounted = true;
    let ws = null;
    let sse = null;
    let wsConnectTimeout = null;

    function connectSSE() {
      if (!isMounted) return;
      try {
        sse = new EventSource("/api/messages/stream");
        sseRef.current = sse;

        sse.onopen = () => {
          if (isMounted) setConnectionType("sse");
        };

        sse.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.message && onMessageRef.current) {
              onMessageRef.current(data.message);
            }
          } catch (e) {
            // ignore
          }
        });

        sse.onerror = () => {
          if (isMounted && connectionType !== "ws") {
            setConnectionType("reconnecting");
          }
        };
      } catch (err) {
        console.warn("SSE connection error:", err);
      }
    }

    function connectWebSocket() {
      if (!isMounted) return;
      try {
        const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
        const wsUrl = `ws://${host}:3005`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // If WS doesn't open within 2.5s, initiate SSE fallback
        wsConnectTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN && isMounted) {
            connectSSE();
          }
        }, 2500);

        ws.onopen = () => {
          if (!isMounted) return;
          if (wsConnectTimeout) clearTimeout(wsConnectTimeout);
          setConnectionType("ws");
          // Authenticate session
          ws.send(JSON.stringify({ type: "auth", username: currentUsername }));
          // Close SSE if active
          if (sseRef.current) {
            sseRef.current.close();
            sseRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "message" && data.message && onMessageRef.current) {
              onMessageRef.current(data.message);
            }
          } catch (e) {
            // ignore
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            // If WS dropped, fallback to SSE
            connectSSE();
          }
        };

        ws.onerror = () => {
          // WS error will trigger onclose and fallback to SSE
        };
      } catch (err) {
        connectSSE();
      }
    }

    connectWebSocket();

    return () => {
      isMounted = false;
      if (wsConnectTimeout) clearTimeout(wsConnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [currentUsername]);

  return { connectionType };
}
