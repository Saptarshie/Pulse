"use client";

import React, { useEffect, useRef } from "react";
import {
  PhoneXMarkIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  ComputerDesktopIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  SpeakerWaveIcon
} from "@heroicons/react/24/solid";

export default function ActiveCallModal({
  callState,
  callType,
  remoteUser,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  isScreenSharing,
  isMinimized,
  duration,
  statusMessage,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleMinimize,
  onEndCall
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff, isMinimized]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isMinimized]);

  // Always attach remote stream to audio element so voice is heard in audio/video/minimized calls
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  if (callState === "idle" || callState === "incoming") return null;

  const isAudioCall = callType === "audio";
  const isCalling = callState === "calling";
  const isConnected = callState === "connected";

  // Minimized Floating Widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] flex items-center space-x-3 rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-xl animate-fade-in text-white select-none">
        {/* Hidden Audio Player so voice continues streaming while reading/browsing */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        {/* Pulsing indicator */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping" />
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-purple-400">
            {remoteUser?.profilePic ? (
              <img
                src={remoteUser.profilePic}
                alt={remoteUser.name || remoteUser.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-purple-600 text-xs font-bold text-white">
                {(remoteUser?.name || remoteUser?.username || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 pr-1">
          <p className="text-xs font-bold text-white truncate max-w-[120px]">
            {remoteUser?.name || remoteUser?.username}
          </p>
          <div className="flex items-center space-x-1 text-[11px] text-purple-300 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isCalling ? "Calling..." : duration}</span>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center space-x-1.5 pl-2 border-l border-white/10">
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              isMuted ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30" : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            <MicrophoneIcon className="h-4 w-4" />
          </button>

          <button
            onClick={onToggleMinimize}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition-colors cursor-pointer"
            title="Expand Call"
          >
            <ArrowsPointingOutIcon className="h-4 w-4" />
          </button>

          <button
            onClick={onEndCall}
            className="p-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs transition-colors cursor-pointer"
            title="End Call"
          >
            <PhoneXMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Full Call Window Overlay
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
      {/* Hidden Audio Player ensuring remote stream is audible in all scenarios */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <div className="relative flex flex-col h-full max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-slate-900/95 shadow-2xl backdrop-blur-2xl">
        {/* Top Header Bar */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-purple-400/60">
              {remoteUser?.profilePic ? (
                <img
                  src={remoteUser.profilePic}
                  alt={remoteUser.name || remoteUser.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-bold text-white">
                  {(remoteUser?.name || remoteUser?.username || "U").slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  {remoteUser?.name || remoteUser?.username}
                </h3>
                <span className="text-xs text-purple-300">@{remoteUser?.username}</span>
              </div>
              <div className="flex items-center space-x-2 mt-0.5 text-xs text-slate-300">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold">
                  {isCalling ? statusMessage || "Calling..." : duration}
                </span>
                {isAudioCall && (
                  <span className="text-[10px] rounded-full bg-purple-500/20 text-purple-300 px-2 py-0.5 font-medium">
                    Voice Call
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleMinimize}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Minimize call to floating widget"
            >
              <ArrowsPointingInIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media Stream Stage */}
        <div className="relative flex-1 w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Audio Call or Remote Camera Off: Waveform Visualizer */}
          {isAudioCall || !isConnected ? (
            <div className="flex flex-col items-center justify-center space-y-6 text-center z-10 px-4">
              <div className="relative flex items-center justify-center">
                {/* Concentric pulsing rings */}
                <div className="absolute h-48 w-48 rounded-full border border-purple-500/30 animate-ping duration-1000" />
                <div className="absolute h-64 w-64 rounded-full border border-indigo-500/20 animate-pulse" />
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-purple-500/50 shadow-2xl shadow-purple-500/40">
                  {remoteUser?.profilePic ? (
                    <img
                      src={remoteUser.profilePic}
                      alt={remoteUser.name || remoteUser.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-600 text-3xl font-black text-white">
                      {(remoteUser?.name || remoteUser?.username || "U").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <p className="text-xl font-extrabold text-white">
                  {remoteUser?.name || remoteUser?.username}
                </p>
                <p className="text-xs text-purple-300">
                  {isCalling ? statusMessage || "Ringing peer..." : "Pulse Audio Stream Connected"}
                </p>
                
                {/* Audio equalizer animation bars */}
                <div className="flex items-center justify-center space-x-1.5 pt-2">
                  <span className="h-4 w-1 rounded-full bg-purple-500 animate-pulse" />
                  <span className="h-7 w-1 rounded-full bg-indigo-400 animate-bounce delay-75" />
                  <span className="h-10 w-1 rounded-full bg-pink-500 animate-pulse delay-150" />
                  <span className="h-6 w-1 rounded-full bg-purple-400 animate-bounce delay-100" />
                  <span className="h-3 w-1 rounded-full bg-indigo-500 animate-pulse delay-200" />
                </div>
              </div>
            </div>
          ) : (
            /* Video Call Remote Stream */
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          )}

          {/* Local Picture-in-Picture Preview (For Video Calls) */}
          {!isAudioCall && (
            <div className="absolute bottom-24 right-4 z-20 h-36 w-48 sm:h-44 sm:w-60 overflow-hidden rounded-2xl border-2 border-white/20 bg-slate-900 shadow-2xl backdrop-blur-md">
              {isVideoOff ? (
                <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900/90 text-slate-400 text-xs">
                  <VideoCameraIcon className="h-6 w-6 mb-1 text-slate-500" />
                  <span>Camera Off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                />
              )}
              <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                You
              </span>
            </div>
          )}
        </div>

        {/* Floating Bottom Control Bar */}
        <div className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-center p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent">
          <div className="flex items-center space-x-4 rounded-3xl border border-white/10 bg-slate-900/80 px-6 py-3 shadow-2xl backdrop-blur-xl">
            {/* Microphone Toggle */}
            <button
              onClick={onToggleMute}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all cursor-pointer ${
                isMuted
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              <MicrophoneIcon className="h-5 w-5" />
            </button>

            {/* Video Camera Toggle (If not audio-only) */}
            {!isAudioCall && (
              <button
                onClick={onToggleVideo}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all cursor-pointer ${
                  isVideoOff
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                <VideoCameraIcon className="h-5 w-5" />
              </button>
            )}

            {/* Screen Sharing Toggle */}
            {!isAudioCall && (
              <button
                onClick={onToggleScreenShare}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all cursor-pointer ${
                  isScreenSharing
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
              >
                <ComputerDesktopIcon className="h-5 w-5" />
              </button>
            )}

            {/* Minimize to Floating Window Toggle */}
            <button
              onClick={onToggleMinimize}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Minimize call to floating widget"
            >
              <ArrowsPointingInIcon className="h-5 w-5" />
            </button>

            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="flex h-12 px-6 items-center justify-center space-x-2 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 transition-all active:scale-95 cursor-pointer font-bold text-xs"
              title="End Call"
            >
              <PhoneXMarkIcon className="h-5 w-5" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
