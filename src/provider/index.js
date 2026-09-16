'use client';
import { Provider } from "react-redux";
import React from 'react';
import { store } from "@/store";
import Navbar from "@/components/navbar";
import { CallProvider } from "@/context/CallContext";

export default function ReduxProvider({ children }) {
  return (
    <Provider store={store}>
      <CallProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <div className="h-16" />
          <main className="flex-1 w-full">
            {children}
          </main>
        </div>
      </CallProvider>
    </Provider>
  );
}