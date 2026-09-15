"use client";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { fetchUserAction } from "@/action";

export default function ProfileRedirect() {
  const router = useRouter();
  const reduxUser = useSelector((state) => state.userslice);

  useEffect(() => {
    async function checkUser() {
      if (reduxUser?.username) {
        router.replace(`/profile/${reduxUser.username}`);
        return;
      }
      try {
        const res = await fetchUserAction();
        if (res?.success && res.user?.username) {
          router.replace(`/profile/${res.user.username}`);
        } else {
          router.replace("/authenticate/sign-in");
        }
      } catch {
        router.replace("/authenticate/sign-in");
      }
    }
    checkUser();
  }, [reduxUser?.username, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600" />
    </div>
  );
}
