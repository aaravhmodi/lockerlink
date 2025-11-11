"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Sparkles, Users, Trophy, Star } from "lucide-react";

const ROLE_OPTIONS = [
  {
    type: "athlete" as const,
    title: "I'm an Athlete",
    subtitle: "Build your profile, share highlights, and get noticed.",
    accent: "from-sky-100 via-white to-indigo-100",
    icon: Trophy,
    welcome: "Welcome to the LockerLink squad. Let's make waves this season!",
  },
  {
    type: "coach" as const,
    title: "I'm a Coach",
    subtitle: "Scout talent, share guidance, and support athlete growth.",
    accent: "from-emerald-100 via-white to-amber-100",
    icon: Users,
    welcome: "Welcome to the LockerLink bench. Time to lead the next generation!",
  },
] as const;

export default function RoleSelectPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<"athlete" | "coach" | "">("");
  const [displayName, setDisplayName] = useState<string>("");
  const [loadingRole, setLoadingRole] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"athlete" | "coach" | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      setLoadingRole(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          const userType = data?.userType as "athlete" | "coach" | undefined;
          if (userType) {
            setCurrentRole(userType);
            router.replace("/profile");
            return;
          }
          setDisplayName((data?.name as string) || user.displayName || "LockerLink Player");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchRole();
  }, [user, router]);

  const handleSelect = async (role: "athlete" | "coach") => {
    if (!user || saving) return;
    setSaving(true);
    setSelectedRole(role);
    setWelcomeMessage("");

    try {
      const update: Record<string, any> = {
        userType: role,
      };

      if (role === "coach") {
        Object.assign(update, {
          height: "",
          vertical: "",
          weight: "",
          ageGroup: "",
          birthMonth: "",
          birthYear: "",
          position: "",
          secondaryPosition: "",
          blockTouch: "",
          standingTouch: "",
          spikeTouch: "",
        });
      }

      await setDoc(doc(db, "users", user.uid), update, { merge: true });

      const persona = ROLE_OPTIONS.find((option) => option.type === role);
      if (persona) {
        setWelcomeMessage(persona.welcome);
      }

      setTimeout(() => {
        router.push("/profile");
      }, 1500);
    } catch (error) {
      console.error("Error setting user role:", error);
      setSaving(false);
      setSelectedRole(null);
    }
  };

  if (loading || loadingRole || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-slate-50 to-slate-100">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-white to-[#F0FDFA] px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl rounded-3xl bg-white/80 shadow-xl border border-white/60 backdrop-blur p-8 sm:p-12 space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="w-4 h-4" />
            LockerLink Setup
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[#0F172A]">
            Hey {displayName.split(" ")[0] || "there"}, who’s logging in?
          </h1>
          <p className="text-[#475569] text-sm sm:text-base">
            Pick the experience that matches you. We’ll tailor LockerLink so you see the right tools from the first touch.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {ROLE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRole === option.type;

            return (
              <motion.button
                key={option.type}
                onClick={() => handleSelect(option.type)}
                whileHover={{ scale: saving ? 1 : 1.03 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                disabled={saving}
                className={`relative overflow-hidden rounded-3xl border-2 px-6 py-8 text-left transition-all ${
                  isSelected
                    ? "border-[#007AFF] shadow-xl"
                    : "border-transparent hover:border-[#007AFF]/30 hover:shadow-lg"
                } bg-gradient-to-br ${option.accent}`}
              >
                <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
                <div className="space-y-4 relative">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[#007AFF] shadow-sm">
                    <Icon className="w-5 h-5" />
                    {option.type === "athlete" ? "Athlete Mode" : "Coach Mode"}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[#0F172A]">{option.title}</h2>
                    <p className="mt-2 text-sm text-[#475569] leading-relaxed">{option.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#007AFF]">
                    <Star className="w-4 h-4" />
                    {saving && isSelected ? "Setting things up..." : "Let’s go"}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {welcomeMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-6 py-4 text-center text-[#1D4ED8] text-sm sm:text-base font-medium"
          >
            {welcomeMessage}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

