import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getCurrency } from "../lib/xp";
import { getOrCreateRotation, getRotationItems, getUserPurchasesInRotation, purchaseItem } from "../lib/shop";
import type { ShopItem, ShopRotation } from "../lib/shop";

function useCountdown(refreshesAt: string | null) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!refreshesAt) return;
    const tick = () => {
      const diff = new Date(refreshesAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Refreshing…"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [refreshesAt]);
  return timeLeft;
}

const TYPE_COLORS: Record<string, string> = {
  weapon: "bg-rose-100 text-rose-700",
  armor: "bg-blue-100 text-blue-700",
  consumable: "bg-emerald-100 text-emerald-700",
};

const Shop: React.FC = () => {
  const navigate = useNavigate();
  const [gold, setGold] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [rotation, setRotation] = useState<ShopRotation | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchased, setPurchased] = useState<number[]>([]); // item_ids bought this rotation
  const [ownedEquipment, setOwnedEquipment] = useState<number[]>([]); // non-consumables already owned
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

  const countdown = useCountdown(rotation?.refreshes_at ?? null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setUserId(uid);

      const [rot, balance] = await Promise.all([
        getOrCreateRotation(),
        uid ? getCurrency(uid) : Promise.resolve(0),
      ]);
      setRotation(rot);
      setGold(balance);

      const [rotItems, boughtIds] = await Promise.all([
        getRotationItems(rot.item_ids),
        uid ? getUserPurchasesInRotation(uid, rot.id) : Promise.resolve([]),
      ]);
      setItems(rotItems);
      setPurchased(boughtIds);

      // load owned non-consumable ids
      if (uid) {
        const { data: inv } = await supabase
          .from('user_inventory')
          .select('item_id, shop_items(type)')
          .eq('user_id', uid);
        const owned = (inv || [])
          .filter((r: any) => r.shop_items?.type !== 'consumable')
          .map((r: any) => r.item_id);
        setOwnedEquipment(owned);
      }
    } catch (e) {
      console.error('Shop load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (item: ShopItem) => {
    if (!userId || !rotation) return;
    setBuying(item.id);
    try {
      const result = await purchaseItem(userId, item.id, rotation.id);
      if (result.error) {
        setFlash({ id: item.id, msg: result.error, ok: false });
      } else {
        setGold(result.new_currency ?? gold);
        setPurchased(prev => [...prev, item.id]);
        setFlash({ id: item.id, msg: "Purchased!", ok: true });
        if (item.type !== 'consumable') setOwnedEquipment(prev => [...prev, item.id]);
      }
    } catch (e) {
      setFlash({ id: item.id, msg: "Purchase failed", ok: false });
    } finally {
      setBuying(null);
      setTimeout(() => setFlash(null), 2500);
    }
  };

  const getItemState = (item: ShopItem): 'buy' | 'purchased' | 'owned' | 'broke' => {
    if (purchased.includes(item.id)) return 'purchased';
    if (item.type !== 'consumable' && ownedEquipment.includes(item.id)) return 'owned';
    if (gold < item.price) return 'broke';
    return 'buy';
  };

  return (
    <section className="min-h-dvh w-full bg-gradient-to-br from-green-200 to-amber-400 pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-gray-900">Item Shop</h1>
          <div className="bg-white rounded-2xl px-4 py-2 shadow flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-lg font-bold text-amber-800">{gold}</span>
          </div>
        </div>

        {/* Rotation timer */}
        <div className="bg-white/70 backdrop-blur rounded-2xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">🔄 Shop refreshes in</span>
          <span className="font-bold text-amber-800 tabular-nums">{countdown || "…"}</span>
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading shop…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map(item => {
              const state = getItemState(item);
              const isFlashing = flash?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 shadow flex flex-col gap-2 relative transition-all ${
                    state === 'purchased' || state === 'owned' ? 'opacity-60' : ''
                  }`}
                >
                  {/* Type badge */}
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type] ?? ''}`}>
                    {item.type}
                  </span>

                  <div className="text-4xl mt-1">{item.icon}</div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm leading-tight">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                  </div>

                  <div className="flex items-center gap-1 mt-auto">
                    <span className="text-base">💰</span>
                    <span className="font-bold text-amber-700 text-sm">{item.price}</span>
                  </div>

                  {/* Flash message */}
                  {isFlashing && (
                    <div className={`text-xs font-semibold text-center py-1 rounded-lg ${flash!.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                      {flash!.msg}
                    </div>
                  )}

                  {/* Buy button */}
                  {state === 'purchased' && (
                    <div className="w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold text-center">
                      Purchased
                    </div>
                  )}
                  {state === 'owned' && (
                    <div className="w-full py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold text-center">
                      Owned
                    </div>
                  )}
                  {(state === 'buy' || state === 'broke') && (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={state === 'broke' || buying === item.id}
                      className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                        state === 'broke'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700'
                      }`}
                    >
                      {buying === item.id ? '…' : state === 'broke' ? 'Not enough gold' : 'Buy'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Nav */}
        <button
          onClick={() => navigate("/equipment")}
          className="w-full py-3 bg-white text-amber-900 font-semibold rounded-2xl shadow hover:bg-amber-50 transition text-sm"
        >
          🎒 View Inventory
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-full py-3 bg-white/60 text-amber-900 font-medium rounded-2xl text-sm hover:bg-white/80 transition"
        >
          ← Back to Home
        </button>
      </div>
    </section>
  );
};

export default Shop;
