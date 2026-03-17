import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user ?? null;
    setCurrentUser(user);
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("avatar").eq("id", user.id).single();
      setAvatarUrl(prof?.avatar ?? null);
    } else {
      setAvatarUrl(null);
    }
  };

  useEffect(() => {
  loadUser();

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setCurrentUser(session?.user ?? null);
    }
  );

  return () => listener.subscription.unsubscribe();
  }, []);

  const loggedIn = [
    { name: "Home", path: "/" },
    { name: "Daily Quest", path: "/daily"},
    { name: "Shop", path: "/shop"},
    { name: "Calendar", path: "/calendar"},
    { name: "About", path: "/about" },
  ];
  const loggedOut = [
    { name: "Home", path: "/" },
    { name: "Sign In / Sign Up", path: "/auth"},
    { name: "About", path: "/about" },
  ]
  const navClass = "fixed top-0 left-0 w-full z-50 glass border-b border-white/20 shadow-lg"

  if (currentUser) {
    return (
      <nav className={navClass}>
        <div className="w-full px-6 py-3 flex items-center">
          <span
            onClick={() => navigate("/")}
            className="text-2xl font-bold text-white cursor-pointer mr-4 drop-shadow"
          >
            FocusQuest
          </span>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-x-2 items-center">
              {loggedIn.map((link) => (
                <button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    location.pathname === link.path
                      ? "bg-white/25 text-white border border-white/40"
                      : "text-white/75 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {link.name}
                </button>
              ))}
            </div>

            <button
              className="md:hidden text-white font-bold text-xl"
              onClick={() => alert("Open menu (to implement later!)")}
            >
              ☰
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full glass-btn flex items-center justify-center overflow-hidden shadow-lg"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-xl">🧙‍♂️</span>
              )}
            </button>
          </div>
        </div>
      </nav>
    );
  } else {
    return (
      <nav className={navClass}>
        <div className="w-full px-6 py-3 flex items-center">
          <span
            onClick={() => navigate("/")}
            className="text-2xl font-bold text-white cursor-pointer mr-4 drop-shadow"
          >
            FocusQuest
          </span>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="hidden md:flex gap-x-2 items-center">
              {loggedOut.map((link) => (
                <button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    location.pathname === link.path
                      ? "bg-white/25 text-white border border-white/40"
                      : "text-white/75 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {link.name}
                </button>
              ))}
            </div>

            <button
              className="md:hidden text-white font-bold text-xl"
              onClick={() => alert("Open menu (to implement later!)")}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>
    );
  }
};

export default Navbar;
