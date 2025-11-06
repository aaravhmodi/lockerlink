"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";

interface UserProfile {
  name: string;
  team: string;
  age: number;
  city: string;
  position: string;
  bio: string;
  photoURL?: string;
}

export default function ProfileForm() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    name: "",
    team: "",
    age: 17,
    city: "",
    position: "",
    bio: "",
    photoURL: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setFormData(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      let photoURL = formData.photoURL;

      // Upload photo if selected
      if (photoFile) {
        const photoRef = ref(storage, `profiles/${user.uid}/${Date.now()}`);
        await uploadBytes(photoRef, photoFile);
        photoURL = await getDownloadURL(photoRef);
      }

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        ...formData,
        photoURL,
      });

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading profile...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
        />
        {formData.photoURL && (
          <img
            src={formData.photoURL}
            alt="Profile"
            className="mt-2 h-24 w-24 rounded-full object-cover"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Team</label>
        <input
          type="text"
          value={formData.team}
          onChange={(e) => setFormData({ ...formData, team: e.target.value })}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Age</label>
        <input
          type="number"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
          required
          min="13"
          max="19"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">City</label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Position</label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select position</option>
          <option value="Setter">Setter</option>
          <option value="Outside Hitter">Outside Hitter</option>
          <option value="Opposite">Opposite</option>
          <option value="Middle Blocker">Middle Blocker</option>
          <option value="Libero">Libero</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-400"
      >
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}

