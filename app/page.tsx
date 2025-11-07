"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useState } from "react";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const { user, loading } = useUser();
  const { isComplete, loading: profileLoading } = useProfileComplete();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !profileLoading && user) {
      if (!isComplete) {
        router.push("/profile");
      } else {
        router.push("/home");
      }
    }
  }, [user, loading, profileLoading, isComplete, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Automatically create user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: user.email?.split("@")[0] || "New User",
          email: user.email,
          team: "",
          age: 17,
          city: "",
          position: "",
          sport: "Volleyball",
          bio: "",
          photoURL: "",
          createdAt: Math.floor(Date.now() / 1000),
        });

        console.log("User profile created automatically:", user.uid);
        router.push("/profile");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // Profile check will redirect via useEffect
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Check if user profile exists, create if not
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        // Automatically create user profile
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: user.displayName || "New User",
          email: user.email,
          photoURL: user.photoURL || "",
          team: "",
          age: 17,
          city: "",
          position: "",
          sport: "Volleyball",
          bio: "",
          createdAt: Math.floor(Date.now() / 1000),
        });
        console.log("User profile created automatically:", user.uid);
        router.push("/profile");
      } else {
        // Profile check will redirect via useEffect
      }
    } catch (err: any) {
      setError(err.message || "Google authentication failed");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-xl sm:rounded-2xl bg-white p-6 sm:p-8 shadow-lg"
      >
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-[#111827]">LockerLink</h1>
          <p className="text-[#6B7280]">Connect with OVA volleyball players</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-4 text-sm text-[#DC2626]"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#111827]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              placeholder="name@example.com"
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#111827]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-xl bg-[#007AFF] px-4 py-3.5 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] active:scale-95 touch-manipulation min-h-[44px]"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </motion.button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-[#E5E7EB]"></div>
          <span className="px-4 text-sm text-[#9CA3AF]">or</span>
          <div className="flex-1 border-t border-[#E5E7EB]"></div>
        </div>

        <motion.button
          onClick={handleGoogleAuth}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3.5 text-[#111827] font-medium transition-all duration-200 hover:bg-[#F9FAFB] hover:shadow-sm active:scale-95 touch-manipulation min-h-[44px]"
        >
          <FcGoogle className="w-5 h-5" />
          Continue with Google
        </motion.button>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-[#007AFF] hover:text-[#0056CC] transition-colors"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
