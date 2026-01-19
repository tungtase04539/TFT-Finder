// TFT Set 16 Game Data - Lore & Legends
// Used for click-based rules configuration

export interface TFTRule {
  id: string;
  category: string;
  name: string;
  description: string;
  icon?: string;
  // For auto-verification (what to check in match data)
  verifiable: boolean;
  verifyField?: string;
  verifyCondition?: 'equals' | 'min' | 'max' | 'includes' | 'excludes';
  verifyValue?: string | number | string[] | number[];
}

// Champion cost tiers
export const CHAMPION_COSTS = [1, 2, 3, 4, 5, 6, 7] as const;

// Regions/Origins in Set 16
export const REGIONS = [
  { id: 'bilgewater', name: 'Bilgewater', icon: '🏴‍☠️' },
  { id: 'demacia', name: 'Demacia', icon: '🛡️' },
  { id: 'ionia', name: 'Ionia', icon: '🌸' },
  { id: 'ixtal', name: 'Ixtal', icon: '🌿' },
  { id: 'noxus', name: 'Noxus', icon: '⚔️' },
  { id: 'piltover', name: 'Piltover', icon: '⚙️' },
  { id: 'shadow_isles', name: 'Shadow Isles', icon: '💀' },
  { id: 'shurima', name: 'Shurima', icon: '☀️' },
  { id: 'targon', name: 'Targon', icon: '⭐' },
  { id: 'void', name: 'Void', icon: '👁️' },
  { id: 'yordle', name: 'Yordle', icon: '🐹' },
  { id: 'zaun', name: 'Zaun', icon: '🧪' },
] as const;

// Classes in Set 16
export const CLASSES = [
  { id: 'assassin', name: 'Assassin', icon: '🗡️' },
  { id: 'bastion', name: 'Bastion', icon: '🏰' },
  { id: 'bruiser', name: 'Bruiser', icon: '💪' },
  { id: 'invoker', name: 'Invoker', icon: '✨' },
  { id: 'marksman', name: 'Marksman', icon: '🎯' },
  { id: 'sentinel', name: 'Sentinel', icon: '🛡️' },
  { id: 'slayer', name: 'Slayer', icon: '💀' },
  { id: 'sorcerer', name: 'Sorcerer', icon: '🔮' },
  { id: 'strategist', name: 'Strategist', icon: '📜' },
  { id: 'vanguard', name: 'Vanguard', icon: '🏹' },
] as const;

// Predefined rule templates that host can click to select
export const RULE_TEMPLATES: TFTRule[] = [
  // === CHAMPION COST RULES ===
  {
    id: 'only_1_cost',
    category: 'champion_cost',
    name: 'Chỉ tướng 1 vàng',
    description: 'Chỉ được sử dụng tướng có giá 1 vàng',
    icon: '🪙',
    verifiable: true,
    verifyField: 'units.cost',
    verifyCondition: 'max',
    verifyValue: 1,
  },
  {
    id: 'only_2_cost',
    category: 'champion_cost',
    name: 'Chỉ tướng 2 vàng',
    description: 'Chỉ được sử dụng tướng có giá 2 vàng',
    icon: '🪙',
    verifiable: true,
    verifyField: 'units.cost',
    verifyCondition: 'max',
    verifyValue: 2,
  },
  {
    id: 'only_3_cost',
    category: 'champion_cost',
    name: 'Chỉ tướng 3 vàng',
    description: 'Chỉ được sử dụng tướng có giá 3 vàng',
    icon: '🪙',
    verifiable: true,
    verifyField: 'units.cost',
    verifyCondition: 'max',
    verifyValue: 3,
  },
  {
    id: 'no_5_cost',
    category: 'champion_cost',
    name: 'Cấm tướng 5+ vàng',
    description: 'Không được sử dụng tướng 5, 6, 7 vàng',
    icon: '🚫',
    verifiable: true,
    verifyField: 'units.cost',
    verifyCondition: 'max',
    verifyValue: 4,
  },
  {
    id: 'only_5_cost',
    category: 'champion_cost',
    name: 'Chỉ tướng 5 vàng',
    description: 'Chỉ được sử dụng tướng có giá 5 vàng',
    icon: '💎',
    verifiable: true,
    verifyField: 'units.cost',
    verifyCondition: 'equals',
    verifyValue: 5,
  },

  // === LEVEL RULES ===
  {
    id: 'max_level_5',
    category: 'level',
    name: 'Max Level 5',
    description: 'Không được lên quá level 5',
    icon: '⬇️',
    verifiable: true,
    verifyField: 'level',
    verifyCondition: 'max',
    verifyValue: 5,
  },
  {
    id: 'max_level_6',
    category: 'level',
    name: 'Max Level 6',
    description: 'Không được lên quá level 6',
    icon: '⬇️',
    verifiable: true,
    verifyField: 'level',
    verifyCondition: 'max',
    verifyValue: 6,
  },
  {
    id: 'max_level_7',
    category: 'level',
    name: 'Max Level 7',
    description: 'Không được lên quá level 7',
    icon: '⬇️',
    verifiable: true,
    verifyField: 'level',
    verifyCondition: 'max',
    verifyValue: 7,
  },
  {
    id: 'no_level_9',
    category: 'level',
    name: 'Cấm Level 9',
    description: 'Không được lên level 9',
    icon: '🚫',
    verifiable: true,
    verifyField: 'level',
    verifyCondition: 'max',
    verifyValue: 8,
  },

  // === STAR LEVEL RULES ===
  {
    id: 'must_3_star',
    category: 'star_level',
    name: 'Phải có 3⭐',
    description: 'Phải có ít nhất 1 tướng 3 sao',
    icon: '⭐⭐⭐',
    verifiable: true,
    verifyField: 'units.tier',
    verifyCondition: 'includes',
    verifyValue: 3,
  },
  {
    id: 'must_3_star_5_cost',
    category: 'star_level',
    name: '3⭐ tướng 5 vàng',
    description: 'Phải lên 3 sao cho 1 tướng 5 vàng',
    icon: '💎⭐',
    verifiable: true,
    verifyField: 'units.cost5_tier3',
    verifyCondition: 'min',
    verifyValue: 1,
  },
  {
    id: 'no_3_star',
    category: 'star_level',
    name: 'Cấm 3⭐',
    description: 'Không được lên 3 sao bất kỳ tướng nào',
    icon: '🚫⭐',
    verifiable: true,
    verifyField: 'units.max_tier',
    verifyCondition: 'max',
    verifyValue: 2,
  },

  // === ITEM RULES ===
  {
    id: 'no_completed_items',
    category: 'items',
    name: 'Chỉ Component',
    description: 'Chỉ được dùng item thành phần, không ghép item',
    icon: '🔧',
    verifiable: false, // Hard to verify from match data
  },
  {
    id: 'no_radiant',
    category: 'items',
    name: 'Cấm Radiant Items',
    description: 'Không được sử dụng Radiant items',
    icon: '🌟🚫',
    verifiable: false,
  },
  {
    id: 'only_one_item_per_champ',
    category: 'items',
    name: '1 Item/Tướng',
    description: 'Mỗi tướng chỉ được trang bị tối đa 1 item',
    icon: '1️⃣',
    verifiable: true,
    verifyField: 'units.items_count',
    verifyCondition: 'max',
    verifyValue: 1,
  },

  // === WIN CONDITION RULES ===
  {
    id: 'must_top_4',
    category: 'win_condition',
    name: 'Phải Top 4',
    description: 'Phải về trong top 4 để được tính thắng',
    icon: '🏆',
    verifiable: true,
    verifyField: 'placement',
    verifyCondition: 'max',
    verifyValue: 4,
  },
  {
    id: 'first_or_eighth',
    category: 'win_condition',
    name: 'Top 1 hoặc Bot 8',
    description: 'Luật all-in: chỉ được top 1 hoặc về cuối',
    icon: '🎲',
    verifiable: true,
    verifyField: 'placement',
    verifyCondition: 'equals',
    verifyValue: [1, 8],
  },
  {
    id: 'low_hp_win',
    category: 'win_condition',
    name: 'HP < 10 khi thắng',
    description: 'Phải thắng với HP còn lại dưới 10',
    icon: '❤️‍🔥',
    verifiable: false, // HP at end not in match data
  },

  // === SPECIAL RULES ===
  {
    id: 'no_reroll',
    category: 'special',
    name: 'Cấm Reroll',
    description: 'Không được refresh shop (danh dự)',
    icon: '🔄🚫',
    verifiable: false,
  },
  {
    id: 'no_economy',
    category: 'special',
    name: 'Cấm Econ',
    description: 'Không được tiết kiệm vàng, phải tiêu hết mỗi round',
    icon: '💰🚫',
    verifiable: false,
  },
  {
    id: 'same_trait',
    category: 'special',
    name: 'Full 1 Trait',
    description: 'Phải full trait duy nhất (VD: 9 Yordle)',
    icon: '🎯',
    verifiable: false,
  },
];

// Group rules by category for UI
export const RULE_CATEGORIES = [
  { id: 'champion_cost', name: 'Giới hạn Tướng', icon: '🪙' },
  { id: 'level', name: 'Giới hạn Level', icon: '📊' },
  { id: 'star_level', name: 'Số Sao', icon: '⭐' },
  { id: 'items', name: 'Items', icon: '🗡️' },
  { id: 'win_condition', name: 'Điều kiện thắng', icon: '🏆' },
  { id: 'special', name: 'Luật đặc biệt', icon: '✨' },
];

// Helper to get rules by category
export function getRulesByCategory(category: string): TFTRule[] {
  return RULE_TEMPLATES.filter(r => r.category === category);
}

// Helper to get rule by ID
export function getRuleById(id: string): TFTRule | undefined {
  return RULE_TEMPLATES.find(r => r.id === id);
}
