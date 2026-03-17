import React, { useState, useEffect, useRef } from "react";
import { addXp, addCurrency, getXp, getLevelInfo } from '../lib/xp';
import { supabase } from '../lib/supabaseClient';
import NewTaskModal from '../Components/NewTaskModal';
import { computeNextDue, isDueOnDate } from '../lib/recurrence'
import { playDelete, playDeleteAll, playComplete, playAdd } from '../lib/sounds';
import { getOrCreatePlayerStats, incrementEnemiesDefeated, setPlayerHp, setLastEnemyRound, setEnemyHp } from '../lib/game';
import { getEquippedStats } from '../lib/shop';

// --- Types ---
interface Quest {
  id: string;
  title: string;
  reward?: string;
  completed?: boolean;
  dmg?: number; // damage dealt when completed
  xp: number; // XP reward for completing this quest
  repeatCount?: number | null
  difficulty?: number
  recurrence?: any
}

// mapping difficulty -> xp/dmg (used locally to decide awards)
const DIFFICULTY_MAP: Record<number, { xp: number; dmg: number; gold: number }> = {
  1: { xp: 8,  dmg: 10, gold: 5  },
  2: { xp: 15, dmg: 18, gold: 12 },
  3: { xp: 28, dmg: 32, gold: 25 },
  4: { xp: 45, dmg: 50, gold: 45 },
}

// Enemy counter-attack: hits player for (enemyLevel × BASE) − defense, min 1
// Missed-task penalty per task:  same formula × difficulty multiplier
const ENEMY_COUNTER_BASE = 4   // HP lost per enemy level on task completion
const MISSED_PENALTY_BASE = 6  // HP lost per enemy level per missed task (scaled by difficulty)

const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#10B981',
  2: '#F59E0B',
  3: '#F97316',
  4: '#EF4444',
}
const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Very Hard'
}

/* questComplete helper removed (not used here) */

// --- UI Primitives ---
const Card: React.FC<React.PropsWithChildren<{ title?: string; className?: string }>> = ({ title, className, children }) => (
  <div className={`bg-white/90 backdrop-blur rounded-2xl shadow-xl p-5 md:p-6 ${className || ""}`}>
    {title && <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">{title}</h2>}
    {children}
  </div>
);

const StatChip: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-xl bg-white border border-gray-200 px-3 py-2 text-center">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-sm font-bold text-gray-800">{value}</div>
  </div>
);

// --- Battle ---
const MonsterBattle: React.FC<{
  maxHP: number; hp: number; reward: string; xp: number;
  enemyLevel: number; playerAttack: number; baseAttack: number; defense: number;
  lastCounterDmg?: number | null;
  lastPlayerDmg?: number | null;
  attackTick?: number;
}>
= ({ maxHP, hp, reward, enemyLevel, playerAttack, baseAttack, defense, lastCounterDmg, lastPlayerDmg, attackTick }) => {
  const pct = Math.max(0, Math.min(100, (hp / maxHP) * 100));

  // delay transition so HP bar doesn't animate from 0% on mount/remount
  const [barReady, setBarReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // animation phase: idle → playerAttack (player lunges + enemy shakes) → enemyAttack (enemy lunges + player shakes)
  const [phase, setPhase] = useState<'idle' | 'playerAttack' | 'enemyAttack'>('idle');
  const [showPlayerHurt, setShowPlayerHurt] = useState(false);
  const [showEnemyHurt, setShowEnemyHurt] = useState(false);

  // trigger sequence on every attack tick (tick always increments so same-damage rapid attacks work)
  useEffect(() => {
    if (attackTick == null || attackTick === 0) return;
    setPhase('playerAttack');
    setShowEnemyHurt(true);
    const t1 = setTimeout(() => { setPhase('enemyAttack'); setShowEnemyHurt(false); setShowPlayerHurt(true); }, 380);
    const t2 = setTimeout(() => { setPhase('idle'); setShowPlayerHurt(false); }, 750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [attackTick]);

  const counterHit = Math.max(1, enemyLevel * ENEMY_COUNTER_BASE - defense);
  const rows = [
    { diff: 'Easy',      color: '#10B981', playerDmg: Math.round(10 * playerAttack / baseAttack) },
    { diff: 'Medium',    color: '#F59E0B', playerDmg: Math.round(18 * playerAttack / baseAttack) },
    { diff: 'Hard',      color: '#F97316', playerDmg: Math.round(32 * playerAttack / baseAttack) },
    { diff: 'Very Hard', color: '#EF4444', playerDmg: Math.round(50 * playerAttack / baseAttack) },
  ];

  return (
    <div className="relative bg-gradient-to-br from-green-100 via-emerald-100 to-amber-100 p-4 rounded-2xl border border-green-300 space-y-3 shadow-lg overflow-hidden">

      {/* Full-arena red flash when player is hurt */}
      {showPlayerHurt && (
        <div className="absolute inset-0 rounded-2xl bg-red-500 animate-hurt-flash pointer-events-none z-10" />
      )}

      {/* Enemy HP bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">👹</span>
            <span className="font-fantasy text-sm font-bold text-gray-800 tracking-wide">
              Lv.{enemyLevel} Shadow Fiend
            </span>
            {pct < 25 && <span className="text-base leading-none animate-pulse">💀</span>}
          </div>
          <span className={`inline-flex font-mono text-xs font-bold px-2 py-0.5 rounded-full transition-colors duration-150 ${showEnemyHurt ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'}`}>
            {hp}/{maxHP}
          </span>
        </div>
        <div className="h-4 bg-gray-300/70 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 shadow-sm ${barReady ? 'transition-[width] duration-500' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Battle arena */}
      <div className="relative flex justify-between items-end bg-gradient-to-b from-cyan-300/60 to-blue-200/60 rounded-2xl px-5 py-4 border border-cyan-300/50 shadow-inner overflow-visible">
        <div className="absolute bottom-3 left-4 right-4 h-px bg-cyan-400/40 rounded-full" />

        {/* Player */}
        <div className="relative flex flex-col items-center gap-0.5">
          {/* Counter-damage float — big red, floats up */}
          {lastCounterDmg != null && lastCounterDmg > 0 && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl font-black text-red-600 drop-shadow-lg whitespace-nowrap animate-float-up z-20 pointer-events-none"
              style={{ textShadow: '0 0 8px rgba(220,38,38,0.6)' }}>
              -{lastCounterDmg}💔
            </span>
          )}
          <span className={`text-5xl leading-none drop-shadow-md select-none transition-all
            ${phase === 'playerAttack' ? 'animate-player-attack' : ''}
            ${phase === 'enemyAttack'  ? 'animate-hurt-shake'   : ''}
          `}>🧍‍♂️</span>
          <span className="text-[9px] font-pixel text-cyan-800 leading-none">YOU</span>
        </div>

        {/* VS badge */}
        <div className="z-10 flex-shrink-0">
          <span className="font-fantasy text-base font-black text-white bg-gradient-to-br from-amber-400 to-orange-500 rounded-full w-9 h-9 flex items-center justify-center shadow-lg border-2 border-white/60">
            VS
          </span>
        </div>

        {/* Enemy */}
        <div className="relative flex flex-col items-center gap-0.5">
          {/* Player-damage float — big green, floats up from enemy */}
          {lastPlayerDmg != null && lastPlayerDmg > 0 && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl font-black text-green-600 drop-shadow-lg whitespace-nowrap animate-float-up z-20 pointer-events-none"
              style={{ textShadow: '0 0 8px rgba(22,163,74,0.6)' }}>
              -{lastPlayerDmg}⚔️
            </span>
          )}
          <span className={`text-5xl leading-none drop-shadow-md select-none transition-all
            ${phase === 'playerAttack' ? 'animate-hurt-shake'  : ''}
            ${phase === 'enemyAttack'  ? 'animate-enemy-attack': ''}
            ${pct < 25 && phase === 'idle' ? 'animate-pulse' : ''}
          `}>👹</span>
          <span className="text-[9px] font-pixel text-cyan-800 leading-none">ENEMY</span>
        </div>
      </div>

      {/* Reward pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-500 shrink-0">Drops:</span>
        {reward.split(',').map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
            🎁 {item.trim()}
          </span>
        ))}
      </div>

      {/* Combat rules */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 space-y-2 border border-white/80 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-fantasy text-xs font-bold text-gray-700 tracking-wide">⚔️ Combat Rules</span>
          <span className="text-[10px] text-gray-400 italic">Defense reduces incoming dmg</span>
        </div>
        <div className="grid grid-cols-3 text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">
          <span>Difficulty</span>
          <span className="text-center text-green-700">⚔️ You deal</span>
          <span className="text-center text-red-600">💥 Enemy hits</span>
        </div>
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.diff} className="grid grid-cols-3 items-center bg-white/80 rounded-xl px-2 py-1.5 border border-gray-100 shadow-sm">
              <span className="text-xs font-black leading-none" style={{ color: r.color }}>{r.diff}</span>
              <span className="text-center text-xs font-black text-green-700 bg-green-50 rounded-lg py-0.5 mx-1">+{r.playerDmg}</span>
              <span className="text-center text-xs font-black text-red-600 bg-red-50 rounded-lg py-0.5 mx-1">-{counterHit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Quest Toggle ---
const QuestToggle: React.FC<{ q: Quest; onToggle?: (id: string) => void; onDelete?: (id: string) => void }>
= ({ q, onToggle, onDelete }) => {
  const diff = q.difficulty || 1
  const diffColor = DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS[1]
  const diffLabel = DIFFICULTY_LABEL[diff] || DIFFICULTY_LABEL[1]
  const recurrenceText = (() => {
    if (!q.recurrence) return null
    try {
      const r = q.recurrence
      if (r.type === 'daily') return 'Daily'
      if (r.type === 'every_n_days') return `Every ${r.interval || 1} days`
      if (r.type === 'weekly') return 'Weekly'
      if (r.type === 'one-time') return 'One-time'
    } catch (e) {
      return null
    }
    return null
  })()

  return (
    <label
      className={`group flex flex-col gap-2 p-3 rounded-xl border transition hover:shadow ${q.completed ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="w-5 h-5 rounded border-gray-300 shrink-0"
          checked={!!q.completed}
          onChange={() => onToggle?.(q.id)}
        />
        <span className={`flex-1 text-base sm:text-lg ${q.completed ? "line-through text-gray-500" : "text-gray-800"}`}>{q.title}</span>

        {/* delete button */}
        {onDelete && (
          <button
            type="button"
            onClick={e => { e.preventDefault(); onDelete(q.id) }}
            className="text-red-400 hover:text-red-600 transition-colors px-1 text-lg leading-none shrink-0"
            title="Delete task"
          >
            ✕
          </button>
        )}
      </div>

      {/* Badges row — wraps on small screens */}
      <div className="flex flex-wrap gap-1.5 pl-8">
        <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ backgroundColor: diffColor }}>{diffLabel}</span>

        {typeof q.dmg === "number" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">{q.dmg} dmg</span>
        )}
        {q.reward && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">{q.reward}</span>
        )}
        {recurrenceText && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">{recurrenceText}</span>
        )}
      </div>
    </label>
  )
}

// --- Page ---
const DailyQuestPage: React.FC = () => {
  // XP fetched from database (displayed as x/100 for now)
  const [userXp, setUserXp] = useState<number>(0)
  const [profileName, setProfileName] = useState<string>('Adventurer')

  // Fetch current user's XP
  const fetchCurrentXp = async () => {
    try {
      const { data } = await supabase.auth.getUser()
      if (!data?.user) return
      const userId = data.user.id
      const xp = await getXp(userId)
      setUserXp(xp)
      const { data: prof } = await supabase.from('profiles').select('name').eq('id', userId).single()
      if (prof?.name) setProfileName(prof.name)
    } catch (e) {
      console.error('Failed to fetch current XP', (e as Error).message)
    }
  }

  useEffect(() => {
    fetchCurrentXp()
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        const bonuses = await getEquippedStats(data.user.id)
        setEquippedBonuses(bonuses)
      }
    })()
  }, [])

  // Derived level/progress info
  const levelInfo = getLevelInfo(userXp)
  const currentLevel = levelInfo.level
  const xpIntoLevel = levelInfo.xpIntoLevel
  const xpNeededForNext = levelInfo.xpForNextLevel
  const pctToNext = xpNeededForNext > 0 ? Math.round((xpIntoLevel / xpNeededForNext) * 100) : 0

  // Tasks from DB
  const [tasks, setTasks] = useState<any[]>([])
  const [, setLoadingTasks] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)

  // Player & Enemy stats (static for now)
  // Player & Enemy base stats and scaling
  const BASE_ATTACK = 10 // base attack for level 1
  const ATTACK_PER_LEVEL = 3 // additional attack per level
  const BASE_HP = 100 // base max HP for level 1
  const HP_PER_LEVEL = 10 // additional max HP per level
  const ENEMY_MAX_HP = 100;

  // Game state: player HP, enemy list, loot
  interface Enemy {
    id: number;
    name: string;
    level: number;
    maxHP: number;
    hp: number;
    isBoss?: boolean;
    drops: Array<{ type: 'gold'|'xp'|'item'; amount?: number; name?: string }>;
  }

  const [playerHP, setPlayerHP] = useState<number>(100)
  const [equippedBonuses, setEquippedBonuses] = useState({ attack_bonus: 0, defense_bonus: 0 })
  const [lastCounterDmg, setLastCounterDmg] = useState<number | null>(null)
  const [lastPlayerDmg, setLastPlayerDmg] = useState<number | null>(null)
  const [attackTick, setAttackTick] = useState(0)
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [enemyRound, setEnemyRound] = useState<number>(1)
  const [loot, setLoot] = useState<Array<{ type: string; amount?: number; name?: string }>>([])
  const enemiesRef = useRef<Enemy[]>([])
  const playerHPRef = useRef<number>(100)

  // Helpers for enemy generation
  // deterministic seeded RNG (mulberry32) so enemy generated for (userId, round) is stable until defeat
  const seededRng = (seed: number) => {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
      return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
  }

  const randIntSeeded = (seedFunc: () => number, min: number, max: number) => Math.floor(seedFunc() * (max - min + 1)) + min

  const spawnEnemy = (round: number, seedKey?: string): Enemy => {
    const useSeed = typeof seedKey === 'string' && seedKey.length > 0
    let rng = Math.random
    if (useSeed) {
      // derive numeric seed from seedKey + round
      let s = 0
      const key = `${seedKey}:${round}`
      for (let i = 0; i < key.length; i++) s = ((s << 5) - s) + key.charCodeAt(i)
      rng = seededRng(s)
    }

    const isBoss = round % 5 === 0
    const base = ENEMY_MAX_HP + (round - 1) * 15
    const hp = isBoss ? Math.round(base * 1.8) : base + (useSeed ? randIntSeeded(rng, -10, 10) : Math.floor((Math.random()*21)-10))
    const level = 1 + Math.floor((round - 1) / 2)
    const name = isBoss ? `Boss ${Math.floor(round/5)}` : `Goblin ${round}`
    const drops = [] as Enemy['drops']
    const goldAmount = useSeed ? randIntSeeded(rng, isBoss ? 80 : 8, isBoss ? 160 : 30) : (isBoss ? Math.floor(80+Math.random()*80) : Math.floor(8+Math.random()*22))
    const xpAmount = useSeed ? randIntSeeded(rng, isBoss ? 50 : 10, isBoss ? 120 : 30) : (isBoss ? Math.floor(50+Math.random()*70) : Math.floor(10+Math.random()*20))
    drops.push({ type: 'gold', amount: goldAmount })
    drops.push({ type: 'xp', amount: xpAmount })
    if (isBoss) drops.push({ type: 'item', name: 'Mystery Key' })
    return { id: round, name, level, maxHP: hp, hp, isBoss, drops }
  }

  // Initialize enemy and load player stats on mount (persisted state)
  useEffect(() => {
    (async () => {
      try {
  const { data } = await supabase.auth.getUser()
        const userId = data?.user?.id
        if (!userId) {
          // not logged in: spawn a transient enemy
          setEnemies([spawnEnemy(enemyRound)])
          return
        }

        const stats = await getOrCreatePlayerStats(userId)
        const persistedRound = stats?.last_enemy_round && stats.last_enemy_round > 0 ? stats.last_enemy_round : 1
        const persistedHp = stats?.player_hp ?? 100
        const persistedEnemyHp = (stats as any)?.current_enemy_hp ?? null
        setEnemyRound(persistedRound)
        playerHPRef.current = persistedHp
        setPlayerHP(persistedHp)
        // spawn enemy deterministically, then if DB has a saved enemy HP, use it
        const enemy = spawnEnemy(persistedRound, userId)
        if (typeof persistedEnemyHp === 'number') {
          enemy.hp = persistedEnemyHp
        }
        setEnemies([enemy])

        // if DB had 0 for last_enemy_round, persist initial
        if (!stats?.last_enemy_round || stats.last_enemy_round === 0) {
          await setLastEnemyRound(userId, persistedRound)
        }
      } catch (e) {
        console.error('Failed to initialize game state', e)
        // fallback to transient enemy
        setEnemies([spawnEnemy(enemyRound)])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep refs in sync so event handlers can read the latest values without stale closures
  useEffect(() => {
    enemiesRef.current = enemies
  }, [enemies])
  useEffect(() => {
    playerHPRef.current = playerHP
  }, [playerHP])

  // derive player attack and max HP from current level + equipped gear
  const playerAttack = BASE_ATTACK + Math.max(0, currentLevel - 1) * ATTACK_PER_LEVEL + equippedBonuses.attack_bonus
  const playerMaxHP = BASE_HP + Math.max(0, currentLevel - 1) * HP_PER_LEVEL

  // when level changes, scale current playerHP proportionally to the new max HP
  const prevLevelRef = React.useRef<number>(currentLevel)
  useEffect(() => {
    const prevLevel = prevLevelRef.current
    if (prevLevel !== currentLevel) {
      const prevMax = BASE_HP + Math.max(0, prevLevel - 1) * HP_PER_LEVEL
      const newMax = playerMaxHP
      // scale current HP proportionally (keep same percent), but don't go above newMax
      setPlayerHP(prev => {
        const pct = prevMax > 0 ? prev / prevMax : 1
        const newHp = Math.min(newMax, Math.max(1, Math.round(pct * newMax)))
        // persist new HP when logged in
        ;(async () => {
          try {
            const { data } = await supabase.auth.getUser()
            const userId = data?.user?.id
            if (userId) await setPlayerHp(userId, newHp)
          } catch (e) {
            console.error('failed persisting scaled player hp', e)
          }
        })()
        return newHp
      })
    }
    prevLevelRef.current = currentLevel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel])

  // Apply damage to the current enemy. If it dies, handle drops and spawn next.
  const handleDefeat = async (defeated: Enemy, userId?: string) => {
    // award drops
    for (const d of defeated.drops) {
      if (d.type === 'gold' && typeof d.amount === 'number' && userId) {
        try { await addCurrency(userId, d.amount) } catch (e) { console.error('gold award failed', e) }
      }
      if (d.type === 'xp' && typeof d.amount === 'number' && userId) {
        try { await addXp(userId, d.amount) } catch (e) { console.error('xp award failed', e) }
      }
      if (d.type === 'item') {
        setLoot(prev => [{ type: 'item', name: d.name }, ...prev])
      }
    }

    // advance round and spawn next; compute nextRound synchronously so we can persist correctly
    const nextRound = enemyRound + 1
    setEnemyRound(nextRound)
    setEnemies(prev => {
      const remaining = prev.slice(1)
      return [spawnEnemy(nextRound, userId), ...remaining]
    })

    if (userId) {
      // attempt to persist defeat count and last round; don't abort spawning on RPC failures
      try {
        await incrementEnemiesDefeated(userId, 1)
      } catch (e) {
        console.error('incrementEnemiesDefeated failed', e)
      }

      try {
        await setLastEnemyRound(userId, nextRound)
      } catch (e) {
        console.error('setLastEnemyRound failed', e)
      }

      // persist the new enemy's HP (so reload shows the newly spawned enemy)
      try {
        const newEnemy = spawnEnemy(nextRound, userId)
        await setEnemyHp(userId, newEnemy.hp)
      } catch (e) {
        console.error('setEnemyHp for new enemy failed', e)
      }
    }
  }

  const applyDamageToEnemy = async (dmg: number, userId?: string) => {
    // scale damage by player's attack
    const scaledDmg = Math.max(1, Math.round(dmg * (playerAttack / BASE_ATTACK)))

    // read latest enemy HP from ref to avoid stale-state persistence
    const beforeHp = enemiesRef.current?.[0]?.hp ?? 0
    const afterHp = Math.max(0, beforeHp - scaledDmg)

    setEnemies(prev => {
      if (!prev.length) return prev
      const copy = [...prev]
      const prevBefore = copy[0].hp
      copy[0] = { ...copy[0], hp: afterHp }
      const died = prevBefore > 0 && afterHp === 0
      if (died) {
        // schedule side-effects after state applied
        setTimeout(() => handleDefeat(copy[0], userId), 0)
      }
      return copy
    })

    // persist enemy HP for logged-in users (use afterHp)
    try {
      if (userId) {
        await setEnemyHp(userId, afterHp)
      }
    } catch (e) {
      console.error('failed persisting enemy hp', e)
    }
  }

  // Apply enemy attacks for tasks missed today once per day (store last day applied in localStorage)
  useEffect(() => {
    (async () => {
      try {
        const lastKey = 'lastEnemyAttackDate'
        const last = localStorage.getItem(lastKey)
        const today = new Date().toISOString().slice(0,10)
        if (last === today) return

        // compute damage from tasks due today that are not completed
        // penalty scales with enemy level × difficulty multiplier, reduced by defense
        const missed = tasks.filter(t => isDueOnDate(t.next_due) && !t.completed_at)
        const enemyLevel = enemiesRef.current?.[0]?.level ?? 1
        const diffMultiplier: Record<number, number> = { 1: 1, 2: 1.5, 3: 2.5, 4: 4 }
        const totalMissedDamage = missed.reduce((acc, t) => {
          const diff = t.difficulty || 1
          const penalty = Math.max(1, Math.round(enemyLevel * MISSED_PENALTY_BASE * (diffMultiplier[diff] ?? 1)) - defense)
          return acc + penalty
        }, 0)
        if (totalMissedDamage > 0) {
          // update local HP and persist to DB when user exists
          let newHp = Math.max(0, playerHPRef.current - totalMissedDamage)
          playerHPRef.current = newHp
          setPlayerHP(newHp)
          try {
            const { data } = await supabase.auth.getUser()
            const userId = data?.user?.id
            if (userId) await setPlayerHp(userId, newHp)
          } catch (e) {
            console.error('failed persisting player hp', e)
          }
        }
        localStorage.setItem(lastKey, today)
      } catch (e) {
        console.error('failed applying missed-task damage', e)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, playerHP])

  // Derived battle values based on completed tasks (scale task damage by playerAttack)
  const totalDamage = tasks.reduce((acc, t) => acc + ((t.dmg && t.completed_at) ? Math.round(t.dmg * (playerAttack / BASE_ATTACK)) : 0), 0)
  // current enemy from state
  const currentEnemy = enemies[0]
  const enemyHP = currentEnemy ? currentEnemy.hp : Math.max(0, ENEMY_MAX_HP - totalDamage)
  const defense = equippedBonuses.defense_bonus

  // Handlers
  const toggleDaily = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    // Optimistic UI update: mark as completed locally immediately
    playComplete()
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed_at: new Date().toISOString() } : t))

    try {
      const difficulty = task.difficulty || 1
  const { xp, dmg, gold } = DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP[1]

      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) throw new Error('Not logged in')

      await supabase.from('task_completions').insert([{
        task_id: task.id,
        user_id: userId,
        xp_awarded: xp,
        dmg_dealt: dmg,
      }])

      // award xp locally via the existing addXp helper (persisted to profiles)
      await addXp(userId, xp)
      await fetchCurrentXp()

      // award currency for completing this task
      try {
        if (typeof gold === 'number' && gold !== 0) {
          await addCurrency(userId, gold)
        }
      } catch (e) {
        console.error('Failed to award currency:', e)
      }

      // apply damage to current enemy + show player attack feedback
      try {
        const scaledDmg = Math.max(1, Math.round(dmg * (playerAttack / BASE_ATTACK)))
        setLastPlayerDmg(scaledDmg)
        setTimeout(() => setLastPlayerDmg(null), 1200)
        await applyDamageToEnemy(dmg, userId)
      } catch (e) {
        console.error('Failed applying damage to enemy', e)
      }

      // enemy counter-attacks: scales with enemy level, reduced by defense
      try {
        const enemyLevel = enemiesRef.current?.[0]?.level ?? 1
        const counterDmg = Math.max(1, enemyLevel * ENEMY_COUNTER_BASE - defense)
        const newHp = Math.max(0, playerHPRef.current - counterDmg)
        playerHPRef.current = newHp
        setPlayerHP(newHp)
        setLastCounterDmg(counterDmg)
        setAttackTick(t => t + 1)
        setTimeout(() => setLastCounterDmg(null), 1500)
        await setPlayerHp(userId, newHp)
      } catch (e) {
        console.error('Failed applying counter-attack', e)
      }

      // Determine how many times this task has been completed so far (to respect repeats/count)
      const { data: completionData, count: compCount } = await supabase
        .from('task_completions')
        .select('id', { count: 'exact' })
        .eq('task_id', task.id)

      const completedCount = typeof compCount === 'number' ? compCount : (completionData ? completionData.length : 0)

      // Use the task.next_due (if present) as the "after" occurrence; otherwise use now
      const afterDate = task.next_due ? new Date(task.next_due) : new Date()

      const nextDue = computeNextDue(task.recurrence || null, afterDate, completedCount)
      if (nextDue) {
        await supabase.from('taskitem').update({ next_due: nextDue }).eq('id', task.id)
      } else {
        await supabase.from('taskitem').update({ active: false, completed_at: new Date().toISOString() }).eq('id', task.id)
      }

      await fetchTasks()
    } catch (err) {
      console.error('Failed to complete task', err)
      // rollback optimistic update on failure
      await fetchTasks()
    }
  }

  

  // Fetch tasks for the logged in user
  const fetchTasks = async () => {
    setLoadingTasks(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return
  const { data } = await supabase.from('taskitem').select('*').eq('user_id', userId).eq('active', true).order('next_due', { ascending: true })
    if (!data) throw new Error('no data')
      setTasks(data || [])
    } catch (err) {
      console.error('Failed to load tasks', err)
    } finally {
      setLoadingTasks(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  // handler for modal create
  const handleCreateTask = async (task: any) => {
    playAdd()
    setTasks(prev => [task, ...prev])
    await fetchTasks()
  }

  const handleDeleteTask = async (id: string) => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) return
    await supabase.from('task_completions').delete().eq('task_id', id)
    const { error } = await supabase.from('taskitem').delete().eq('id', id).eq('user_id', userId)
    if (!error) {
      playDelete()
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  const handleDeleteAllTasks = async () => {
    if (!window.confirm('Delete ALL tasks? This cannot be undone.')) return
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id
    if (!userId) return
    await supabase.from('task_completions').delete().eq('user_id', userId)
    await supabase.from('taskitem').delete().eq('user_id', userId)
    playDeleteAll()
    setTasks([])
  }
  


  
  return (
    <section className="min-h-dvh w-full bg-gradient-to-br from-green-200 via-amber-100 to-amber-300">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="text-xl sm:text-2xl font-extrabold text-gray-900">FocusQuest</div>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Daily</span>
          </div>
          <div className="text-xs sm:text-sm text-gray-700">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Top Left: Character */}
          <Card title="Adventurer">
            <div className="flex items-center gap-4">
                <div className="relative">
                <div className="size-20 md:size-24 rounded-2xl bg-amber-200/80 border border-amber-300 shadow-inner grid place-content-center text-3xl">🛡️</div>
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 text-xs rounded-full bg-emerald-600 text-white shadow">Lv {currentLevel}</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-lg">{profileName}</div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <StatChip label="ATK" value={`${playerAttack}`} />
                  <StatChip label="HP" value={`${playerHP}/${playerMaxHP}`} />
                  <StatChip label="DEF" value={defense} />
                </div>
                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-1">XP</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, pctToNext)}%` }}
                      />
                    </div>
                    <div className="text-xs font-semibold text-gray-800 shrink-0">{xpIntoLevel}/{xpNeededForNext}</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Top Right: Battle Arena */}
          <Card title="Battle Arena">
            <MonsterBattle
              key={currentEnemy?.id ?? 0}
              maxHP={currentEnemy?.maxHP ?? ENEMY_MAX_HP}
              hp={enemyHP}
              reward={`${currentEnemy?.name ?? 'Enemy'} - Drops: ${currentEnemy?.drops.map(d => d.type === 'gold' ? `💰${d.amount}` : d.type === 'xp' ? `XP${d.amount}` : d.name).join(', ')}`}
              xp={currentEnemy?.drops.find(d => d.type === 'xp')?.amount ?? 0}
              enemyLevel={currentEnemy?.level ?? 1}
              playerAttack={playerAttack}
              baseAttack={BASE_ATTACK}
              defense={defense}
              lastCounterDmg={lastCounterDmg}
              lastPlayerDmg={lastPlayerDmg}
              attackTick={attackTick}
            />
            {/* Show small loot list */}
            {loot.length > 0 && (
              <div className="mt-3 text-sm text-gray-700">Loot: {loot.map(l => l.name ? `${l.name}` : `${l.type} ${l.amount}`).join(', ')}</div>
            )}
          </Card>

          {/* Bottom: Tasks - wide single column */}
          <Card className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex-1 min-w-0">Daily Quests</h2>
              <div className="flex gap-2 shrink-0">
                <button onClick={fetchTasks} className="px-3 py-1 rounded bg-amber-100 text-amber-900 hover:bg-amber-200 text-sm">↺</button>
                <button onClick={handleDeleteAllTasks} className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 text-sm">🗑</button>
                <button onClick={() => setShowNewTask(true)} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm">+ Add</button>
              </div>
            </div>

            <div className="space-y-3">
              {/**
               * Show tasks that have a next_due on or before today (UTC).
               * This helps when next_due is stored as an ISO midnight UTC value which
               * can otherwise appear off-by-one in some timezones.
               */}
              {tasks.filter((t) => {
                if (!t.next_due) return false
                try {
                  const d = new Date(t.next_due)
                  const today = new Date()
                  const dueUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
                  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
                  return dueUtc <= todayUtc
                } catch (e) {
                  return false
                }
              }).map((t) => (
                <QuestToggle
                  key={t.id}
                  q={{
                    id: t.id,
                    title: t.name,
                    reward: t.xp ? `+${t.xp} XP` : undefined,
                    completed: !!t.completed_at,
                    dmg: t.dmg,
                      xp: t.xp ?? DIFFICULTY_MAP[t.difficulty || 1].xp,
                      repeatCount: t.recurrence?.count ?? null,
                      difficulty: t.difficulty,
                      recurrence: t.recurrence,
                  }}
                  onToggle={toggleDaily}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>

            <div className="mt-4 text-sm text-gray-600">Damage so far: <b>{totalDamage}</b></div>
          </Card>
          {showNewTask && (
            <NewTaskModal onClose={() => setShowNewTask(false)} onCreate={handleCreateTask} />
          )}
        </div>
      </div>
    </section>
  );
};

export default DailyQuestPage;