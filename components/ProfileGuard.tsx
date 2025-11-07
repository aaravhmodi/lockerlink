"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useProfileComplete } from "@/hooks/useProfileComplete";

interface ProfileGuardProps {
  children: React.ReactNode;
}

export default function ProfileGuard({ children }: ProfileGuardProps) {
  const { user, loading: userLoading } = useUser();
  const { isComplete, loading: profileLoading } = useProfileComplete();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !profileLoading) {
      if (!user) {
        router.push("/");
        return;
      }
      
      if (!isComplete) {
        router.push("/profile");
        return;
      }
    }
  }, [user, userLoading, isComplete, profileLoading, router]);

  if (userLoading || profileLoading || !user || !isComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="mb-4">
            <svg className="animate-spin h-8 w-8 text-[#007AFF] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

