import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface DailyActivity {
  date: string; // YYYY-MM-DD in EST
  highlightsPosted: number;
  commentsGiven: number;
  likesGiven: number;
}

export interface UserPointsData {
  totalPoints: number;
  dailyActivity: DailyActivity;
}

// Get current date in EST (YYYY-MM-DD format)
export function getCurrentESTDate(): string {
  const now = new Date();
  // EST is UTC-5, EDT is UTC-4. We'll use America/New_York timezone
  const estDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const year = estDate.getFullYear();
  const month = String(estDate.getMonth() + 1).padStart(2, "0");
  const day = String(estDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Check if we need to reset daily activity (new day in EST)
export function shouldResetDailyActivity(currentDate: string, storedDate: string): boolean {
  return currentDate !== storedDate;
}

// Get or initialize daily activity for user
export async function getDailyActivity(userId: string): Promise<DailyActivity> {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  const currentDate = getCurrentESTDate();
  
  if (!userSnap.exists()) {
    return {
      date: currentDate,
      highlightsPosted: 0,
      commentsGiven: 0,
      likesGiven: 0,
    };
  }

  const userData = userSnap.data();
  const storedActivity = userData.dailyActivity as DailyActivity | undefined;

  if (!storedActivity || shouldResetDailyActivity(currentDate, storedActivity.date)) {
    // Reset for new day
    const newActivity: DailyActivity = {
      date: currentDate,
      highlightsPosted: 0,
      commentsGiven: 0,
      likesGiven: 0,
    };
    await setDoc(userRef, { dailyActivity: newActivity }, { merge: true });
    return newActivity;
  }

  return storedActivity;
}

// Award points to user and update daily activity
export async function awardPoints(
  userId: string,
  points: number,
  activityType: "highlightPosted" | "commentGiven" | "likeGiven",
  checkLimit: boolean = false,
  maxDaily?: number
): Promise<{ success: boolean; message?: string; pointsAwarded: number }> {
  try {
    const dailyActivity = await getDailyActivity(userId);
    
    // Check daily limits
    if (checkLimit && maxDaily !== undefined) {
      const currentCount =
        activityType === "highlightPosted"
          ? dailyActivity.highlightsPosted
          : activityType === "commentGiven"
            ? dailyActivity.commentsGiven
            : dailyActivity.likesGiven;

      if (currentCount >= maxDaily) {
        return {
          success: false,
          message: `You've reached today's limit of ${maxDaily} ${activityType === "highlightPosted" ? "highlight posts" : activityType === "commentGiven" ? "comments" : "likes"}. Daily limits reset at midnight EST.`,
          pointsAwarded: 0,
        };
      }
    }

    // Update daily activity
    const activityUpdate: Partial<DailyActivity> = {
      date: getCurrentESTDate(),
      ...(activityType === "highlightPosted"
        ? { highlightsPosted: dailyActivity.highlightsPosted + 1 }
        : activityType === "commentGiven"
          ? { commentsGiven: dailyActivity.commentsGiven + 1 }
          : { likesGiven: dailyActivity.likesGiven + 1 }),
    };

    // Award points
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      points: increment(points),
      dailyActivity: activityUpdate,
    });

    return { success: true, pointsAwarded: points };
  } catch (error) {
    console.error("Error awarding points:", error);
    return { success: false, message: "Failed to award points", pointsAwarded: 0 };
  }
}

// Award points to content creator when someone likes/comments their content
export async function awardCreatorPoints(
  creatorUserId: string,
  points: number
): Promise<void> {
  try {
    const userRef = doc(db, "users", creatorUserId);
    await updateDoc(userRef, {
      points: increment(points),
    });
  } catch (error) {
    console.error("Error awarding creator points:", error);
  }
}

// Deduct points when content/actions are removed
export async function deductPoints(userId: string, points: number): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentPoints = userSnap.data().points || 0;
      const newPoints = Math.max(0, currentPoints - points); // Don't go below 0
      await updateDoc(userRef, {
        points: newPoints,
      });
    }
  } catch (error) {
    console.error("Error deducting points:", error);
  }
}

// Deduct points when comment is deleted
export async function deductCommentPoints(commentUserId: string, creatorUserId: string): Promise<void> {
  try {
    // Deduct from commenter (5 points)
    await deductPoints(commentUserId, 5);
    // Deduct from creator (5 points received)
    if (creatorUserId && creatorUserId !== commentUserId) {
      await deductPoints(creatorUserId, 5);
    }
  } catch (error) {
    console.error("Error deducting comment points:", error);
  }
}

// Check comment length requirement
export function validateCommentLength(comment: string): boolean {
  return comment.trim().length >= 15;
}
