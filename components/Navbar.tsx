"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { HiHome, HiSearch, HiChat, HiUser, HiLogout } from "react-icons/hi";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Navbar() {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

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

  const navItems = [
    { href: "/home", label: "Home", icon: HiHome },
    { href: "/explore", label: "Explore", icon: HiSearch },
    { href: "/messages", label: "Messages", icon: HiChat },
    { href: "/profile", label: "Profile", icon: HiUser },
  ];

  return (
    <>
      {/* Desktop/Tablet Navbar */}
      <nav className="hidden md:block sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link 
              href="/home" 
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
            href="/home" 
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

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
