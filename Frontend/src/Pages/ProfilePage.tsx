import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../Components/LogoutButton";
import { supabase } from "../lib/supabaseClient";

type ProfileRow = {
  id: string;
  name?: string | null;
  level?: string | null;
  birthday?: string | null;
  avatar?: string | null;
};

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [joinDateISO, setJoinDateISO] = useState<string>("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load user and profile
  useEffect(() => {
    (async () => {
      setLoading(true);

      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        // Not logged in – go to auth page
        navigate("/auth");
        return;
      }

      setAuthEmail(user.email ?? "");
      setJoinDateISO(user.created_at ?? "");

      // Fetch profile row
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, name, level, birthday, avatar")
        .eq("id", user.id)
        .single();

      if (profErr) {
        console.error("Failed to load profile:", profErr);
      } else {
        setProfile(prof as ProfileRow);
      }

      setLoading(false);
    })();
  }, [navigate]);

  // Helpers
  function formatDateForUI(iso?: string) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  }
  async function refreshProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, name, level, birthday, avatar")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as ProfileRow);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadErr) { alert("Upload failed: " + uploadErr.message); return; }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar: publicUrl })
        .eq("id", profile.id);

      if (updateErr) { alert("Failed to save avatar: " + updateErr.message); return; }

      await refreshProfile();
    } finally {
      setUploadingAvatar(false);
    }
  }
  async function handleEditEmail() {
    const newEmail = window.prompt("Enter a new email:", authEmail);
    if (!newEmail || newEmail === authEmail) return;

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      alert(`Email update failed: ${error.message}`);
      return;
    }
    setAuthEmail(newEmail);
  }

  async function handleEditPassword() {
    const newPassword = window.prompt("Enter a new password:");
    if (!newPassword) return;

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      alert(`Password update failed: ${error.message}`);
      return;
    }
    alert("Password updated!");
  }

  async function handleEditBirthday() {
    if (!profile) return;
    const current = profile.birthday ?? "";
    const newBirthday = window.prompt(
      "Enter your birthday (YYYY-MM-DD):",
      current
    );
    if (!newBirthday || newBirthday === current) return;

    const { error } = await supabase
      .from("profiles")
      .update({ birthday: newBirthday })
      .eq("id", profile.id);

    if (error) {
      alert(`Birthday update failed: ${error.message}`);
      return;
    }
    await refreshProfile();
    alert("Birthday updated!");
  }

  return (
    <section className="absolute inset-0 flex flex-col justify-center items-center bg-gradient-to-br from-green-200 to-amber-400 text-gray-800 overflow-hidden">
      <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-10 w-full max-w-xl relative mx-4 sm:mx-0">
        {/* Return button */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/tasks")}
            className="font-semibold bg-gray-200 px-5 py-2 h-[40px] rounded-full text-l shadow-lg hover:bg-amber-800 hover:text-white transition-all"
          >
            ← Back to List
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-600">Loading profile…</div>
        ) : !profile ? (
          <div className="py-8 text-center text-red-600">
            Profile not found. Try logging out and in again.
          </div>
        ) : (
          <>
            {/* Avatar + Gear */}
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              {/* Avatar + Info */}
              <div className="flex items-center space-x-4">
                <label className="relative w-24 h-24 rounded-full cursor-pointer group">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-3xl">🧙‍♂️</div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                    {uploadingAvatar ? "Uploading…" : "Change"}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                <div>
                  <h2 className="text-2xl font-bold">{profile.name ?? "User Name"}</h2>
                  <p className="text-gray-600">{profile.level ?? "Level 1"}</p>
                </div>
              </div>

              {/* View Gear */}
              <div
                onClick={() => navigate("/equipment")}
                className="px-5 py-3 bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600 transition cursor-pointer flex items-center justify-center text-base"
              >
                ⚔️ View Gear
              </div>
            </div>

            {/* Info List */}
            <div className="space-y-3">
              {/* Email */}
              <div className="flex items-center gap-2">
                <span className="font-semibold bg-gray-200 px-3 py-2 rounded-lg w-24 text-center text-sm shrink-0">
                  Email
                </span>
                <span className="flex-1 truncate text-sm">{authEmail || "—"}</span>
                <button
                  className="bg-gray-200 px-3 py-1 rounded-lg text-sm hover:bg-gray-300 shrink-0"
                  onClick={handleEditEmail}
                >
                  Edit ✎
                </button>
              </div>

              {/* Password */}
              <div className="flex items-center gap-2">
                <span className="font-semibold bg-gray-200 px-3 py-2 rounded-lg w-24 text-center text-sm shrink-0">
                  Password
                </span>
                <span className="flex-1 text-sm">********</span>
                <button
                  className="bg-gray-200 px-3 py-1 rounded-lg text-sm hover:bg-gray-300 shrink-0"
                  onClick={handleEditPassword}
                >
                  Edit ✎
                </button>
              </div>

              {/* Birthday */}
              <div className="flex items-center gap-2">
                <span className="font-semibold bg-gray-200 px-3 py-2 rounded-lg w-24 text-center text-sm shrink-0">
                  Birthday
                </span>
                <span className="flex-1 text-sm">
                  {profile.birthday ? profile.birthday : "Not set"}
                </span>
                <button
                  className="bg-gray-200 px-3 py-1 rounded-lg text-sm hover:bg-gray-300 shrink-0"
                  onClick={handleEditBirthday}
                >
                  Edit ✎
                </button>
              </div>

              {/* Join Date */}
              <div className="flex items-center gap-2">
                <span className="font-semibold bg-gray-200 px-3 py-2 rounded-lg w-24 text-center text-sm shrink-0">
                  Join Date
                </span>
                <span className="flex-1 text-sm">{formatDateForUI(joinDateISO)}</span>
              </div>
              <div className="flex justify-end">
                <LogoutButton />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Profile;