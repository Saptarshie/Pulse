"use client";

import React, { useEffect, useState } from "react";
import { PhoneIcon, PhoneXMarkIcon, VideoCameraIcon } from "@heroicons/react/24/solid";

export default function IncomingCallModal({
  caller,
  callType = "video",
  onAccept,
  onDecline
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(45);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDecline]);

  if (!caller) return null;

  const isVideo = callType === "video";

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in select-none">
      {/* 1. TOP HIGH-PRIORITY FLOATING NOTIFICATION BANNER */}
      <div className="fixed top-5 inset-x-4 sm:inset-x-auto sm:w-[480px] z-50 flex items-center justify-between p-3.5 rounded-2xl border border-white/20 bg-slate-900/95 shadow-2xl backdrop-blur-2xl text-white animate-bounce-short">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-purple-400">
            {caller.profilePic ? (
              <img
                src={caller.profilePic}
                alt={caller.name || caller.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-bold text-white">
                {(caller.name || caller.username || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-slate-900 animate-ping" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {caller.name || caller.username}
            </p>
            <p className="text-[11px] text-purple-300 truncate">
              Incoming {isVideo ? "Video" : "Voice"} Call... ({secondsRemaining}s)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 pl-2">
          <button
            onClick={onDecline}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer"
            title="Decline"
          >
            <PhoneXMarkIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onAccept}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/30 transition-all cursor-pointer"
            title="Accept"
          >
            {isVideo ? <VideoCameraIcon className="h-4 w-4" /> : <PhoneIcon className="h-4 w-4" />}
            <span>Accept</span>
          </button>
        </div>
      </div>

      {/* 2. CENTER HIGH-IMPACT MODAL CARD */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 bg-slate-900/95 p-7 text-center text-white shadow-2xl backdrop-blur-2xl">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-600/30 blur-3xl pointer-events-none" />

        {/* Pulsing Avatar Area */}
        <div className="relative mx-auto my-6 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-purple-500/20 duration-1000" />
          <div className="absolute -inset-3 animate-pulse rounded-full bg-indigo-500/20" />
          
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-3 border-purple-400 shadow-2xl shadow-purple-500/40">
            {caller.profilePic ? (
              <img
                src={caller.profilePic}
                alt={caller.name || caller.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-600 text-3xl font-black text-white">
                {(caller.name || caller.username || "U").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Caller Info */}
        <div className="space-y-1.5">
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            {caller.name || caller.username}
          </h3>
          <p className="text-xs font-semibold text-purple-300">
            @{caller.username}
          </p>
          <div className="inline-flex items-center space-x-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium text-slate-200 mt-2">
            {isVideo ? (
              <>
                <VideoCameraIcon className="h-4 w-4 text-purple-400" />
                <span>Incoming Video Call...</span>
              </>
            ) : (
              <>
                <PhoneIcon className="h-4 w-4 text-emerald-400" />
                <span>Incoming Audio Call...</span>
              </>
            )}
          </div>
        </div>

        {/* Audio Visualizer Waves */}
        <div className="flex items-center justify-center space-x-1.5 my-5">
          <span className="h-3 w-1 rounded-full bg-purple-500 animate-pulse" />
          <span className="h-6 w-1 rounded-full bg-indigo-400 animate-bounce delay-75" />
          <span className="h-9 w-1 rounded-full bg-pink-500 animate-pulse delay-150" />
          <span className="h-5 w-1 rounded-full bg-purple-400 animate-bounce delay-100" />
          <span className="h-2 w-1 rounded-full bg-indigo-500 animate-pulse delay-200" />
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-center space-x-10">
          {/* Decline Button */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={onDecline}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/40 transition-all hover:bg-rose-600 hover:scale-105 active:scale-95 cursor-pointer"
              title="Decline Call"
            >
              <PhoneXMarkIcon className="h-7 w-7" />
            </button>
            <span className="text-xs font-semibold text-slate-400">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center space-y-1.5">
            <button
              onClick={onAccept}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40 transition-all hover:bg-emerald-600 hover:scale-105 active:scale-95 cursor-pointer animate-bounce"
              title="Accept Call"
            >
              {isVideo ? (
                <VideoCameraIcon className="h-7 w-7" />
              ) : (
                <PhoneIcon className="h-7 w-7" />
              )}
            </button>
            <span className="text-xs font-bold text-emerald-400">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
