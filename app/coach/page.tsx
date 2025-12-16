"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import BackButton from "@/components/BackButton";
import { Filter, X } from "lucide-react";

interface PlayerSummary {
  id: string;
  name?: string;
  position?: string;
  club?: string;
  photoURL?: string;
  height?: string;
  vertical?: string;
  weight?: string;
  city?: string;
  birthYear?: string;
  birthMonth?: string;
  userType?: "athlete" | "mentor" | "coach" | "admin";
}

// Helper function to calculate age from birthYear and birthMonth
const calculateAge = (birthYear?: string, birthMonth?: string): number | null => {
  if (!birthYear) return null;
  const year = parseInt(birthYear);
  if (isNaN(year)) return null;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  let age = currentYear - year;
  
  if (birthMonth) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const birthMonthNum = monthNames.indexOf(birthMonth) + 1;
    if (birthMonthNum > 0) {
      if (currentMonth < birthMonthNum || (currentMonth === birthMonthNum && now.getDate() < 1)) {
        age--;
      }
    }
  }
  
  return age >= 0 ? age : null;
};

export default function CoachDashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<"athlete" | "mentor" | "coach" | "admin" | null>(null);
  
  // New filter states
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedAgeMin, setSelectedAgeMin] = useState<string>("");
  const [selectedAgeMax, setSelectedAgeMax] = useState<string>("");

  // Get unique cities and positions for filter dropdowns (only from athletes)
  const uniqueCities = useMemo(() => {
    const athletes = players.filter(p => p.userType === "athlete");
    return Array.from(new Set(athletes.map(p => p.city).filter(Boolean))).sort() as string[];
  }, [players]);

  const uniquePositions = useMemo(() => {
    const athletes = players.filter(p => p.userType === "athlete");
    return Array.from(new Set(athletes.map(p => p.position).filter(Boolean))).sort() as string[];
  }, [players]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    let unsubscribePlayers: (() => void) | null = null;

    const verifyRole = async () => {
      const profileSnap = await getDoc(doc(db, "users", user.uid));
      const profile = profileSnap.data();
      if (!profile || (profile.userType !== "coach" && profile.userType !== "admin")) {
        router.replace("/home");
        setAuthorized(false);
        setLoadingPlayers(false);
        return;
      }

      setAuthorized(true);
      setIsAdminView(profile.userType === "admin");

      const playersQuery = query(
        collection(db, "users"),
        where("userType", "in", ["athlete", "mentor", "coach", "admin"])
      );

      unsubscribePlayers = onSnapshot(
        playersQuery,
        (snapshot) => {
          const playerList: PlayerSummary[] = snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data() as PlayerSummary;
              return {
                ...data,
                id: docSnap.id,
                birthYear: data.birthYear,
                birthMonth: data.birthMonth,
              };
            })
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

          setPlayers(playerList);
          setLoadingPlayers(false);
        },
        (error) => {
          console.error("Error loading athletes for coaches:", error);
          setPlayers([]);
          setLoadingPlayers(false);
        }
      );
    };

    verifyRole();

    return () => {
      if (unsubscribePlayers) {
        unsubscribePlayers();
      }
    };
  }, [user, loading, router]);

  if (loading) {
    return null;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Navbar />
        <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
          Checking coach access…
        </div>
      </div>
    );
  }

  return (
    <ProfileGuard>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 md:pb-0">
        <Navbar />

        <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 sm:pt-10">
          <BackButton fallback="/home" className="mb-6" />
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#0F172A] mb-2">
              {isAdminView ? "Admin Dashboard" : "Coach Dashboard"}
            </h1>
            <p className="text-[#475569] max-w-2xl">
              {isAdminView
                ? "Keep tabs on the athletes and coaches you support. LockerLink gives you one dashboard to monitor highlights, posts, and conversations in real time."
                : "Scout athletes, track bookmarked players, and post upcoming tryouts. LockerLink keeps your recruiting workflow in one place."}
            </p>
          </div>

          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0F172A]">
                  {(() => {
                    // Calculate filtered count
                    let filtered = selectedFilter === null ? players : players.filter((p) => p.userType === selectedFilter);
                    if (selectedCity) filtered = filtered.filter((p) => p.city === selectedCity);
                    if (selectedPosition) filtered = filtered.filter((p) => p.position === selectedPosition);
                    if (selectedAgeMin || selectedAgeMax) {
                      filtered = filtered.filter((p) => {
                        const age = calculateAge(p.birthYear, p.birthMonth);
                        if (age === null) return false;
                        const minAge = selectedAgeMin ? parseInt(selectedAgeMin) : 0;
                        const maxAge = selectedAgeMax ? parseInt(selectedAgeMax) : 999;
                        return age >= minAge && age <= maxAge;
                      });
                    }
                    const filteredCount = filtered.length;
                    
                    if (selectedFilter === null) {
                      return `All Accounts (${filteredCount}${filteredCount !== players.length ? ` of ${players.length}` : ""})`;
                    } else if (selectedFilter === "athlete") {
                      return `Athletes (${filteredCount})`;
                    } else if (selectedFilter === "mentor") {
                      return `Mentors (${filteredCount})`;
                    } else if (selectedFilter === "coach") {
                      return `Coaches / Scouts (${filteredCount})`;
                    } else {
                      return `Parents / Admins (${filteredCount})`;
                    }
                  })()}
                </h2>
                <p className="text-sm text-[#64748B]">
                  {selectedFilter === null
                    ? "Browse all accounts on LockerLink."
                    : `Showing ${selectedFilter === "athlete" ? "athletes" : selectedFilter === "mentor" ? "mentors" : selectedFilter === "coach" ? "coaches / scouts" : "parents / admins"} on LockerLink.`}
                </p>
              </div>
              <Link
                href="/explore"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
              >
                {isAdminView ? "Open Explore" : "Explore Highlights"}
              </Link>
            </div>

            {/* Metric Filters - Only show for Athletes */}
            {selectedFilter === "athlete" && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-[#0F172A]">Filter Athletes by Metrics</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* City Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-2">City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
                  >
                    <option value="">All Cities</option>
                    {uniqueCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Position Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-2">Position</label>
                  <select
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
                  >
                    <option value="">All Positions</option>
                    {uniquePositions.map(position => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </select>
                </div>

                {/* Age Min Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-2">Min Age</label>
                  <select
                    value={selectedAgeMin}
                    onChange={(e) => setSelectedAgeMin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
                  >
                    <option value="">Any</option>
                    {Array.from({ length: 20 }, (_, i) => i + 13).map(age => (
                      <option key={age} value={age.toString()}>{age}</option>
                    ))}
                  </select>
                </div>

                {/* Age Max Filter */}
                <div>
                  <label className="block text-sm font-medium text-[#475569] mb-2">Max Age</label>
                  <select
                    value={selectedAgeMax}
                    onChange={(e) => setSelectedAgeMax(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all"
                  >
                    <option value="">Any</option>
                    {Array.from({ length: 20 }, (_, i) => i + 13).map(age => (
                      <option key={age} value={age.toString()}>{age}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {(selectedCity || selectedPosition || selectedAgeMin || selectedAgeMax) && (
                <button
                  onClick={() => {
                    setSelectedCity("");
                    setSelectedPosition("");
                    setSelectedAgeMin("");
                    setSelectedAgeMax("");
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-[#475569] hover:bg-slate-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Filter Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <motion.button
                onClick={() => setSelectedFilter(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedFilter === null
                    ? "border-[#3B82F6] bg-blue-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">All</span>
                </div>
                <p className="text-2xl font-bold text-[#0F172A]">{players.length}</p>
                <p className="text-xs text-[#64748B] mt-1">accounts</p>
              </motion.button>

              <motion.button
                onClick={() => setSelectedFilter("athlete")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedFilter === "athlete"
                    ? "border-blue-300 bg-blue-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Athletes</span>
                </div>
                <p className="text-2xl font-bold text-[#0F172A]">
                  {players.filter((p) => p.userType === "athlete").length}
                </p>
                <p className="text-xs text-[#64748B] mt-1">accounts</p>
              </motion.button>

              <motion.button
                onClick={() => setSelectedFilter("mentor")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedFilter === "mentor"
                    ? "border-purple-300 bg-purple-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-purple-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Mentors</span>
                </div>
                <p className="text-2xl font-bold text-[#0F172A]">
                  {players.filter((p) => p.userType === "mentor").length}
                </p>
                <p className="text-xs text-[#64748B] mt-1">accounts</p>
              </motion.button>

              <motion.button
                onClick={() => setSelectedFilter("coach")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedFilter === "coach"
                    ? "border-emerald-300 bg-emerald-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Coaches</span>
                </div>
                <p className="text-2xl font-bold text-[#0F172A]">
                  {players.filter((p) => p.userType === "coach").length}
                </p>
                <p className="text-xs text-[#64748B] mt-1">accounts</p>
              </motion.button>

              <motion.button
                onClick={() => setSelectedFilter("admin")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedFilter === "admin"
                    ? "border-amber-300 bg-amber-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-amber-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Parents</span>
                </div>
                <p className="text-2xl font-bold text-[#0F172A]">
                  {players.filter((p) => p.userType === "admin").length}
                </p>
                <p className="text-xs text-[#64748B] mt-1">accounts</p>
              </motion.button>
            </div>

            {loadingPlayers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((key) => (
                  <div key={key} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (() => {
              // Apply all filters
              let filteredPlayers =
                selectedFilter === null
                  ? players
                  : players.filter((p) => p.userType === selectedFilter);

              // Only apply metric filters when viewing athletes
              if (selectedFilter === "athlete") {
                // Filter by city
                if (selectedCity) {
                  filteredPlayers = filteredPlayers.filter((p) => p.city === selectedCity);
                }

                // Filter by position
                if (selectedPosition) {
                  filteredPlayers = filteredPlayers.filter((p) => p.position === selectedPosition);
                }

                // Filter by age range
                if (selectedAgeMin || selectedAgeMax) {
                  filteredPlayers = filteredPlayers.filter((p) => {
                    const age = calculateAge(p.birthYear, p.birthMonth);
                    if (age === null) return false;
                    
                    const minAge = selectedAgeMin ? parseInt(selectedAgeMin) : 0;
                    const maxAge = selectedAgeMax ? parseInt(selectedAgeMax) : 999;
                    
                    return age >= minAge && age <= maxAge;
                  });
                }
              }

              if (filteredPlayers.length === 0) {
                return (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-10 text-center text-[#475569]">
                    No {selectedFilter === null ? "accounts" : selectedFilter === "athlete" ? "athletes" : selectedFilter === "mentor" ? "mentors" : selectedFilter === "coach" ? "coaches / scouts" : "parents / admins"} found yet.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPlayers.map((player) => {
                  const getUserTypeLabel = (type?: string) => {
                    if (type === "athlete") return "Athlete";
                    if (type === "mentor") return "Mentor";
                    if (type === "coach") return "Coach / Scout";
                    return "User";
                  };

                  const getUserTypeBadge = (type?: string) => {
                    if (type === "athlete") return "bg-blue-50 text-blue-700 border-blue-200";
                    if (type === "mentor") return "bg-purple-50 text-purple-700 border-purple-200";
                    if (type === "coach") return "bg-emerald-50 text-emerald-700 border-emerald-200";
                    return "bg-slate-50 text-slate-700 border-slate-200";
                  };

                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white text-lg font-semibold overflow-hidden">
                          {player.photoURL ? (
                            <Image
                              src={player.photoURL}
                              alt={player.name || "User"}
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{player.name?.[0]?.toUpperCase() || "U"}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-[#0F172A] truncate">
                              {player.name || "Unnamed User"}
                            </h3>
                            {player.userType && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getUserTypeBadge(player.userType)}`}>
                                {getUserTypeLabel(player.userType)}
                              </span>
                            )}
                          </div>
                          {player.club && <p className="text-sm text-[#64748B]">{player.club}</p>}
                          {player.city && <p className="text-xs text-[#94A3B8] mt-1">{player.city}</p>}
                        </div>
                      </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#475569] mb-4">
                      {player.position && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-[#2563EB]">
                          {player.position}
                        </span>
                      )}
                      {player.height && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          Height: {player.height}
                        </span>
                      )}
                      {player.vertical && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          Vertical: {player.vertical}
                        </span>
                      )}
                      {player.weight && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          Weight: {player.weight}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/profile/${player.id}`}
                        className="flex-1 rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors text-center"
                      >
                        View Profile
                      </Link>
                      <Link
                        href="/messages"
                        className="flex-1 rounded-xl bg-[#007AFF] px-4 py-2 text-sm font-semibold text-white text-center hover:bg-[#005FCC] transition-colors"
                      >
                        Message
                      </Link>
                    </div>
                  </motion.div>
                  );
                })}
                </div>
              );
            })()}
          </section>

          {isAdminView ? (
            <section className="rounded-2xl border border-dashed border-[#CBD5F5] bg-white/60 p-6 text-sm text-[#475569] space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Beta
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Admin Mode (Beta)</h3>
              <p>
                Use LockerLink to oversee your players and support their volleyball experience.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>View highlights and posts from athletes and coaches to stay informed.</li>
                <li>Follow each athlete’s growth through their profiles and achievements.</li>
                <li>Monitor coach-player conversations to promote safe, transparent communication.</li>
                <li>Share encouragement and help coordinate workouts, permissions, or resources.</li>
              </ul>
              <p className="text-[#334155]">
                Everything you see here is still in beta while we build out the full Admin experience. Thanks for being an early tester!
              </p>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-[#CBD5F5] bg-white/60 p-6 text-sm text-[#475569] space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Tips
              </div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Next Steps for Coaches</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Bookmark athletes you want to follow up with.</li>
                <li>Post tryout announcements to reach the community fast.</li>
                <li>Message athletes to coordinate gym sessions or feedback.</li>
              </ul>
              <p className="text-[#334155]">
                Keep building your network and helping players grow—LockerLink is here to support you.
              </p>
            </section>
          )}
        </main>
      </div>
    </ProfileGuard>
  );
}

