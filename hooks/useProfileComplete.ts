"use client";

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";

export function useProfileComplete() {
  const { user, loading: userLoading } = useUser();
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) {
      return;
    }

    if (!user) {
      setIsComplete(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setIsComplete(false);
          setLoading(false);
          return;
        }

        const data = snapshot.data();
        const isCoach = data.userType === "coach";
        const isAdmin = data.userType === "admin";
        const isMentor = data.userType === "mentor";
        const hasRequiredFields = (() => {
          if (isCoach) {
            return (
              data.username &&
              data.name &&
              data.userType &&
              data.team &&
              data.city
            );
          }

          if (isAdmin) {
            const adminRole = data.adminRole || "parent";
            const isClubAdmin = adminRole === "clubAdmin";
            return (
              data.username &&
              data.name &&
              data.userType &&
              adminRole &&
              (!isClubAdmin || data.team)
            );
          }

          if (isMentor) {
            return (
              data.username &&
              data.name &&
              data.userType &&
              data.birthMonth &&
              data.birthYear &&
              data.height &&
              data.volleyballBackground &&
              true
            );
          }

          return (
            data.username &&
            data.name &&
            data.userType &&
            data.team &&
            data.city &&
            data.position &&
            data.sport &&
            data.ageGroup &&
            data.birthMonth &&
            data.birthYear &&
            data.height &&
            data.vertical &&
            data.weight
          );
        })();

        const hasHighlight = !!data.hasHighlight;
        const needsHighlight = !isCoach && !isAdmin; // Athletes and mentors need highlights
        const completeStatus = needsHighlight
          ? !!hasRequiredFields && hasHighlight
          : !!hasRequiredFields;

        setIsComplete(completeStatus);
        setLoading(false);
      },
      (error) => {
        console.error("Error checking profile:", error);
        setIsComplete(false);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, userLoading]);

  return { isComplete, loading: loading || userLoading };
}

