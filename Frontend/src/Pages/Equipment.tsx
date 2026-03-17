import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { setPlayerHp, getOrCreatePlayerStats } from "../lib/game";
import { getUserInventory, equipItem, unequipItem, useConsumable } from "../lib/shop";
import type { InventoryItem } from "../lib/shop";

const TYPE_LABEL: Record<string, string> = {
  weapon: "⚔️ Weapons",
  armor: "🛡️ Armor",
  consumable: "🧪 Consumables",
};

const Equipment: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id ?? null;
    setUserId(uid);
    if (uid) {
      const inv = await getUserInventory(uid);
      setInventory(inv);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2000);
  };

  const handleEquip = async (item: InventoryItem) => {
    if (!userId) return;
    setActing(item.id);
    try {
      if (item.equipped) {
        await unequipItem(userId, item.id);
      } else {
        await equipItem(userId, item.id, item.type);
      }
      await load();
    } finally {
      setActing(null);
    }
  };

  const handleUse = async (item: InventoryItem) => {
    if (!userId || item.hp_restore <= 0) return;
    setActing(item.id);
    try {
      const stats = await getOrCreatePlayerStats(userId);
      const currentHp = stats?.player_hp ?? 100;
      const newHp = currentHp + item.hp_restore;
      await setPlayerHp(userId, newHp);
      await useConsumable(userId, item.id);
      await load();
      showFlash(`+${item.hp_restore} HP restored!`);
    } finally {
      setActing(null);
    }
  };

  const grouped = Object.entries(
    inventory.reduce((acc, item) => {
      (acc[item.type] = acc[item.type] || []).push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>)
  );

  return (
    <section className="min-h-dvh bg-gradient-to-br from-green-200 to-amber-400 pb-12">
      <div className="max-w-sm mx-auto px-4 pt-6 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-gray-900">Inventory</h1>
          <button
            onClick={() => navigate("/shop")}
            className="text-sm text-amber-800 font-semibold hover:underline"
          >
            🛒 Shop
          </button>
        </div>

        {/* Flash */}
        {flash && (
          <div className="bg-emerald-100 text-emerald-800 text-sm font-semibold text-center py-2 rounded-xl">
            {flash}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : inventory.length === 0 ? (
          <div className="bg-white rounded-3xl shadow p-8 text-center">
            <div className="text-4xl mb-3">🎒</div>
            <p className="text-gray-500 text-sm">Your inventory is empty.</p>
            <button
              onClick={() => navigate("/shop")}
              className="mt-4 px-5 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold"
            >
              Visit Shop
            </button>
          </div>
        ) : (
          grouped.map(([type, typeItems]) => (
            <div key={type} className="bg-white rounded-3xl shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="font-bold text-gray-700 text-sm">{TYPE_LABEL[type] ?? type}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {typeItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-3xl shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm flex items-center gap-2 flex-wrap">
                        {item.name}
                        {item.equipped && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                            Equipped
                          </span>
                        )}
                        {item.type === 'consumable' && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded-full">
                            ×{item.quantity}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                    </div>

                    {item.type === 'consumable' ? (
                      <button
                        onClick={() => handleUse(item)}
                        disabled={acting === item.id}
                        className="shrink-0 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 transition"
                      >
                        {acting === item.id ? '…' : 'Use'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEquip(item)}
                        disabled={acting === item.id}
                        className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-xl transition disabled:opacity-50 ${
                          item.equipped
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700'
                        }`}
                      >
                        {acting === item.id ? '…' : item.equipped ? 'Unequip' : 'Equip'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <button
          onClick={() => navigate("/profile")}
          className="w-full py-3 bg-white/60 text-amber-900 font-medium rounded-2xl text-sm hover:bg-white/80 transition"
        >
          ← Back to Profile
        </button>
      </div>
    </section>
  );
};

export default Equipment;
