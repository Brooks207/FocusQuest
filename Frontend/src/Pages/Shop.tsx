import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getCurrency } from "../lib/xp";

const Shop: React.FC = () => {
  const navigate = useNavigate();
  const [gold, setGold] = useState<number | null>(null);
  const fetchGold = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setGold(0);
        return;
      }
      const userId = data.user.id;
      const balance = await getCurrency(userId);
      setGold(balance);
    } catch (e) {
      console.error('Failed to fetch currency', e);
      setGold(0);
    }
  }

  useEffect(() => {
    fetchGold();
  }, []);

  // Sample "coming soon" shop items
  const shopItems = [
    { id: 1, name: "Health Potion", icon: "🧪", price: 50 },
    { id: 2, name: "Magic Sword", icon: "⚔️", price: 200 },
    { id: 3, name: "Shield", icon: "🛡️", price: 150 },
    { id: 4, name: "Spell Book", icon: "📖", price: 300 },
    { id: 5, name: "Armor", icon: "🦺", price: 250 },
    { id: 6, name: "Bow & Arrow", icon: "🏹", price: 180 },
    { id: 7, name: "Magic Ring", icon: "💍", price: 400 },
    { id: 8, name: "Staff", icon: "🪄", price: 350 },
  ];

  return (
    <section className="min-h-dvh w-full flex flex-col justify-start items-center text-center bg-gradient-to-br from-green-200 to-amber-400 overflow-hidden pb-12">
      <div className="flex flex-col justify-start items-center gap-y-8 max-w-6xl w-full px-4 py-6">
        {/* Branding / Logo */}
        <span className="text-[26px] font-bold text-gray-800">
          FocusQuest
        </span>

        {/* Page Title */}
        <h1 className="text-5xl text-gray-900 font-extrabold leading-tight">
          Item Shop
        </h1>

        {/* Gold Display */}
        <div className="bg-white rounded-2xl px-8 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div className="text-left">
              <p className="text-sm text-gray-600">Your Gold</p>
              <p className="text-2xl font-bold text-amber-800">{gold}</p>
            </div>
          </div>
        </div>

        {/* Shop Items Grid */}
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {shopItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl flex flex-col items-center gap-3 relative"
              >
                {/* Coming Soon Badge */}
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  Coming Soon
                </div>

                {/* Item Icon */}
                <div className="text-6xl">{item.icon}</div>

                {/* Item Name */}
                <h3 className="text-lg font-bold text-gray-800">
                  {item.name}
                </h3>

                {/* Price */}
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <span className="text-lg font-semibold text-amber-700">
                    {item.price}
                  </span>
                </div>

                {/* Disabled Buy Button */}
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-full text-sm font-semibold cursor-not-allowed opacity-60"
                >
                  Purchase
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <button
          onClick={() => navigate("/")}
          className="bg-white text-amber-900 hover:bg-amber-800 hover:text-white transition-all px-8 py-4 rounded-full text-xl font-semibold shadow-lg cursor-pointer"
        >
          ← Back to Home
        </button>

      </div>
    </section>
  );
};

export default Shop;
