import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Close menu whenever route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const loggedIn = [
    { name: "Home", path: "/" },
    { name: "Daily Quest", path: "/daily" },
    { name: "Shop", path: "/shop" },
    { name: "Calendar", path: "/calendar" },
    { name: "About", path: "/about" },
  ];
  const loggedOut = [
    { name: "Home", path: "/" },
    { name: "Sign In / Sign Up", path: "/auth" },
    { name: "About", path: "/about" },
  ];

  const links = currentUser ? loggedIn : loggedOut;

  const goTo = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-sm shadow-sm z-50">
      <div className="w-full px-4 sm:px-6 py-3 flex items-center">
        {/* Logo */}
        <span
          onClick={() => goTo("/")}
          className="text-xl sm:text-2xl font-bold text-amber-800 cursor-pointer mr-4"
        >
          FocusQuest
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {/* Desktop links */}
          <div className="hidden md:flex gap-x-6 items-center">
            {links.map((link) => (
              <button
                key={link.name}
                onClick={() => goTo(link.path)}
                className={`text-base font-medium transition-all ${
                  location.pathname === link.path
                    ? "text-amber-800 underline underline-offset-4"
                    : "text-gray-700 hover:text-amber-800"
                }`}
              >
                {link.name}
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-amber-900 font-bold text-2xl leading-none px-1"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          {/* Profile avatar (logged in only) */}
          {currentUser && (
            <button
              onClick={() => goTo("/profile")}
              className="w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <span className="text-lg">🧙‍♂️</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3 flex flex-col gap-1">
          {links.map((link) => (
            <button
              key={link.name}
              onClick={() => goTo(link.path)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
                location.pathname === link.path
                  ? "bg-amber-100 text-amber-900"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {link.name}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
