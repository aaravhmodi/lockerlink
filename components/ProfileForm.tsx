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
  age: number;
  city: string;
  position: string;
  sport: string;
  bio: string;
  height: string;
  vertical: string;
  weight: string;
  photoURL?: string;
}

interface ProfileFormProps {
  onSave?: () => Promise<void> | void;
}

export default function ProfileForm({ onSave }: ProfileFormProps) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    username: "",
    name: "",
    team: "",
    age: 17,
    city: "",
    position: "",
    sport: "Volleyball",
    bio: "",
    height: "",
    vertical: "",
    weight: "",
    photoURL: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setFormData({
            username: data.username || "",
            name: data.name || "",
            team: data.team || "",
            age: data.age || 17,
            city: data.city || "",
            position: data.position || "",
            sport: data.sport || "Volleyball",
            bio: data.bio || "",
            height: data.height || "",
            vertical: data.vertical || "",
            weight: data.weight || "",
            photoURL: data.photoURL || "",
          });
          if (data.photoURL) {
            setPhotoPreview(null);
          }
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

      // Save profile using setDoc with merge: true (creates or updates)
      // Store username in lowercase for case-insensitive searches
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...formData,
          sport: "Volleyball",
          username: formData.username.toLowerCase().trim(),
          photoURL,
        },
        { merge: true }
      );

      // Update local state
      setFormData({ ...formData, photoURL });
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
      className="space-y-6"
    >
      {/* Profile Photo Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-shrink-0">
          <label className="mb-3 block text-sm font-medium text-[#111827]">Profile Photo</label>
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
          <p className="mt-3 text-xs text-[#6B7280]">Click camera icon to upload</p>
        </div>
        
        <div className="flex-1 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#111827]">Username *</label>
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
                  } bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation`}
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
              <label className="mb-2 block text-sm font-medium text-[#111827]">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                placeholder="Your name"
                inputMode="text"
                autoComplete="name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#111827]">Age *</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 17 })}
                required
                min="13"
                max="19"
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#111827]">Height *</label>
              <input
                type="text"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                required
                placeholder={`e.g., 6'2"`}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#111827]">Team *</label>
          <input
            type="text"
            value={formData.team}
            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            required
            placeholder="e.g., Milton Acers"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#111827]">City *</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
            placeholder="e.g., Milton"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#111827]">Sport *</label>
          <div className="w-full rounded-xl border border-[#E5E7EB] bg-slate-50 px-4 py-3 text-base text-[#111827] font-medium">
            Volleyball
          </div>
          <p className="mt-1 text-xs text-[#6B7280]">LockerLink currently supports volleyball athletes.</p>
          <input type="hidden" name="sport" value="Volleyball" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#111827]">Position *</label>
          <select
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            required
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          >
            <option value="">Select position</option>
            <option value="Setter">Setter</option>
            <option value="Outside Hitter">Outside Hitter</option>
            <option value="Opposite">Opposite</option>
            <option value="Middle Blocker">Middle Blocker</option>
            <option value="Libero">Libero</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#111827]">Vertical *</label>
          <input
            type="text"
            value={formData.vertical}
            onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
            required
            placeholder='e.g., 30"'
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[#111827]">Weight *</label>
          <input
            type="text"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            required
            placeholder="e.g., 165 lbs"
            className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-base text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 touch-manipulation"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[#111827]">Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 500) })}
          rows={4}
          maxLength={500}
          placeholder="Tell us about yourself... (e.g., OVA 17U | Working on serve receive)"
          className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-[#111827] transition-all duration-200 focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 resize-none"
        />
        <p className="mt-2 text-xs text-[#6B7280]">{formData.bio.length}/500 characters</p>
      </div>

      <motion.button
        type="submit"
        disabled={saving}
        whileHover={{ scale: saving ? 1 : 1.02 }}
        whileTap={{ scale: saving ? 1 : 0.98 }}
        className="w-full rounded-xl bg-[#007AFF] px-6 py-3.5 text-white font-medium transition-all duration-200 hover:bg-[#0056CC] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed shadow-sm hover:shadow-md touch-manipulation min-h-[44px]"
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
