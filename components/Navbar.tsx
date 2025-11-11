"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { useProfileComplete } from "@/hooks/useProfileComplete";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { HiHome, HiSearch, HiChat, HiUser, HiLogout, HiInformationCircle } from "react-icons/hi";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { doc, onSnapshot } from "firebase/firestore";

export default function Navbar() {
  const { user, loading } = useUser();
  const { isComplete, loading: profileLoading } = useProfileComplete();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileReminder, setShowProfileReminder] = useState(false);
  const [userType, setUserType] = useState<"athlete" | "coach" | "">("");
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerProfileReminder = () => {
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
    }

    setShowProfileReminder(true);
    reminderTimeoutRef.current = setTimeout(() => {
      setShowProfileReminder(false);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUserType("");
      return;
    }

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        const data = snapshot.data();
        setUserType((data?.userType as "athlete" | "coach") || "athlete");
      },
      () => {
        setUserType("athlete");
      }
    );

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (isComplete) {
      setShowProfileReminder(false);
    }
  }, [isComplete]);

  const handleProtectedNavigation = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isCoach && href === "/messages") {
      event.preventDefault();
      router.push("/explore");
      setShowMenu(false);
      return;
    }

    if (!profileLoading && !isComplete && href !== "/profile") {
      event.preventDefault();
      triggerProfileReminder();
      setShowMenu(false);
      router.push("/profile");
    }
  };

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
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <div className="text-lg sm:text-xl font-semibold text-[#111827]">LockerLink</div>
          </div>
        </div>
      </nav>
    );
  }

  if (!user) {
    return null;
  }

  const isCoach = userType === "coach";
  const navItems = isCoach
    ? [
        { href: "/home", label: "Home", icon: HiHome },
        { href: "/explore", label: "Explore", icon: HiSearch },
        { href: "/coach", label: "Coach", icon: HiInformationCircle },
        { href: "/profile", label: "Profile", icon: HiUser },
      ]
    : [
        { href: "/home", label: "Home", icon: HiHome },
        { href: "/explore", label: "Explore", icon: HiSearch },
        { href: "/messages", label: "Messages", icon: HiChat },
        { href: "/profile", label: "Profile", icon: HiUser },
      ];

  const primaryRoute = "/home";

  return (
    <>
      {/* Desktop/Tablet Navbar */}
      <nav className="hidden md:block sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link 
              href={primaryRoute} 
              onClick={(event) => handleProtectedNavigation(event, primaryRoute)}
              className="text-xl font-semibold text-[#111827] hover:opacity-80 transition-opacity"
            >
              LockerLink
            </Link>
            
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(event) => handleProtectedNavigation(event, item.href)}
                    className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-[#F3F4F6]"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden lg:inline">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF] rounded-full"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
              
              <button
                onClick={handleSignOut}
                className="ml-4 px-4 py-2 text-sm font-medium text-[#FF3B30] rounded-xl hover:bg-[#F3F4F6] transition-all duration-200"
              >
                <span className="hidden lg:inline">Sign Out</span>
                <HiLogout className="w-5 h-5 lg:hidden" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-[#E5E7EB] safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleProtectedNavigation(event, item.href)}
                className="relative flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 touch-manipulation"
              >
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-[#007AFF]' : 'text-[#6B7280]'}`} />
                <span className={`text-xs font-medium ${isActive ? 'text-[#007AFF]' : 'text-[#6B7280]'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveIndicator"
                    className="absolute top-0 left-0 right-0 h-1 bg-[#007AFF] rounded-b-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]">
        <div className="flex h-14 items-center justify-between px-4">
          <Link 
            href={primaryRoute} 
            onClick={(event) => handleProtectedNavigation(event, primaryRoute)}
            className="text-lg font-semibold text-[#111827]"
          >
            LockerLink
          </Link>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <svg className="w-6 h-6 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-[#E5E7EB] bg-white"
          >
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 text-left text-[#FF3B30] font-medium flex items-center gap-2"
            >
              <HiLogout className="w-5 h-5" />
              Sign Out
            </button>
          </motion.div>
        )}
      </div>

      {/* Profile completion reminder */}
      {!profileLoading && !isComplete && showProfileReminder && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed left-1/2 z-[60] -translate-x-1/2 top-16 md:top-20 px-4"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-[#0F172A] text-white px-4 py-3 shadow-2xl border border-[#1E293B]/40">
            <HiInformationCircle className="h-5 w-5 text-[#60A5FA]" />
            <div className="text-sm font-medium">
              Complete your profile to unlock the rest of LockerLink.
            </div>
            <button
              onClick={() => {
                setShowProfileReminder(false);
                setShowMenu(false);
                router.push("/profile");
              }}
              className="ml-2 rounded-xl bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-white/25 transition-colors"
            >
              Complete now
            </button>
          </div>
        </motion.div>
      )}

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
