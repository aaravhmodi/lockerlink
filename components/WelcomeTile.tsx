"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Users, Sparkles, Play, MessageCircle, Upload, Search, Heart, Zap, Award, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

interface WelcomeTileProps {
  userType: "athlete" | "coach" | "admin" | "mentor";
  adminRole?: "parent" | "clubAdmin" | "";
  onClose?: () => void;
}

export default function WelcomeTile({ userType, adminRole, onClose }: WelcomeTileProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if tile has been dismissed
    const dismissedKey = `welcomeTileDismissed_${userType}_${adminRole || ""}`;
    const dismissed = localStorage.getItem(dismissedKey);
    
    if (!dismissed) {
      // Show modal after a short delay for animation
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    } else {
      setIsDismissed(true);
    }
  }, [userType, adminRole]);

  useEffect(() => {
    // Prevent body scroll when modal is visible
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  const handleDismiss = () => {
    const dismissedKey = `welcomeTileDismissed_${userType}_${adminRole || ""}`;
    localStorage.setItem(dismissedKey, "true");
    // Restore body scroll immediately
    document.body.style.overflow = '';
    setIsVisible(false);
    setIsDismissed(true);
    if (onClose) {
      onClose();
    }
  };

  // Don't render anything if dismissed
  if (isDismissed) return null;
  
  // Don't render modal until it should be visible
  if (!isVisible) return null;

  const getContent = () => {
    const isClubAdmin = userType === "admin" && adminRole === "clubAdmin";
    
    if (userType === "athlete") {
      return {
        emoji: "🏐",
        title: "Welcome to LockerLink!",
        accent: "from-indigo-50 via-white to-sky-100",
        borderColor: "border-indigo-200",
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              You're all set! Here's what you can do on LockerLink:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">🎁 Earn Points & Win <span className="font-extrabold text-base">PRIZES</span></p>
                  <p className="text-xs text-slate-600 mt-1">
                    Post highlights, interact with content, and earn points worth up to <span className="font-extrabold text-base text-amber-700">$250</span> in <span className="font-bold">prizes</span>!
                  </p>
                  <Link
                    href="/profile/points"
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 mt-2"
                  >
                    Learn more <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">Post Your Highlights</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Share your best plays to get noticed by coaches and teammates. Post highlights to start earning points!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  <Search className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">Explore & Connect</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Find coaches, mentors, and other athletes. Build your network and grow your presence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      };
    }

    if (userType === "coach") {
      return {
        emoji: "🧢",
        title: "Welcome to LockerLink!",
        accent: "from-emerald-50 via-white to-amber-50",
        borderColor: "border-emerald-200",
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              Your coach profile is ready! Here's how to make the most of LockerLink:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <Play className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">View Athlete Highlights</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Watch player clips, track progress, and discover talent worth a closer look.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">Share Training & Advice</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Post drills, practice plans, and feedback to help players level up between sessions.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">Engage Your Community</p>
                  <p className="text-xs text-slate-600 mt-1">
                    React, comment, and leave shoutouts to motivate athletes and keep morale high.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      };
    }

    if (userType === "admin") {
      if (isClubAdmin) {
        return {
          emoji: "📋",
          title: "Welcome to LockerLink!",
          accent: "from-amber-50 via-white to-slate-100",
          borderColor: "border-amber-200",
          content: (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Your club admin profile is ready! Here's what you can do:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0F172A]">View Club Activity</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Stay informed with access to shared highlights, posts, and updates across your club.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0F172A]">Monitor Progress</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Follow each athlete's growth through their profile stats, achievements, and highlights.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0F172A]">Keep Communications Transparent</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Spot-check coach and athlete interactions to ensure conversations stay positive and compliant.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ),
        };
      } else {
        return {
          emoji: "👟",
          title: "Welcome to LockerLink!",
          accent: "from-amber-50 via-white to-slate-100",
          borderColor: "border-amber-200",
          content: (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Your parent profile is ready! Here's how to stay connected:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <Play className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0F172A]">Follow Their Highlights</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Watch new clips, match recaps, and training moments as soon as they're posted.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0F172A]">Stay Informed</p>
                    <p className="text-xs text-slate-600 mt-1">
                      See team updates, coach posts, and community news so you always know what's next.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0F172A]">Cheer Them On</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Drop likes, comments, and supportive messages to keep their confidence high.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ),
        };
      }
    }

    if (userType === "mentor") {
      return {
        emoji: "🎓",
        title: "Welcome to LockerLink!",
        accent: "from-indigo-50 via-white to-sky-100",
        borderColor: "border-indigo-200",
        content: (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              Your mentor profile is ready! Here's how to guide and inspire the next generation:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <Play className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">View Athlete Highlights</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Watch player clips and provide encouragement or constructive feedback.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">Post Insights & Resources</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Offer advice on training, mindset, or post-secondary opportunities.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-white/80 px-4 py-3 border border-white/60">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F172A]">Engage with the Community</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Comment on posts, highlight strong performances, and share perspective from your own journey.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
      };
    }

    return null;
  };

  const content = getContent();
  if (!content || isDismissed || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className={`w-full max-w-lg rounded-3xl border ${content.borderColor} shadow-2xl p-6 sm:p-7 bg-gradient-to-br ${content.accent} relative pointer-events-auto max-h-[90vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/60 transition-colors z-10"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
              
              <div className="flex items-start gap-3 mb-4 pr-10">
                <div className="text-3xl sm:text-4xl">{content.emoji}</div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-[#0F172A]">{content.title}</h2>
                </div>
              </div>
              
              {content.content}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleDismiss}
                  className="px-6 py-2.5 rounded-xl bg-[#007AFF] text-white font-semibold hover:bg-[#0056CC] transition-colors shadow-sm"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

