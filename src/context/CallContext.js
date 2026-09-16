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
    { urls: "stun:stun3.l.google.com:19302" }
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

    const playBeep = () => {
      try {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } catch (e) {}
    };

    playBeep();
    this.interval = setInterval(playBeep, 2800);
  }

  playIncomingRing() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playRing = () => {
      try {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.6);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 1.6);
        osc2.stop(ctx.currentTime + 1.6);
      } catch (e) {}
    };

    playRing();
    this.interval = setInterval(playRing, 3200);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

const callSound = new CallSoundSynthesizer();

// Creates a synthetic media stream when physical camera/mic is absent (or in automated environments)
function createSyntheticMediaStream(withVideo = true) {
  const tracks = [];

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.001; // nearly silent baseline
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) tracks.push(audioTrack);
    }
  } catch (e) {
    console.warn("Could not create synthetic audio:", e);
  }

  if (withVideo && typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      let frame = 0;

      const draw = () => {
        frame++;
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, 640, 480);

        // Animated gradient background orb
        const grad = ctx.createRadialGradient(
          320 + Math.sin(frame * 0.05) * 40,
          240 + Math.cos(frame * 0.05) * 30,
          20,
          320,
          240,
          200
        );
        grad.addColorStop(0, "#8b5cf6");
        grad.addColorStop(0.6, "#4f46e5");
        grad.addColorStop(1, "#090d16");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(320, 240, 90 + Math.sin(frame * 0.08) * 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("Pulse Live Stream", 320, 248);

        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText("WebRTC High Definition", 320, 276);
      };

      const animInterval = setInterval(draw, 50);
      const canvasStream = canvas.captureStream(24);
      const videoTrack = canvasStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener("ended", () => clearInterval(animInterval));
        tracks.push(videoTrack);
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // References
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const timerRef = useRef(null);
  const titleIntervalRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
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

    pendingCandidatesRef.current = [];
    originalVideoTrackRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
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

  // Safe media acquisition
  const acquireLocalMedia = useCallback(async (type) => {
    const needVideo = type === "video";
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: needVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        });
        return stream;
      }
    } catch (err) {
      console.warn("Physical camera/mic not available, using synthetic media stream fallback:", err.message);
    }
    return createSyntheticMediaStream(needVideo);
  }, []);

  // Initialize RTCPeerConnection
  const createPeerConnection = useCallback((targetUsername) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "webrtc:ice-candidate",
            recipient: String(targetUsername).trim().toLowerCase(),
            candidate: event.candidate
          })
        );
      }
    };

    // Receive remote tracks
    pc.ontrack = (event) => {
      let stream = null;
      if (event.streams && event.streams[0]) {
        stream = event.streams[0];
      } else {
        stream = new MediaStream();
        stream.addTrack(event.track);
      }
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        callSound.stop();
        clearTitleFlashing();
        setCallState("connected");
        setStatusMessage("");
        startTimer();
      }
    };

    return pc;
  }, [startTimer, clearTitleFlashing]);

  // Connect & maintain WebSocket for signaling
  useEffect(() => {
    if (!currentUsername) return;

    let isMounted = true;
    let ws = null;
    let pingInterval = null;

    function connectSignalingWS() {
      if (!isMounted) return;
      try {
        const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
        ws = new WebSocket(`ws://${host}:3005`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log(`[Pulse CallEngine] Connected to signaling server, authenticating as: "${currentUsername}"`);
          // Authenticate username on socket
          ws.send(JSON.stringify({ type: "auth", username: currentUsername }));

          // Keep alive ping
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);

            // 1. Incoming Call Request
            if (data.type === "call:initiate") {
              const incomingCaller = data.caller || { username: data.sender };
              console.log(`[Pulse CallEngine] Received incoming call from @${incomingCaller.username}`);

              // If already in an active call, notify caller busy
              if (callStateRef.current !== "idle") {
                ws.send(
                  JSON.stringify({
                    type: "call:reject",
                    recipient: String(data.sender).trim().toLowerCase(),
                    reason: "busy"
                  })
                );
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

              // Caller initiates SDP Offer
              const pc = pcRef.current;
              if (pc) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(
                  JSON.stringify({
                    type: "webrtc:offer",
                    recipient: String(data.sender).trim().toLowerCase(),
                    sdp: offer
                  })
                );
              }
            }

            // 3. Call Rejected / Busy
            else if (data.type === "call:reject") {
              callSound.stop();
              clearTitleFlashing();
              setStatusMessage(
                data.reason === "busy" ? "User is busy on another call" : "Call declined"
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
                  await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                }

                // Create and send SDP Answer
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                ws.send(
                  JSON.stringify({
                    type: "webrtc:answer",
                    recipient: String(data.sender).trim().toLowerCase(),
                    sdp: answer
                  })
                );
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
                  await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
                }
              }
            }

            // 8. WebRTC ICE Candidate Received
            else if (data.type === "webrtc:ice-candidate" && data.candidate) {
              const pc = pcRef.current;
              if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
              } else {
                pendingCandidatesRef.current.push(data.candidate);
              }
            }
          } catch (e) {
            console.warn("Error processing signaling message:", e);
          }
        };

        ws.onclose = () => {
          if (isMounted) {
            setTimeout(connectSignalingWS, 3000);
          }
        };
      } catch (err) {
        console.warn("WebSocket signaling error:", err);
      }
    }

    connectSignalingWS();

    return () => {
      isMounted = false;
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, [currentUsername, clearTitleFlashing, cleanupCall]);

  // Initiate an Outgoing Call
  const startCall = async (targetUser, type = "video") => {
    if (!targetUser || !targetUser.username) return;
    if (callState !== "idle") {
      cleanupCall();
    }

    const targetUsername = String(targetUser.username).trim().toLowerCase();
    const callerUsername = String(currentUsername || reduxUser?.username || "").trim().toLowerCase();

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

    // 4. Send call initiate signaling
    const sendInitiate = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log(`[Pulse CallEngine] Initiating ${type} call to @${targetUsername}`);
        wsRef.current.send(
          JSON.stringify({
            type: "call:initiate",
            recipient: targetUsername,
            sender: callerUsername,
            callType: type,
            caller: {
              username: callerUsername,
              name: reduxUser?.name || callerUsername,
              profilePic: reduxUser?.profilePic || ""
            }
          })
        );
      } else {
        setStatusMessage("Connecting to signaling...");
        setTimeout(sendInitiate, 1000);
      }
    };

    sendInitiate();
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

    // 4. Send call accept signaling to caller
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`[Pulse CallEngine] Accepted call from @${targetUsername}`);
      wsRef.current.send(
        JSON.stringify({
          type: "call:accept",
          recipient: targetUsername,
          sender: String(currentUsername || reduxUser?.username || "").trim().toLowerCase()
        })
      );
    }
  };

  // Reject an Incoming Call
  const rejectCall = () => {
    callSound.stop();
    clearTitleFlashing();
    if (remoteUser?.username && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call:reject",
          recipient: String(remoteUser.username).trim().toLowerCase(),
          reason: "declined"
        })
      );
    }
    cleanupCall();
    setCallState("idle");
    setRemoteUser(null);
  };

  // End an Active Call
  const endCall = () => {
    callSound.stop();
    clearTitleFlashing();
    if (remoteUser?.username && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call:hangup",
          recipient: String(remoteUser.username).trim().toLowerCase()
        })
      );
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
    if (!pcRef.current || !localStreamRef.current) return;

    if (isScreenSharing) {
      // Revert back to camera track
      if (originalVideoTrackRef.current) {
        const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(originalVideoTrackRef.current);
        }
        setIsScreenSharing(false);
      }
    } else {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = displayStream.getVideoTracks()[0];

          if (screenTrack) {
            const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
            originalVideoTrackRef.current = currentVideoTrack;

            const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
            if (videoSender) {
              await videoSender.replaceTrack(screenTrack);
            }

            screenTrack.onended = () => {
              if (originalVideoTrackRef.current && videoSender) {
                videoSender.replaceTrack(originalVideoTrackRef.current);
              }
              setIsScreenSharing(false);
            };

            setIsScreenSharing(true);
          }
        }
      } catch (err) {
        console.warn("Screen share cancelled or failed:", err);
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
