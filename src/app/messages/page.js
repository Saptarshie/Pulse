"use client";
import { useState, useEffect } from "react";
import DirectMessageDrawer from "@/components/direct-messages";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ArrowLeftIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export default function MessagesPage() {
  const router = useRouter();
  const currentUser = useSelector((state) => state.userslice);
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen pt-16 bg-[#f4f7f5]">
      <DirectMessageDrawer isOpen={true} onClose={handleClose} />
    </div>
  );
}
