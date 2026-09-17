"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "@/store/slices/user-slice";
import { fetchUserAction } from "@/action";
import IncomingCallModal from "@/components/live-call/IncomingCallModal";
import ActiveCallModal from "@/components/live-call/ActiveCallModal";

const CallContext = createContext(null);

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" }
  ]
};

// Web Audio API Ringtone & Dial tone synthesizer
class CallSoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.interval = null;
  }

  getAudioContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playDialTone() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const beep = () => {
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.2);
        osc2.stop(ctx.currentTime + 1.2);
      } catch (e) {}
    };

    beep();
    this.interval = setInterval(beep, 3000);
  }

  playIncomingRing() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const ring = () => {
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(520, ctx.currentTime);
        osc2.frequency.setValueAtTime(660, ctx.currentTime);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.95);
        osc2.stop(ctx.currentTime + 0.95);
      } catch (e) {}
    };

    ring();
    this.interval = setInterval(ring, 2500);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

const callSound = new CallSoundSynthesizer();

// Helper to create synthetic video track (gradient canvas) if device has no camera
function createSyntheticMediaStream(isVideo = true) {
  if (typeof window === "undefined") return null;

  const tracks = [];

  // 1. Silent audio track
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0; // silent
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      const silentAudioTrack = dst.stream.getAudioTracks()[0];
      if (silentAudioTrack) tracks.push(silentAudioTrack);
    }
  } catch (e) {
    console.warn("Could not create synthetic audio track:", e);
  }

  // 2. Animated gradient canvas video track (simulating camera)
  if (isVideo) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");

      let hue = 0;
      const draw = () => {
        hue = (hue + 2) % 360;
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, `hsl(${hue}, 70%, 35%)`);
        grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 20%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";
        ctx.font = "bold 26px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Pulse Live Video", canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = "16px Inter, sans-serif";
        ctx.fillText("Camera stream active", canvas.width / 2, canvas.height / 2 + 25);
      };
      draw();
      const animInterval = setInterval(draw, 40);

      const canvasStream = canvas.captureStream(25);
      const canvasVideoTrack = canvasStream.getVideoTracks()[0];
      if (canvasVideoTrack) {
        // Stop timer when track is stopped
        const origStop = canvasVideoTrack.stop.bind(canvasVideoTrack);
        canvasVideoTrack.stop = () => {
          clearInterval(animInterval);
          origStop();
        };
        tracks.push(canvasVideoTrack);
      }
    } catch (e) {
      console.warn("Could not create synthetic video track:", e);
    }
  }

  return new MediaStream(tracks);
}

export function CallProvider({ children }) {
  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.userslice);
  const [currentUsername, setCurrentUsername] = useState(
    reduxUser?.username ? reduxUser.username.trim().toLowerCase() : ""
  );

  // Proactively fetch user profile on mount if Redux is empty
  useEffect(() => {
    if (reduxUser?.username) {
      setCurrentUsername(reduxUser.username.trim().toLowerCase());
    } else {
      fetchUserAction()
        .then((res) => {
          if (res?.success && res.user?.username) {
            dispatch(setUser(res.user));
            setCurrentUsername(res.user.username.trim().toLowerCase());
          }
        })
        .catch(() => {});
    }
  }, [reduxUser?.username, dispatch]);

  // Request browser notification permissions on first user interaction
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      const handleFirstClick = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener("click", handleFirstClick);
      };
      window.addEventListener("click", handleFirstClick, { once: true });
      return () => window.removeEventListener("click", handleFirstClick);
    }
  }, []);

  // Call States: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended'
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState("video"); // 'video' | 'audio'
  const [remoteUser, setRemoteUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // References
  const wsRef = useRef(null);
  const sseRef = useRef(null);
  const pcRef = useRef(null);
  const timerRef = useRef(null);
  const titleIntervalRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const originalVideoTrackRef = useRef(null);
  const remoteUserRef = useRef(null);
  const callStateRef = useRef("idle");
  const originalDocTitleRef = useRef("");

  useEffect(() => {
    remoteUserRef.current = remoteUser;
  }, [remoteUser]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Restore document title when leaving incoming call state
  const clearTitleFlashing = useCallback(() => {
    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
    }
    if (typeof document !== "undefined" && originalDocTitleRef.current) {
      document.title = originalDocTitleRef.current;
    }
  }, []);

  // Cleanly close PeerConnection and media tracks (STABLE, NO DEPENDENCIES)
  const cleanupCall = useCallback(() => {
    callSound.stop();
    clearTitleFlashing();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    pendingCandidatesRef.current = [];
    originalVideoTrackRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setRemoteIsScreenSharing(false);
    setIsMinimized(false);
    setDurationSeconds(0);
  }, [clearTitleFlashing]);

  // Format call duration MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Start duration stopwatch
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDurationSeconds(0);
    timerRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  // Multi-tier safe media acquisition
  const acquireLocalMedia = useCallback(async (type) => {
    const needVideo = type === "video";

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      // 1. First Tier: Try high-quality camera with echo-cancelled audio
      if (needVideo) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: "user"
            }
          });
          return stream;
        } catch (err1) {
          console.warn("[Pulse CallEngine] High-res camera acquisition failed, trying basic video:", err1?.message);
        }

        // 2. Second Tier: Try unconstrained camera (fixes mobile constraint errors)
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
          });
          return stream;
        } catch (err2) {
          console.warn("[Pulse CallEngine] Basic camera acquisition failed, falling back to real mic + synthetic video:", err2?.message);
        }
      }

      // 3. Third Tier: Acquire real microphone, and if needVideo, attach synthetic video
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        if (needVideo) {
          const synth = createSyntheticMediaStream(true);
          const synthVideoTrack = synth?.getVideoTracks()[0];
          if (synthVideoTrack) audioStream.addTrack(synthVideoTrack);
        }
        return audioStream;
      } catch (err3) {
        console.warn("[Pulse CallEngine] Microphone acquisition failed:", err3?.message);
      }
    }

    // 4. Final Tier: Complete synthetic fallback
    return createSyntheticMediaStream(needVideo);
  }, []);

  // Universal signal sender: uses Next.js HTTP POST for 100% reliable cross-device delivery, plus WS if open
  const sendSignal = useCallback(
    async (payload) => {
      const sender = String(
        currentUsername || reduxUser?.username || ""
      )
        .trim()
        .toLowerCase();
      const enriched = {
        ...payload,
        sender
      };

      // If local WebSocket is open (localhost dev mode), also send via WS
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(enriched));
        } catch (e) {}
      }

      // Universal delivery via Next.js API route across HTTPS/cellular/desktop
      try {
        const res = await fetch("/api/call/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(enriched)
        });
        return await res.json();
      } catch (err) {
        console.warn("[Pulse CallEngine] Failed to dispatch signal via API:", err);
        return { success: false, error: err.message };
      }
    },
    [currentUsername, reduxUser?.username]
  );

  // Initialize RTCPeerConnection
  const createPeerConnection = useCallback(
    (targetUsername) => {
      if (pcRef.current) {
        pcRef.current.close();
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Send ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "webrtc:ice-candidate",
            recipient: String(targetUsername).trim().toLowerCase(),
            candidate: event.candidate
          });
        }
      };

      // Receive remote tracks (handles audio, camera video, and screen sharing)
      pc.ontrack = (event) => {
        console.log(`[Pulse CallEngine] Remote track arrived: kind=${event.track.kind}, id=${event.track.id}`);

        callSound.stop();
        clearTitleFlashing();
        setCallState("connected");
        setStatusMessage("");
        startTimer();

        let currentStream = remoteStreamRef.current;
        if (!currentStream) {
          currentStream = new MediaStream();
        }

        // Add all tracks from event.streams if present
        if (event.streams && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!currentStream.getTracks().some((t) => t.id === track.id)) {
              currentStream.addTrack(track);
            }
          });
        }

        // Always ensure the arriving track is added
        if (!currentStream.getTracks().some((t) => t.id === event.track.id)) {
          currentStream.addTrack(event.track);
        }

        // If a video track arrived, ensure callType reflects video
        if (event.track.kind === "video") {
          setCallType("video");
        }

        // Re-dispatch if track un-mutes
        event.track.onunmute = () => {
          if (remoteStreamRef.current) {
            setRemoteStream(new MediaStream(remoteStreamRef.current.getTracks()));
          }
        };

        // Create a new MediaStream instance so React state updates and triggers re-render
        const freshStream = new MediaStream(currentStream.getTracks());
        remoteStreamRef.current = freshStream;
        setRemoteStream(freshStream);
      };

      // Connection state changes (handles both modern and mobile WebRTC states)
      const handleStateChange = () => {
        const connState = pc.connectionState;
        const iceState = pc.iceConnectionState;
        console.log(`[Pulse CallEngine] Connection state: ${connState}, ICE: ${iceState}`);

        if (connState === "connected" || iceState === "connected" || iceState === "completed") {
          callSound.stop();
          clearTitleFlashing();
          setCallState("connected");
          setStatusMessage("");
          startTimer();
        } else if (connState === "failed" || iceState === "failed") {
          setStatusMessage("Connection unstable...");
        } else if (connState === "disconnected" || iceState === "disconnected") {
          setStatusMessage("Reconnecting...");
        }
      };

      pc.onconnectionstatechange = handleStateChange;
      pc.oniceconnectionstatechange = handleStateChange;

      return pc;
    },
    [startTimer, clearTitleFlashing, sendSignal]
  );

  // Central signaling message processor for both SSE stream and WebSocket
  const handleSignalingMessage = useCallback(
    async (data) => {
      if (!data || !data.type) return;

      const myUsername = String(
        currentUsername || reduxUser?.username || ""
      )
        .trim()
        .toLowerCase();
      const targetRecipient = String(data.recipient || "").trim().toLowerCase();

      // Only process if addressed to us or if we sent it
      if (targetRecipient && targetRecipient !== myUsername) {
        return;
      }

      try {
        // 1. Incoming Call Request
        if (data.type === "call:initiate") {
          const incomingCaller = data.caller || { username: data.sender };
          console.log(
            `[Pulse CallEngine] Received incoming call from @${incomingCaller.username}`
          );

          // If already in an active call, notify caller busy
          if (callStateRef.current !== "idle") {
            sendSignal({
              type: "call:reject",
              recipient: String(data.sender).trim().toLowerCase(),
              reason: "busy"
            });
            return;
          }

          setRemoteUser(incomingCaller);
          setCallType(data.callType || "video");
          setCallState("incoming");
          callSound.playIncomingRing();

          // Browser native notification
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              const n = new Notification(
                `Incoming ${data.callType === "audio" ? "Voice" : "Video"} Call`,
                {
                  body: `${incomingCaller.name || incomingCaller.username} (@${incomingCaller.username}) is calling you on Pulse`,
                  icon: incomingCaller.profilePic || "/favicon.ico",
                  tag: "pulse-incoming-call",
                  requireInteraction: true
                }
              );
              n.onclick = () => {
                window.focus();
                n.close();
              };
            } catch (e) {}
          }

          // Flashing title notification
          if (typeof document !== "undefined") {
            originalDocTitleRef.current = document.title;
            let toggle = false;
            if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
            titleIntervalRef.current = setInterval(() => {
              if (callStateRef.current !== "incoming") {
                clearInterval(titleIntervalRef.current);
                titleIntervalRef.current = null;
                document.title = originalDocTitleRef.current || "Pulse";
              } else {
                document.title = toggle
                  ? `📞 Incoming Call from @${incomingCaller.username}!`
                  : `🔔 Pulse Live Calling...`;
                toggle = !toggle;
              }
            }, 800);
          }
        }

        // 2. Outgoing Call Accepted by Recipient
        else if (data.type === "call:accept") {
          callSound.stop();
          clearTitleFlashing();
          setStatusMessage("Connecting stream...");

          // Caller initiates SDP Offer with bi-directional audio and video
          const pc = pcRef.current;
          if (pc) {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            await sendSignal({
              type: "webrtc:offer",
              recipient: String(data.sender).trim().toLowerCase(),
              sdp: offer
            });
          }
        }

        // 3. Call Rejected / Busy
        else if (data.type === "call:reject") {
          callSound.stop();
          clearTitleFlashing();
          setStatusMessage(
            data.reason === "busy"
              ? "User is busy on another call"
              : "Call declined"
          );
          setTimeout(() => {
            cleanupCall();
            setCallState("idle");
            setRemoteUser(null);
            setStatusMessage("");
          }, 2500);
        }

        // 4. Recipient is Offline
        else if (data.type === "call:unavailable") {
          callSound.stop();
          clearTitleFlashing();
          setStatusMessage(data.reason || "User is currently offline");
          setTimeout(() => {
            cleanupCall();
            setCallState("idle");
            setRemoteUser(null);
            setStatusMessage("");
          }, 3000);
        }

        // 5. Call Ended / Hung Up
        else if (data.type === "call:hangup") {
          callSound.stop();
          clearTitleFlashing();
          setStatusMessage("Call ended");
          setTimeout(() => {
            cleanupCall();
            setCallState("idle");
            setRemoteUser(null);
            setStatusMessage("");
          }, 1200);
        }

        // 6. WebRTC SDP Offer Received (Recipient side)
        else if (data.type === "webrtc:offer" && data.sdp) {
          const pc = pcRef.current;
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            // Process buffered ICE candidates
            while (pendingCandidatesRef.current.length > 0) {
              const candidate = pendingCandidatesRef.current.shift();
              await pc
                .addIceCandidate(new RTCIceCandidate(candidate))
                .catch(() => {});
            }

            // Create and send SDP Answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal({
              type: "webrtc:answer",
              recipient: String(data.sender).trim().toLowerCase(),
              sdp: answer
            });
          }
        }

        // 7. WebRTC SDP Answer Received (Caller side)
        else if (data.type === "webrtc:answer" && data.sdp) {
          const pc = pcRef.current;
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            // Process buffered ICE candidates
            while (pendingCandidatesRef.current.length > 0) {
              const candidate = pendingCandidatesRef.current.shift();
              await pc
                .addIceCandidate(new RTCIceCandidate(candidate))
                .catch(() => {});
            }
          }
        }

        // 8. WebRTC ICE Candidate Received
        else if (data.type === "webrtc:ice-candidate" && data.candidate) {
          const pc = pcRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc
              .addIceCandidate(new RTCIceCandidate(data.candidate))
              .catch(() => {});
          } else {
            pendingCandidatesRef.current.push(data.candidate);
          }
        }

        // 9. Peer Screen Sharing Status
        else if (data.type === "call:screen-share-status") {
          console.log(`[Pulse CallEngine] Remote screen share status: ${data.isSharing}`);
          setRemoteIsScreenSharing(Boolean(data.isSharing));
          if (data.isSharing) {
            setCallType("video");
          }
        }
      } catch (e) {
        console.warn("[Pulse CallEngine] Error processing signaling message:", e);
      }
    },
    [currentUsername, reduxUser?.username, clearTitleFlashing, cleanupCall, sendSignal]
  );

  // Connect & maintain real-time signaling (SSE stream + optional WS on localhost)
  useEffect(() => {
    if (!currentUsername) return;

    let isMounted = true;
    let ws = null;
    let sse = null;
    let pingInterval = null;
    let sseReconnectTimer = null;

    // 1. Primary Signaling Channel: Native Server-Sent Events over HTTPS
    function connectSSE() {
      if (!isMounted) return;
      try {
        console.log(`[Pulse CallEngine] Connecting SSE signaling stream for @${currentUsername}`);
        sse = new EventSource("/api/call/stream");
        sseRef.current = sse;

        sse.addEventListener("connected", () => {
          console.log(`[Pulse CallEngine] SSE signaling stream ACTIVE for @${currentUsername}`);
        });

        sse.addEventListener("signal", (event) => {
          try {
            const data = JSON.parse(event.data);
            handleSignalingMessage(data);
          } catch (e) {
            console.warn("[Pulse CallEngine] Failed to parse SSE signal:", e);
          }
        });

        sse.onerror = () => {
          if (isMounted) {
            if (sseRef.current) {
              sseRef.current.close();
              sseRef.current = null;
            }
            if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
            sseReconnectTimer = setTimeout(connectSSE, 3000);
          }
        };
      } catch (err) {
        console.warn("[Pulse CallEngine] SSE stream connection failed:", err);
      }
    }

    // 2. Secondary Channel: WebSocket ONLY when running on plain http:// (e.g. localhost dev)
    function connectSignalingWS() {
      if (!isMounted) return;
      try {
        const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
        ws = new WebSocket(`ws://${host}:3005`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log(`[Pulse CallEngine] Local WS connected, authenticating as: "${currentUsername}"`);
          ws.send(JSON.stringify({ type: "auth", username: currentUsername }));

          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            handleSignalingMessage(data);
          } catch (e) {
            console.warn("[Pulse CallEngine] Error parsing WS message:", e);
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setTimeout(connectSignalingWS, 5000);
          }
        };
      } catch (err) {
        // Ignore WS errors on dev
      }
    }

    // Start SSE stream for everyone
    connectSSE();

    // Only try WS if on insecure local HTTP
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    if (!isHttps) {
      connectSignalingWS();
    }

    return () => {
      isMounted = false;
      if (pingInterval) clearInterval(pingInterval);
      if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
      if (ws) ws.close();
      if (sse) sse.close();
    };
  }, [currentUsername, handleSignalingMessage]);

  // Initiate an Outgoing Call
  const startCall = async (targetUser, type = "video") => {
    if (!targetUser || !targetUser.username) return;
    if (callState !== "idle") {
      cleanupCall();
    }

    const targetUsername = String(targetUser.username).trim().toLowerCase();
    const callerUsername = String(
      currentUsername || reduxUser?.username || ""
    )
      .trim()
      .toLowerCase();

    setCallType(type);
    setRemoteUser(targetUser);
    setCallState("calling");
    setStatusMessage("Ringing peer...");
    setIsMinimized(false);

    callSound.playDialTone();

    // 1. Acquire local audio/video media
    const stream = await acquireLocalMedia(type);
    localStreamRef.current = stream;
    setLocalStream(stream);

    // 2. Initialize RTCPeerConnection
    const pc = createPeerConnection(targetUsername);

    // 3. Add local tracks to PeerConnection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // 4. Ensure video transceiver is ready for fast screen sharing / video upgrades
    if (type === "audio") {
      try {
        pc.addTransceiver("video", { direction: "sendrecv" });
      } catch (e) {}
    }

    // 5. Send call initiate signaling
    console.log(
      `[Pulse CallEngine] Initiating ${type} call to @${targetUsername}`
    );
    const res = await sendSignal({
      type: "call:initiate",
      recipient: targetUsername,
      callType: type,
      caller: {
        username: callerUsername,
        name: reduxUser?.name || callerUsername,
        profilePic: reduxUser?.profilePic || ""
      }
    });

    if (res?.deliveredCount === 0 && res?.recipientOnline === false) {
      setStatusMessage("Ringing... (peer may be offline)");
    }
  };

  // Accept an Incoming Call
  const acceptCall = async () => {
    callSound.stop();
    clearTitleFlashing();
    if (!remoteUser?.username) return;

    const targetUsername = String(remoteUser.username).trim().toLowerCase();
    setStatusMessage("Connecting media...");
    setCallState("calling"); // transition state while media initializes

    // 1. Acquire local media
    const stream = await acquireLocalMedia(callType);
    localStreamRef.current = stream;
    setLocalStream(stream);

    // 2. Create RTCPeerConnection
    const pc = createPeerConnection(targetUsername);

    // 3. Add local tracks to PeerConnection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // 4. Ensure video transceiver is available
    if (callType === "audio") {
      try {
        pc.addTransceiver("video", { direction: "sendrecv" });
      } catch (e) {}
    }

    // 5. Send call accept signaling to caller
    console.log(`[Pulse CallEngine] Accepted call from @${targetUsername}`);
    await sendSignal({
      type: "call:accept",
      recipient: targetUsername
    });
  };

  // Reject an Incoming Call
  const rejectCall = () => {
    callSound.stop();
    clearTitleFlashing();
    if (remoteUser?.username) {
      sendSignal({
        type: "call:reject",
        recipient: String(remoteUser.username).trim().toLowerCase(),
        reason: "declined"
      });
    }
    cleanupCall();
    setCallState("idle");
    setRemoteUser(null);
  };

  // End an Active Call
  const endCall = () => {
    callSound.stop();
    clearTitleFlashing();
    if (remoteUser?.username) {
      sendSignal({
        type: "call:hangup",
        recipient: String(remoteUser.username).trim().toLowerCase()
      });
    }
    cleanupCall();
    setCallState("idle");
    setRemoteUser(null);
    setStatusMessage("");
  };

  // Toggle Microphone (Mute / Unmute)
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  // Toggle Video Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!pcRef.current) return;

    if (isScreenSharing) {
      // Revert back to camera track
      try {
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }

        const videoSender = pcRef.current
          .getSenders()
          .find((s) => s.track?.kind === "video" || s.track === null);

        const revertTrack = originalVideoTrackRef.current;
        if (videoSender && revertTrack) {
          await videoSender.replaceTrack(revertTrack).catch(() => {});
        }

        if (localStreamRef.current && revertTrack) {
          const audioTracks = localStreamRef.current.getAudioTracks();
          const restoredStream = new MediaStream([...audioTracks, revertTrack]);
          localStreamRef.current = restoredStream;
          setLocalStream(restoredStream);
        }

        setIsScreenSharing(false);
        if (remoteUser?.username) {
          sendSignal({
            type: "call:screen-share-status",
            recipient: String(remoteUser.username).trim().toLowerCase(),
            isSharing: false
          });
        }
      } catch (err) {
        console.warn("[Pulse CallEngine] Error stopping screen share:", err);
      }
    } else {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
          alert("Screen sharing is not supported on this browser or mobile device.");
          return;
        }

        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always"
          },
          audio: false
        });

        const screenTrack = displayStream.getVideoTracks()[0];
        if (!screenTrack) return;

        if ("contentHint" in screenTrack) {
          screenTrack.contentHint = "detail";
        }
        screenTrackRef.current = screenTrack;

        const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0] || null;
        originalVideoTrackRef.current = currentVideoTrack;

        let videoSender = pcRef.current
          .getSenders()
          .find((s) => s.track?.kind === "video" || (s.dtlsTransport && !s.track));

        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          // If no video sender existed initially (e.g. started audio-only), add track and renegotiate
          if (localStreamRef.current) {
            pcRef.current.addTrack(screenTrack, localStreamRef.current);
            const offer = await pcRef.current.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true
            });
            await pcRef.current.setLocalDescription(offer);
            if (remoteUser?.username) {
              await sendSignal({
                type: "webrtc:offer",
                recipient: String(remoteUser.username).trim().toLowerCase(),
                sdp: offer
              });
            }
          }
        }

        // Update localStream with screenTrack so local preview displays the shared screen
        if (localStreamRef.current) {
          const audioTracks = localStreamRef.current.getAudioTracks();
          const screenStream = new MediaStream([...audioTracks, screenTrack]);
          localStreamRef.current = screenStream;
          setLocalStream(screenStream);
        }

        setCallType("video");
        setIsScreenSharing(true);

        if (remoteUser?.username) {
          sendSignal({
            type: "call:screen-share-status",
            recipient: String(remoteUser.username).trim().toLowerCase(),
            isSharing: true
          });
        }

        // When user stops via native browser notification bar
        screenTrack.onended = async () => {
          if (screenTrackRef.current) {
            screenTrackRef.current = null;
          }
          const revertTrack = originalVideoTrackRef.current;
          if (videoSender && revertTrack) {
            await videoSender.replaceTrack(revertTrack).catch(() => {});
          }
          if (localStreamRef.current && revertTrack) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            const restoredStream = new MediaStream([...audioTracks, revertTrack]);
            localStreamRef.current = restoredStream;
            setLocalStream(restoredStream);
          }
          setIsScreenSharing(false);
          if (remoteUser?.username) {
            sendSignal({
              type: "call:screen-share-status",
              recipient: String(remoteUser.username).trim().toLowerCase(),
              isSharing: false
            });
          }
        };
      } catch (err) {
        console.warn("[Pulse CallEngine] Screen sharing failed or cancelled:", err);
      }
    }
  };

  // Toggle Window Minimize
  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        callType,
        remoteUser,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        isScreenSharing,
        remoteIsScreenSharing,
        isMinimized,
        duration: formatDuration(durationSeconds),
        statusMessage,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleScreenShare,
        toggleMinimize
      }}
    >
      {children}

      {/* Global Incoming Call Alert (Modal & High-Priority Top Toast) */}
      {callState === "incoming" && (
        <IncomingCallModal
          caller={remoteUser}
          callType={callType}
          onAccept={acceptCall}
          onDecline={rejectCall}
        />
      )}

      {/* Global Active / Outgoing Call Window */}
      {(callState === "calling" || callState === "connected") && (
        <ActiveCallModal
          callState={callState}
          callType={callType}
          remoteUser={remoteUser}
          localStream={localStream}
          remoteStream={remoteStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          remoteIsScreenSharing={remoteIsScreenSharing}
          isMinimized={isMinimized}
          duration={formatDuration(durationSeconds)}
          statusMessage={statusMessage}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleMinimize={toggleMinimize}
          onEndCall={endCall}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
