"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import Navbar from "@/components/Navbar";
import ProfileForm from "@/components/ProfileForm";

export default function ProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black">Create Your Profile</h1>
          <p className="text-gray-900 mt-1 font-medium">Fill in your information to get started</p>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <ProfileForm />
        </div>
      </div>
    </div>
  );
}

