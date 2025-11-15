"use client";

import { useState, useEffect, useRef } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sendWelcomeEmail } from "@/utils/sendEmail";

// Global flag to prevent multiple sends in the same session
const emailSendInProgress = new Set<string>();
const emailSentInSession = new Set<string>();

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedEmailRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      // Send welcome email on first signup only
      if (user && user.email && !hasCheckedEmailRef.current) {
        hasCheckedEmailRef.current = true;
        
        try {
          const isFirstLogin =
            user.metadata.creationTime === user.metadata.lastSignInTime;
          
          console.log("🔍 Checking if first login:", {
            email: user.email,
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime,
            isFirstLogin: isFirstLogin
          });
          
          if (isFirstLogin) {
            // Check if email was already sent (from Firestore)
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.data();
            const welcomeEmailSent = userData?.welcomeEmailSent === true;
            
            // Also check session cache to prevent rapid multiple sends
            const sessionKey = `${user.uid}-welcome-email`;
            
            if (!welcomeEmailSent && !emailSentInSession.has(sessionKey) && !emailSendInProgress.has(sessionKey)) {
              emailSendInProgress.add(sessionKey);
              
              console.log("🎉 First login detected! Sending welcome email...");
              
              try {
                await sendWelcomeEmail(user.email);
                
                // Mark as sent in Firestore to persist across sessions
                await setDoc(userDocRef, {
                  welcomeEmailSent: true,
                  welcomeEmailSentAt: new Date().toISOString()
                }, { merge: true });
                
                // Mark as sent in session cache
                emailSentInSession.add(sessionKey);
                
                console.log("✅ Welcome email sent and marked in database");
              } catch (error) {
                console.error("❌ Failed to send welcome email:", error);
              } finally {
                emailSendInProgress.delete(sessionKey);
              }
            } else {
              console.log("ℹ️ Welcome email already sent previously, skipping");
            }
          } else {
            console.log("ℹ️ Not first login, skipping welcome email");
          }
        } catch (error) {
          console.error("Error checking first login:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}

