import { supabase } from './supabaseClient'

export type ShopItem = {
  id: number
  name: string
  icon: string
  price: number
  type: 'weapon' | 'armor' | 'consumable'
  attack_bonus: number
  defense_bonus: number
  hp_restore: number
  description: string
}

export type ShopRotation = {
  id: number
  item_ids: number[]
  refreshes_at: string
  created_at: string
}

export type InventoryItem = ShopItem & {
  quantity: number
  equipped: boolean
}

export async function getOrCreateRotation(): Promise<ShopRotation> {
  const { data, error } = await supabase.rpc('get_or_create_rotation')
  if (error) throw error
  return data as ShopRotation
}

export async function getRotationItems(itemIds: number[]): Promise<ShopItem[]> {
  const { data, error } = await supabase.from('shop_items').select('*').in('id', itemIds)
  if (error) throw error
  return (data || []) as ShopItem[]
}

export async function getUserPurchasesInRotation(userId: string, rotationId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('shop_purchases')
    .select('item_id')
    .eq('user_id', userId)
    .eq('rotation_id', rotationId)
  if (error) throw error
  return (data || []).map((r: any) => r.item_id)
}

export async function purchaseItem(
  userId: string, itemId: number, rotationId: number
): Promise<{ success?: boolean; new_currency?: number; error?: string }> {
  const { data, error } = await supabase.rpc('purchase_item', {
    p_user_id: userId,
    p_item_id: itemId,
    p_rotation_id: rotationId,
  })
  if (error) throw error
  return data
}

export async function getUserInventory(userId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('user_inventory')
    .select('quantity, equipped, shop_items(*)')
    .eq('user_id', userId)
  if (error) throw error
  return (data || []).map((row: any) => ({
    ...row.shop_items,
    quantity: row.quantity,
    equipped: row.equipped,
  })) as InventoryItem[]
}

export async function equipItem(userId: string, itemId: number, itemType: string): Promise<void> {
  // Fetch all inventory to find same-type items to unequip
  const { data } = await supabase
    .from('user_inventory')
    .select('item_id, shop_items(type)')
    .eq('user_id', userId)
    .eq('equipped', true)

  if (data) {
    const sameType = (data as any[])
      .filter(r => r.shop_items?.type === itemType && r.item_id !== itemId)
      .map(r => r.item_id)
    if (sameType.length > 0) {
      await supabase.from('user_inventory').update({ equipped: false })
        .eq('user_id', userId).in('item_id', sameType)
    }
  }

  await supabase.from('user_inventory').update({ equipped: true })
    .eq('user_id', userId).eq('item_id', itemId)
}

export async function unequipItem(userId: string, itemId: number): Promise<void> {
  await supabase.from('user_inventory').update({ equipped: false })
    .eq('user_id', userId).eq('item_id', itemId)
}

export async function useConsumable(userId: string, itemId: number): Promise<void> {
  const { data } = await supabase.from('user_inventory').select('quantity')
    .eq('user_id', userId).eq('item_id', itemId).single()
  if (!data) return
  if (data.quantity <= 1) {
    await supabase.from('user_inventory').delete().eq('user_id', userId).eq('item_id', itemId)
  } else {
    await supabase.from('user_inventory').update({ quantity: data.quantity - 1 })
      .eq('user_id', userId).eq('item_id', itemId)
  }
}

export async function getEquippedStats(userId: string): Promise<{ attack_bonus: number; defense_bonus: number }> {
  const { data, error } = await supabase
    .from('user_inventory')
    .select('shop_items(attack_bonus, defense_bonus)')
    .eq('user_id', userId)
    .eq('equipped', true)
  if (error || !data) return { attack_bonus: 0, defense_bonus: 0 }
  return (data as any[]).reduce(
    (acc, row) => ({
      attack_bonus: acc.attack_bonus + (row.shop_items?.attack_bonus || 0),
      defense_bonus: acc.defense_bonus + (row.shop_items?.defense_bonus || 0),
    }),
    { attack_bonus: 0, defense_bonus: 0 }
  )
}
