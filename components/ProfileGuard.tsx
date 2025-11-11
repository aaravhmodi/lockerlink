"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProfileGuardProps {
  children: React.ReactNode;
}

export default function ProfileGuard({ children }: ProfileGuardProps) {
  const { user, loading: userLoading } = useUser();
  const { isComplete, loading: profileLoading } = useProfileComplete();
  const router = useRouter();
  const [userType, setUserType] = useState<"athlete" | "coach" | "admin" | "">("");

  useEffect(() => {
    if (!userLoading && !profileLoading) {
      if (!user) {
        router.push("/");
        return;
      }
      
      if (!isComplete) {
        return;
      }
    }
  }, [user, userLoading, isComplete, profileLoading, router]);

  useEffect(() => {
    if (!user) {
      setUserType("");
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        const data = snapshot.data();
        setUserType((data?.userType as "athlete" | "coach" | "admin") || "");
      },
      () => setUserType("")
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!userLoading && !profileLoading && user && !userType) {
      router.push("/role");
    }
  }, [user, userLoading, profileLoading, userType, router]);

  if (userLoading || profileLoading || !user) {
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

  if (!userType) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-6 shadow-lg border border-[#E5E7EB] text-center">
          <svg className="mx-auto mb-4 h-10 w-10 text-[#007AFF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852L11.75 15m.75 4.5h-.008v.008H12v-.008zm9-7.5a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-[#111827] mb-2">Choose Your Role</h2>
          <p className="text-[#6B7280] mb-4">
            Let us know if you’re an athlete or coach to personalize your LockerLink experience.
          </p>
          <button
            onClick={() => router.push("/role")}
            className="w-full rounded-xl bg-[#007AFF] px-4 py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC]"
          >
            Select Role
          </button>
        </div>
      </div>
    );
  }

  if (!isComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-6 shadow-lg border border-[#E5E7EB] text-center">
          <svg className="mx-auto mb-4 h-10 w-10 text-[#007AFF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852L11.75 15m.75 4.5h-.008v.008H12v-.008zm9-7.5a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-[#111827] mb-2">Complete Your Profile</h2>
          <p className="text-[#6B7280] mb-4">
            Finish setting up your profile and upload a highlight to unlock Explore, Match, Messages, and Highlights.
          </p>
          <button
            onClick={() => router.push("/profile")}
            className="w-full rounded-xl bg-[#007AFF] px-4 py-3 text-white font-medium transition-all duration-200 hover:bg-[#0056CC]"
          >
            Go to Profile Setup
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

