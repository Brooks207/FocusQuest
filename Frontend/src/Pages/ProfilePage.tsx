import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { navigate("/auth"); return; }
      setAuthEmail(user.email ?? "");
      setJoinDateISO(user.created_at ?? "");
      const { data } = await supabase.from("profiles").select("id, name, level, birthday, avatar").eq("id", user.id).single();
      if (data) setProfile(data as ProfileRow);
      setLoading(false);
    })();
  }, [navigate]);

  const refreshProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("id, name, level, birthday, avatar").eq("id", user.id).single();
    if (data) setProfile(data as ProfileRow);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) { alert("Upload failed: " + uploadErr.message); return; }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updateErr } = await supabase.from("profiles").update({ avatar: publicUrl }).eq("id", profile.id);
      if (updateErr) { alert("Failed to save avatar: " + updateErr.message); return; }
      await refreshProfile();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleEditEmail = async () => {
    const newEmail = window.prompt("Enter a new email:", authEmail);
    if (!newEmail || newEmail === authEmail) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) { alert(`Email update failed: ${error.message}`); return; }
    setAuthEmail(newEmail);
  };

  const handleEditPassword = async () => {
    const newPassword = window.prompt("Enter a new password:");
    if (!newPassword) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { alert(`Password update failed: ${error.message}`); return; }
    alert("Password updated!");
  };

  const handleEditBirthday = async () => {
    if (!profile) return;
    const newBirthday = window.prompt("Enter your birthday (YYYY-MM-DD):", profile.birthday ?? "");
    if (!newBirthday || newBirthday === profile.birthday) return;
    const { error } = await supabase.from("profiles").update({ birthday: newBirthday }).eq("id", profile.id);
    if (error) { alert(`Birthday update failed: ${error.message}`); return; }
    await refreshProfile();
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  return (
    <section className="min-h-dvh bg-gradient-to-br from-green-200 to-amber-400 flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-sm">

        {/* Back button */}
        <button
          onClick={() => navigate("/daily")}
          className="mb-4 text-amber-900 font-semibold text-sm flex items-center gap-1 hover:underline"
        >
          ← Daily Quest
        </button>

        {loading ? (
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center text-gray-500">Loading…</div>
        ) : !profile ? (
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center text-red-600">Profile not found.</div>
        ) : (
          <>
            {/* Hero card */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl shadow-xl p-6 mb-4 text-white">
              <div className="flex flex-col items-center gap-3">
                {/* Avatar */}
                <label className="relative w-24 h-24 rounded-full cursor-pointer group shrink-0">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white/40" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-amber-400/60 border-4 border-white/40 flex items-center justify-center text-4xl">🧙‍♂️</div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold">
                    {uploadingAvatar ? "Uploading…" : "Change"}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>

                <div className="text-center">
                  <h2 className="text-2xl font-bold leading-tight">{profile.name ?? "Adventurer"}</h2>
                  <span className="inline-block mt-1 bg-white/25 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Level {profile.level ?? 1}
                  </span>
                </div>
              </div>
            </div>

            {/* Info card */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-4">
              <InfoRow label="Email" value={authEmail || "—"} onEdit={handleEditEmail} />
              <InfoRow label="Password" value="••••••••" onEdit={handleEditPassword} />
              <InfoRow label="Birthday" value={profile.birthday ?? "Not set"} onEdit={handleEditBirthday} />
              <InfoRow label="Joined" value={formatDate(joinDateISO)} />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/equipment")}
                className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-semibold shadow hover:bg-amber-600 active:bg-amber-700 transition text-sm"
              >
                ⚔️ Equipment
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
                className="flex-1 py-3 bg-gray-800 text-white rounded-2xl font-semibold shadow hover:bg-gray-900 active:bg-black transition text-sm"
              >
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const InfoRow: React.FC<{ label: string; value: string; onEdit?: () => void }> = ({ label, value, onEdit }) => (
  <div className="flex items-center px-5 py-3.5 border-b border-gray-100 last:border-0">
    <span className="w-24 text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">{label}</span>
    <span className="flex-1 text-sm text-gray-800 truncate">{value}</span>
    {onEdit && (
      <button
        onClick={onEdit}
        className="ml-2 text-xs text-amber-600 font-semibold hover:text-amber-800 shrink-0"
      >
        Edit
      </button>
    )}
  </div>
);

export default Profile;
