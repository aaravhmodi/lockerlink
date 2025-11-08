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
        const hasRequiredFields =
          data.username &&
          data.name &&
          data.team &&
          data.age &&
          data.city &&
          data.position &&
          data.sport;

        setIsComplete(!!hasRequiredFields);
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

