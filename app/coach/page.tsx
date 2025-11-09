"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import Navbar from "@/components/Navbar";
import ProfileGuard from "@/components/ProfileGuard";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

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
}

export default function CoachDashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

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
      if (!profile || profile.userType !== "coach") {
        router.replace("/home");
        setAuthorized(false);
        setLoadingPlayers(false);
        return;
      }

      setAuthorized(true);

      const playersQuery = query(
        collection(db, "users"),
        where("userType", "in", ["athlete", "player"])
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
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#0F172A] mb-2">Coach Dashboard</h1>
            <p className="text-[#475569] max-w-2xl">
              Scout athletes, track bookmarked players, and post upcoming tryouts. LockerLink keeps your recruiting workflow in one place.
            </p>
          </div>

          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[#0F172A]">Athletes</h2>
                <p className="text-sm text-[#64748B]">Browse players who are looking for exposure.</p>
              </div>
              <Link
                href="/explore"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
              >
                Explore All Athletes
              </Link>
            </div>

            {loadingPlayers ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((key) => (
                  <div key={key} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : players.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-10 text-center text-[#475569]">
                No athletes found yet. Encourage players to complete their profiles so you can discover them here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map((player) => (
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
                            alt={player.name || "Athlete"}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{player.name?.[0]?.toUpperCase() || "A"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-[#0F172A] truncate">
                          {player.name || "Unnamed Athlete"}
                        </h3>
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
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-dashed border-[#CBD5F5] bg-white/60 p-6 text-sm text-[#475569]">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Next Steps for Coaches</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Bookmark athletes you want to follow up with (coming soon).</li>
              <li>Post tryouts to the LockerLink community so athletes can discover you.</li>
              <li>Leave private notes on player profiles to keep your scouting organized.</li>
            </ul>
          </section>
        </main>
      </div>
    </ProfileGuard>
  );
}

