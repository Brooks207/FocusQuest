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
    <section className="absolute inset-0 flex flex-col justify-center items-center bg-gradient-to-br from-violet-600 via-purple-800 to-indigo-900 overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="glass rounded-3xl shadow-2xl p-10 w-full max-w-xl relative">
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="glass-btn text-white font-semibold px-5 py-2 rounded-full shadow-lg"
          >
            ← Back
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-white/60">Loading profile…</div>
        ) : !profile ? (
          <div className="py-8 text-center text-rose-300">
            Profile not found. Try logging out and in again.
          </div>
        ) : (
          <>
            {/* Avatar + Gear */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <label className="relative w-24 h-24 rounded-full cursor-pointer group">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover ring-2 ring-white/30" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-3xl">🧙‍♂️</div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                    {uploadingAvatar ? "Uploading…" : "Change"}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
                <div>
                  <h2 className="text-2xl font-bold text-white">{profile.name ?? "User Name"}</h2>
                  <p className="text-white/60">{profile.level ?? "Level 1"}</p>
                </div>
              </div>

              <div
                onClick={() => navigate("/equipment")}
                className="glass-btn text-white px-5 py-3 rounded-xl cursor-pointer flex items-center justify-center text-base"
              >
                ⚔️ View Gear
              </div>
            </div>

            {/* Info List */}
            <div className="space-y-3">
              {[
                { label: "Email", value: authEmail || "—", onEdit: handleEditEmail },
                { label: "Password", value: "••••••••", onEdit: handleEditPassword },
                { label: "Birthday", value: profile.birthday ?? "Not set", onEdit: handleEditBirthday },
              ].map(({ label, value, onEdit }) => (
                <div key={label} className="flex justify-between items-center bg-white/10 rounded-xl px-4 py-3">
                  <span className="font-semibold text-white/80 w-24">{label}</span>
                  <span className="flex-1 text-center text-white/70 truncate">{value}</span>
                  <button
                    className="glass-btn text-white text-sm px-3 py-1 rounded-lg"
                    onClick={onEdit}
                  >
                    Edit ✎
                  </button>
                </div>
              ))}

              <div className="flex justify-between items-center bg-white/10 rounded-xl px-4 py-3">
                <span className="font-semibold text-white/80 w-24">Join Date</span>
                <span className="flex-1 text-center text-white/70">{formatDateForUI(joinDateISO)}</span>
              </div>

              <div className="flex justify-end pt-2">
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