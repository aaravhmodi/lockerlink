"use client";

import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { user, loading } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <nav className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="text-xl font-bold text-gray-900">LockerLink</div>
          </div>
        </div>
      </nav>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/home" className="text-xl font-bold text-gray-900 hover:text-gray-700">
            LockerLink
          </Link>
          
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/explore"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/messages"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Messages
            </Link>
            <Link
              href="/profile"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Profile
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

