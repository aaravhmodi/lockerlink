"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { uploadToCloudinary } from "@/utils/uploadToCloudinary";
import { motion } from "framer-motion";
import { HiCamera } from "react-icons/hi";

interface UserProfile {
  username: string;
  name: string;
  team: string;
  ageGroup: string;
  birthMonth: string;
  birthYear: string;
  city: string;
  position: string;
  secondaryPosition?: string;
  sport: string;
  bio: string;
  height: string;
  vertical: string;
  weight: string;
  blockTouch?: string;
  standingTouch?: string;
  spikeTouch?: string;
  points?: number;
  photoURL?: string;
  userType: "athlete" | "coach" | "admin" | "mentor";
  division?: string;
  coachMessage?: string;
  ogLockerLinkUser?: boolean;
  adminRole?: "parent" | "clubAdmin" | "";
  university?: string;
  experienceYears?: string;
  focusAreas?: string;
  contactLink?: string;
  achievements?: string;
  volleyballBackground?: string;
}

interface ProfileFormProps {
  onSave?: () => Promise<void> | void;
}

const parseHeightValue = (value?: string) => {
  if (!value) {
    return { feet: "", inches: "" };
  }
  const match = value.match(/(?:(\d+)\s*(?:ft|feet|'))?\s*(?:(\d+)\s*(?:in|\"|inch))?/i);
  return {
    feet: match?.[1] ?? "",
    inches: match?.[2] ?? "",
  };
};

const parseNumericValue = (value?: string) => {
  if (!value) return "";
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? match[1] : "";
};

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 1990 + 1 }, (_, index) => `${currentYear - index}`);
const AGE_GROUP_OPTIONS = ["15U", "16U", "17U", "18U"];
const POSITION_OPTIONS = [
  "Outside Hitter (Left Side)",
  "Opposite Hitter (Right Side)",
  "Middle Blocker (Middle Hitter)",
  "Setter",
  "Libero",
  "Defensive Specialist",
  "Serving Specialist",
];

const convertAgeToGroup = (age?: number) => {
  if (typeof age !== "number") return "";
  if (age >= 18) return "18U";
  if (age >= 17) return "17U";
  if (age >= 16) return "16U";
  if (age >= 15) return "15U";
  return "";
};

export default function ProfileForm({ onSave }: ProfileFormProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    username: "",
    name: "",
    team: "",
    ageGroup: "",
    birthMonth: "",
    birthYear: "",
    city: "",
    position: "",
    secondaryPosition: "",
    sport: "Volleyball",
    bio: "",
    height: "",
    vertical: "",
    weight: "",
    blockTouch: "",
    standingTouch: "",
    spikeTouch: "",
    points: 0,
    photoURL: "",
    userType: "athlete",
    division: "",
    coachMessage: "",
    ogLockerLinkUser: false,
    adminRole: "",
    university: "",
    experienceYears: "",
    focusAreas: "",
    contactLink: "",
    achievements: "",
    volleyballBackground: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [heightFeet, setHeightFeet] = useState<string>("");
  const [heightInches, setHeightInches] = useState<string>("");
  const [verticalInches, setVerticalInches] = useState<string>("");
  const [weightLbs, setWeightLbs] = useState<string>("");
  const [blockTouch, setBlockTouch] = useState<string>("");
  const [standingTouch, setStandingTouch] = useState<string>("");
  const [spikeTouch, setSpikeTouch] = useState<string>("");
  const isCoach = formData.userType === "coach";
  const isAdmin = formData.userType === "admin";
  const isMentor = formData.userType === "mentor";
  const isAthleteOrMentor = formData.userType === "athlete" || formData.userType === "mentor";
  const isAthleteOnly = formData.userType === "athlete";
  const needsBirthInfo = formData.userType === "athlete" || formData.userType === "mentor";
  const needsMetrics = formData.userType === "athlete" || formData.userType === "mentor";

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          const heightParts = parseHeightValue(data.height);
          const verticalValue = parseNumericValue(data.vertical);
          const weightValue = parseNumericValue(data.weight);
          const blockValue = parseNumericValue(data.blockTouch);
          const standingValue = parseNumericValue(data.standingTouch);
          const spikeValue = parseNumericValue(data.spikeTouch);
          const derivedAgeGroup = data.ageGroup || convertAgeToGroup(data.age);
          const resolvedAdminRole = data.userType === "admin" ? (data.adminRole || "parent") : "";

          if (data.userType === "admin" && !data.adminRole) {
            try {
              await setDoc(doc(db, "users", user.uid), { adminRole: "parent" }, { merge: true });
            } catch (error) {
              console.error("Error setting default admin role:", error);
            }
          }

          setFormData({
              username: data.username || "",
              name: data.name || "",
              team: data.team || "",
              ageGroup: derivedAgeGroup || "",
              birthMonth: data.birthMonth || "",
              birthYear: data.birthYear || "",
              city: data.city || "",
              position: data.position || "",
              secondaryPosition: data.secondaryPosition || "",
              sport: data.sport || "Volleyball",
              bio: data.bio || "",
              height: data.height || "",
              vertical: data.vertical || "",
              weight: data.weight || "",
              blockTouch: data.blockTouch || "",
              standingTouch: data.standingTouch || "",
              spikeTouch: data.spikeTouch || "",
              points: typeof data.points === "number" ? data.points : 0,
              photoURL: data.photoURL || "",
              userType: (data.userType as "athlete" | "coach" | "admin" | "mentor") || "athlete",
              division: data.division || "",
              coachMessage: data.coachMessage || "",
              ogLockerLinkUser: data.ogLockerLinkUser ?? true,
              adminRole: resolvedAdminRole,
              university: data.university || "",
              experienceYears: data.experienceYears || "",
              focusAreas: data.focusAreas || "",
              contactLink: data.contactLink || "",
              achievements: data.achievements || "",
              volleyballBackground: data.volleyballBackground || "",
            });
          setHeightFeet(heightParts.feet);
          setHeightInches(heightParts.inches);
          setVerticalInches(verticalValue);
          setWeightLbs(weightValue);
          setBlockTouch(blockValue);
          setStandingTouch(standingValue);
          setSpikeTouch(spikeValue);
          if (data.photoURL) {
            setPhotoPreview(null);
          }
        } else {
          setHeightFeet("");
          setHeightInches("");
          setVerticalInches("");
          setWeightLbs("");
          setBlockTouch("");
          setStandingTouch("");
          setSpikeTouch("");
          setFormData((prev) => ({
            ...prev,
            userType: "athlete",
            ageGroup: "",
            birthMonth: "",
            birthYear: "",
            secondaryPosition: "",
            blockTouch: "",
            standingTouch: "",
            spikeTouch: "",
            points: 0,
            ogLockerLinkUser: prev.ogLockerLinkUser ?? true,
            adminRole: "",
            university: "",
            experienceYears: "",
            focusAreas: "",
            contactLink: "",
            achievements: "",
            volleyballBackground: "",
          }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username.trim()) return false;
    
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.toLowerCase().trim()));
      const snapshot = await getDocs(q);
      
      // Check if username is taken by another user
      if (snapshot.empty) return true;
      
      // If username belongs to current user, it's available
      const existingUser = snapshot.docs.find(doc => doc.id === user?.uid);
      return !!existingUser;
    } catch (error) {
      console.error("Error checking username:", error);
      return false;
    }
  };

  const validateUsername = async (username: string) => {
    setUsernameError("");
    
    if (!username.trim()) {
      setUsernameError("Username is required");
      return false;
    }

    // Username format validation: 3-20 chars, alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setUsernameError("Username must be 3-20 characters (letters, numbers, _ only)");
      return false;
    }

    setCheckingUsername(true);
    const isAvailable = await checkUsernameAvailability(username);
    setCheckingUsername(false);

    if (!isAvailable) {
      setUsernameError("Username is already taken");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate username
    const isUsernameValid = await validateUsername(formData.username);
    if (!isUsernameValid) {
      return;
    }

    setSaving(true);
    setUsernameError("");
    
    try {
      let photoURL = formData.photoURL;

      // Upload photo to Cloudinary if selected
      if (photoFile) {
        photoURL = await uploadToCloudinary(photoFile);
      }

      const isCoachSubmit = formData.userType === "coach";
      const isAdminSubmit = formData.userType === "admin";
      const isMentorSubmit = formData.userType === "mentor";

      if (isAthleteOnly) {
        if (!formData.birthMonth || !formData.birthYear) {
          alert("Please provide your birth month and year.");
          setSaving(false);
          return;
        }
        if (!formData.team?.trim()) {
          alert("Please enter your team or club name.");
          setSaving(false);
          return;
        }
        if (!formData.city?.trim()) {
          alert("Please enter the city where you live.");
          setSaving(false);
          return;
        }
        if (!formData.ageGroup) {
          alert("Please select your age group.");
          setSaving(false);
          return;
        }
      }

      const trimmedTeam = formData.team.trim();
      const trimmedCity = formData.city.trim();

      if (isAdminSubmit) {
        if (!formData.adminRole) {
          alert("Please choose whether you're a Parent/Guardian or Club Admin.");
          setSaving(false);
          return;
        }

        if (formData.adminRole === "clubAdmin" && !trimmedTeam) {
          alert("Please enter the team you oversee as a Club Admin.");
          setSaving(false);
          return;
        }
      }

      const feetValue = heightFeet ? parseInt(heightFeet, 10) : 0;
      const inchValue = heightInches ? parseInt(heightInches, 10) : 0;
      const verticalValue = verticalInches ? parseInt(verticalInches, 10) : 0;
      const weightValue = weightLbs ? parseInt(weightLbs, 10) : 0;
      const blockValue = blockTouch ? parseInt(blockTouch, 10) : 0;
      const standingValue = standingTouch ? parseInt(standingTouch, 10) : 0;
      const spikeValue = spikeTouch ? parseInt(spikeTouch, 10) : 0;
      const pointsValue =
        typeof formData.points === "number"
          ? formData.points
          : formData.points
          ? parseInt(String(formData.points), 10) || 0
          : 0;

      const normalizedHeight =
        isCoachSubmit || isAdminSubmit || (!feetValue && !inchValue)
          ? ""
          : `${feetValue}'${inchValue}"`;
      const normalizedVertical =
        isCoachSubmit || isAdminSubmit || !verticalValue ? "" : `${verticalValue}"`;
      const normalizedWeight =
        isCoachSubmit || isAdminSubmit || !weightValue ? "" : `${weightValue} lbs`;
      const normalizedBlockTouch =
        isCoachSubmit || isAdminSubmit || !blockValue ? "" : `${blockValue}"`;
      const normalizedStandingTouch =
        isCoachSubmit || isAdminSubmit || !standingValue ? "" : `${standingValue}"`;
      const normalizedSpikeTouch =
        isCoachSubmit || isAdminSubmit || !spikeValue ? "" : `${spikeValue}"`;
      const normalizedTeam = isCoachSubmit
        ? trimmedTeam
        : isAdminSubmit
          ? formData.adminRole === "clubAdmin"
            ? trimmedTeam
            : ""
          : trimmedTeam;
      const normalizedCity = isCoachSubmit
        ? trimmedCity
        : isAdminSubmit && formData.adminRole === "clubAdmin"
          ? trimmedCity
          : trimmedCity;
      const normalizedPosition = isCoachSubmit || isAdminSubmit ? "" : formData.position;
      const normalizedSecondaryPosition =
        isCoachSubmit || isAdminSubmit ? "" : formData.secondaryPosition || "";
      const normalizedCoachMessage = isCoachSubmit ? formData.coachMessage?.trim() || "" : "";
      const normalizedBirthMonth = isCoachSubmit || isAdminSubmit ? "" : formData.birthMonth;
      const normalizedBirthYear = isCoachSubmit || isAdminSubmit ? "" : formData.birthYear;
 
      // Save profile using setDoc with merge: true (creates or updates)
      // Store username in lowercase for case-insensitive searches
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...formData,
          team: normalizedTeam,
          city: normalizedCity,
          position: normalizedPosition,
          secondaryPosition: normalizedSecondaryPosition,
          sport: "Volleyball",
          username: formData.username.toLowerCase().trim(),
          photoURL,
          height: normalizedHeight,
          vertical: normalizedVertical,
          weight: normalizedWeight,
          userType: formData.userType,
          ageGroup: isAthleteOnly ? formData.ageGroup : "",
          birthMonth: normalizedBirthMonth,
          birthYear: normalizedBirthYear,
          blockTouch: normalizedBlockTouch,
          standingTouch: normalizedStandingTouch,
          spikeTouch: normalizedSpikeTouch,
          division: isCoachSubmit ? formData.division || "" : "",
          coachMessage: normalizedCoachMessage,
          ogLockerLinkUser: formData.ogLockerLinkUser ?? true,
          points: isCoachSubmit || isAdminSubmit || isMentorSubmit ? 0 : pointsValue,
          adminRole: isAdminSubmit ? formData.adminRole : "",
          university: formData.university?.trim() || "",
          experienceYears: formData.experienceYears?.trim() || "",
          focusAreas: formData.focusAreas?.trim() || "",
          contactLink: formData.contactLink?.trim() || "",
          achievements: formData.achievements?.trim() || "",
          volleyballBackground: formData.volleyballBackground?.trim() || "",
        },
        { merge: true }
      );

      // Update local state
      setFormData({
        ...formData,
        photoURL,
        height: normalizedHeight,
        vertical: normalizedVertical,
        weight: normalizedWeight,
        blockTouch: normalizedBlockTouch,
        standingTouch: normalizedStandingTouch,
        spikeTouch: normalizedSpikeTouch,
        division: isCoachSubmit ? formData.division || "" : "",
        coachMessage: normalizedCoachMessage,
        ogLockerLinkUser: formData.ogLockerLinkUser ?? true,
        points: isCoachSubmit || isAdminSubmit || isMentorSubmit ? 0 : pointsValue,
        team: normalizedTeam,
        city: normalizedCity,
        position: normalizedPosition,
        secondaryPosition: normalizedSecondaryPosition,
        birthMonth: normalizedBirthMonth,
        birthYear: normalizedBirthYear,
        adminRole: isAdminSubmit ? formData.adminRole : "",
        university: formData.university?.trim() || "",
        experienceYears: formData.experienceYears?.trim() || "",
        focusAreas: formData.focusAreas?.trim() || "",
        contactLink: formData.contactLink?.trim() || "",
        achievements: formData.achievements?.trim() || "",
        volleyballBackground: formData.volleyballBackground?.trim() || "",
      });
      setHeightFeet(isCoachSubmit || isAdminSubmit ? "" : heightFeet);
      setHeightInches(isCoachSubmit || isAdminSubmit ? "" : heightInches);
      setVerticalInches(isCoachSubmit || isAdminSubmit ? "" : verticalInches);
      setWeightLbs(isCoachSubmit || isAdminSubmit ? "" : weightLbs);
      setBlockTouch(isCoachSubmit || isAdminSubmit ? "" : blockTouch);
      setStandingTouch(isCoachSubmit || isAdminSubmit ? "" : standingTouch);
      setSpikeTouch(isCoachSubmit || isAdminSubmit ? "" : spikeTouch);
      setPhotoPreview(null);
      setPhotoFile(null);
      
      // Show success message
      if (onSave) {
        await onSave();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center text-[#6B7280] py-8">Loading profile...</div>;
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* Profile Photo Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-start gap-6">
        <div className="flex-shrink-0">
          <label className="mb-2 block text-xs font-medium text-[#111827]">Profile Photo</label>
          <div className="relative group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="h-32 w-32 overflow-hidden rounded-full bg-[#F3F4F6] border-2 border-[#E5E7EB] transition-all duration-200 group-hover:border-[#007AFF]/30"
            >
              {(photoPreview || formData.photoURL) ? (
                <img
                  src={photoPreview || formData.photoURL || ""}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-[#9CA3AF]">
                  {formData.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </motion.div>
            <label className="absolute bottom-0 right-0 bg-[#007AFF] text-white rounded-full p-3 cursor-pointer hover:bg-[#0056CC] transition-all duration-200 shadow-lg hover:shadow-xl">
              <HiCamera className="w-5 h-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-[#6B7280]">Click camera icon to upload</p>
          
          {/* Account Type (for athletes) - Under profile photo */}
          {isAthleteOnly && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-[#111827]">Account Type *</label>
              <div className="flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-[#1D4ED8] h-[42px] justify-center">
                Athlete
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 w-full space-y-4">
          {/* Username and Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#111827]">Username *</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setFormData({ ...formData, username: value });
                    setUsernameError("");
                  }}
                  onBlur={() => {
                    if (formData.username) {
                      validateUsername(formData.username);
                    }
                  }}
                  required
                  maxLength={20}
                  className={`w-full rounded-xl border ${
                    usernameError ? "border-[#FF3B30]" : "border-[#E5E7EB]"
                  } bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation`}
                  placeholder="username"
                  inputMode="text"
                  autoComplete="username"
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-[#9CA3AF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
              {usernameError && (
                <p className="mt-1 text-xs text-[#FF3B30]">{usernameError}</p>
              )}
              <p className="mt-1 text-xs text-[#6B7280]">This is how others will find you (3-20 characters)</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#111827]">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                placeholder="Your name"
                inputMode="text"
                autoComplete="name"
              />
            </div>
          </div>

          {/* Birth Month, Year, Age Group (for athletes) */}
          {isAthleteOrMentor && (
            <div className={`grid grid-cols-1 ${isAthleteOnly ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#111827]">
                  Birth Month {needsBirthInfo ? "*" : "(optional)"}
                </label>
                <select
                  value={formData.birthMonth}
                  onChange={(e) => setFormData({ ...formData, birthMonth: e.target.value })}
                  required={needsBirthInfo}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                >
                  <option value="">Select month</option>
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#111827]">
                  Birth Year {needsBirthInfo ? "*" : "(optional)"}
                </label>
                <select
                  value={formData.birthYear}
                  onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                  required={needsBirthInfo}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                >
                  <option value="">Select year</option>
                  {YEAR_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              {isAthleteOnly && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#111827]">Age Group *</label>
                  <select
                    value={formData.ageGroup}
                    onChange={(e) => setFormData({ ...formData, ageGroup: e.target.value })}
                    required
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                  >
                    <option value="">Select age group</option>
                    {AGE_GROUP_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Height Feet and Inches (for athletes) - Expanded to fill space */}
          {isAthleteOnly && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#111827]">Height *</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="number"
                    min={4}
                    max={7}
                    value={heightFeet}
                    onChange={(e) => setHeightFeet(e.target.value)}
                    required={needsMetrics}
                    placeholder="Feet"
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-12 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">ft</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={11}
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    required={needsMetrics}
                    placeholder="Inches"
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-12 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                  />
                  <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">in</span>
                </div>
              </div>
            </div>
          )}

          {/* Height (for mentors only) */}
          {isMentor && !isAthleteOnly && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#111827]">Height *</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="number"
                      min={4}
                      max={7}
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(e.target.value)}
                      required={needsMetrics}
                      placeholder="Feet"
                      className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-12 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                    />
                    <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">ft</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={11}
                      value={heightInches}
                      onChange={(e) => setHeightInches(e.target.value)}
                      required={needsMetrics}
                      placeholder="Inches"
                      className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-12 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                    />
                    <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">in</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team and City (for athletes) */}
      {isAthleteOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Team *</label>
            <input
              type="text"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              required
              placeholder="e.g., Milton Acers"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">City *</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              placeholder="e.g., Milton"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
            />
          </div>
        </div>
      )}

      {isAthleteOnly && (
        <p className="text-xs text-[#6B7280] -mt-1">Use the city where you live (e.g., Milton). Keep your team or club name in the Team field.</p>
      )}

      {/* Account Type for non-athletes */}
      {!isAthleteOnly && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Account Type</label>
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${
              isCoach
                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                : isAdmin
                ? "border-amber-200 bg-amber-50 text-amber-700"
              : isMentor
                ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                : "border-blue-200 bg-blue-50 text-[#1D4ED8]"
            }`}
          >
            {isCoach
              ? "Coach"
              : isAdmin
              ? formData.adminRole === "clubAdmin"
                ? "Club Admin"
                : "Parent"
              : isMentor
                ? "Mentor"
                : "Athlete"}
          </div>
        </div>
      )}

      {/* Admin Type Selection */}
      {isAdmin && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Admin Type *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { value: "parent", label: "Parent / Guardian" },
              { value: "clubAdmin", label: "Club Admin / Manager" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    adminRole: option.value as "parent" | "clubAdmin",
                    team: option.value === "clubAdmin" ? prev.team : "",
                  }))
                }
                className={`rounded-xl border px-4 py-2 text-xs font-medium transition-all ${
                  formData.adminRole === option.value
                    ? "border-[#007AFF] bg-[#E0F2FF] text-[#0F172A]"
                    : "border-[#E5E7EB] bg-white text-[#111827] hover:border-[#007AFF]/60"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {formData.adminRole === "clubAdmin" && (
            <p className="mt-2 text-xs text-[#6B7280]">
              Selecting Club Admin helps coaches and athletes recognize your club affiliation.
            </p>
          )}
          {formData.adminRole === "parent" && (
            <p className="mt-2 text-xs text-[#6B7280]">
              Parents and guardians can keep things simple—no extra team info is required.
            </p>
          )}
        </div>
      )}

      {/* Coach Fields */}
      {isCoach && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Team / Club *</label>
            <input
              type="text"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              required
              placeholder="e.g., Milton Edge 17U"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Region *</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              placeholder="e.g., Peel Region"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
            />
            <p className="mt-1 text-xs text-[#6B7280]">List the region you recruit from (e.g., GTA, Peel Region).</p>
          </div>
        </div>
      )}

      {isCoach && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Division</label>
          <input
            type="text"
            value={formData.division}
            onChange={(e) => setFormData({ ...formData, division: e.target.value })}
            placeholder="e.g., 17U Boys"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          />
        </div>
      )}

      {/* Admin Club Admin Team */}
      {isAdmin && formData.adminRole === "clubAdmin" && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Team *</label>
          <input
            type="text"
            value={formData.team}
            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            required
            placeholder="e.g., Milton Edge 17U"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          />
          <p className="mt-1 text-xs text-[#6B7280]">Let athletes and coaches know which club you manage.</p>
        </div>
      )}

      {/* Mentor Fields */}
      {isMentor && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">University / College (optional)</label>
            <input
              type="text"
              value={formData.university || ""}
              onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              placeholder="e.g., University of Toronto"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Years of Experience (optional)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={formData.experienceYears || ""}
              onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
              placeholder="e.g., 4"
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
            />
          </div>
        </div>
      )}

      {isMentor && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Focus Areas *</label>
          <textarea
            value={formData.focusAreas || ""}
            onChange={(e) => setFormData({ ...formData, focusAreas: e.target.value.slice(0, 400) })}
            required={isMentor}
            rows={3}
            placeholder="e.g., Outside hitters, serve receive fundamentals, balancing school and athletics"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none"
          />
          <p className="mt-1.5 text-xs text-[#6B7280]">Share the ways you can help athletes (max 400 characters).</p>
        </div>
      )}

      {isMentor && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Preferred Contact Link (optional)</label>
          <input
            type="url"
            value={formData.contactLink || ""}
            onChange={(e) => setFormData({ ...formData, contactLink: e.target.value })}
            placeholder="e.g., https://www.linkedin.com/in/yourname"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          />
        </div>
      )}

      {/* Sport and Position (for athletes) */}
      {isAthleteOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Sport *</label>
            <div className="w-full rounded-xl border border-[#E5E7EB] bg-slate-50 px-4 py-2.5 text-sm text-[#111827] font-medium">
              Volleyball
            </div>
            <input type="hidden" name="sport" value="Volleyball" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Position *</label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
            >
              <option value="">Select position</option>
              {POSITION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Secondary Position (for athletes) */}
      {isAthleteOnly && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Secondary Position (optional)</label>
          <select
            value={formData.secondaryPosition || ""}
            onChange={(e) => setFormData({ ...formData, secondaryPosition: e.target.value })}
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          >
            <option value="">None</option>
            {POSITION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Vertical and Weight (for athletes/mentors) */}
      {needsMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Vertical *</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={80}
                value={verticalInches}
                onChange={(e) => setVerticalInches(e.target.value)}
                required={needsMetrics}
                placeholder="Inches"
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-12 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              />
              <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">in</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Weight *</label>
            <div className="relative">
              <input
                type="number"
                min={50}
                max={400}
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
                required={needsMetrics}
                placeholder="Pounds"
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-14 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              />
              <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">lbs</span>
            </div>
          </div>
        </div>
      )}

      {/* Touch Metrics (for athletes/mentors) */}
      {needsMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Block Touch (optional)</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={150}
                value={blockTouch}
                onChange={(e) => setBlockTouch(e.target.value)}
                placeholder="Inches"
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-12 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              />
              <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">in</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Standing Touch (optional)</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={150}
                value={standingTouch}
                onChange={(e) => setStandingTouch(e.target.value)}
                placeholder="Inches"
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-12 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              />
              <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">in</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#111827]">Spike Touch (optional)</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={150}
                value={spikeTouch}
                onChange={(e) => setSpikeTouch(e.target.value)}
                placeholder="Inches"
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 pr-12 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              />
              <span className="absolute inset-y-0 right-4 flex items-center text-xs text-[#6B7280]">in</span>
            </div>
          </div>
        </div>
      )}

      {/* Bio (for athletes/mentors) or Message (for coaches) */}
      {isAthleteOrMentor ? (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 500) })}
            rows={4}
            maxLength={500}
            placeholder="Tell us about yourself... (e.g., OVA 17U | Working on serve receive)"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none"
          />
          <p className="mt-1.5 text-xs text-[#6B7280]">{formData.bio.length}/500 characters</p>
        </div>
      ) : isCoach ? (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Message to Athletes</label>
          <textarea
            value={formData.coachMessage || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                coachMessage: e.target.value.slice(0, 500),
              })
            }
            rows={4}
            maxLength={500}
            placeholder='e.g., "Always looking for hard working setters."'
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none"
          />
          <p className="mt-1.5 text-xs text-[#6B7280]">{formData.coachMessage?.length || 0}/500 characters</p>
        </div>
      ) : null}

      {/* Achievements (for athletes/mentors) */}
      {isAthleteOrMentor && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Highlight Achievements (optional)</label>
          <textarea
            value={formData.achievements || ""}
            onChange={(e) => setFormData({ ...formData, achievements: e.target.value.slice(0, 400) })}
            rows={3}
            maxLength={400}
            placeholder="e.g., OUA Rookie of the Year 2024 | Team Canada NextGen | Provincial Champion"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none"
          />
          <p className="mt-1.5 text-xs text-[#6B7280]">Share notable milestones (max 400 characters).</p>
        </div>
      )}

      {/* Volleyball Background (for mentors) */}
      {isMentor && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#111827]">Volleyball Background *</label>
          <textarea
            value={formData.volleyballBackground || ""}
            onChange={(e) => setFormData({ ...formData, volleyballBackground: e.target.value.slice(0, 500) })}
            required={isMentor}
            rows={3}
            maxLength={500}
            placeholder="e.g., Played outside for XYZ University, Team Ontario alum, assistant coach at ABC club"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none"
          />
          <p className="mt-1.5 text-xs text-[#6B7280]">Give athletes context on your playing/coaching journey (max 500 characters).</p>
        </div>
      )}

      <motion.button
        type="submit"
        disabled={saving}
        whileHover={{ scale: saving ? 1 : 1.02 }}
        whileTap={{ scale: saving ? 1 : 0.98 }}
        className="w-full rounded-xl bg-[#007AFF] px-6 py-3 text-sm text-white font-medium transition-all duration-200 hover:bg-[#0056CC] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed shadow-sm hover:shadow-md touch-manipulation min-h-[44px]"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Saving...
          </span>
        ) : (
          "Save Profile"
        )}
      </motion.button>
    </motion.form>
  );
}
