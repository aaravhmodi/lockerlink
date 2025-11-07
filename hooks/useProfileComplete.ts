"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";

export function useProfileComplete() {
  const { user, loading: userLoading } = useUser();
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setIsComplete(false);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          setIsComplete(false);
          setLoading(false);
          return;
        }

        const data = userDoc.data();
        // Check if all required fields are filled
        const hasRequiredFields = 
          data.username &&
          data.name &&
          data.team &&
          data.age &&
          data.city &&
          data.position &&
          data.sport;

        setIsComplete(hasRequiredFields);
      } catch (error) {
        console.error("Error checking profile:", error);
        setIsComplete(false);
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading) {
      checkProfile();
    }
  }, [user, userLoading]);

  return { isComplete, loading: loading || userLoading };
}

