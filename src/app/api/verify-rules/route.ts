import { NextRequest, NextResponse } from 'next/server';
import { getRuleById, TFTRule } from '@/lib/tft-rules';

interface PlayerData {
  puuid: string;
  placement: number;
  level: number;
  units: {
    id: string;
    tier: number; // star level (1, 2, 3)
    items: string[];
    cost: number; // 1-7 cost
  }[];
  traits: {
    name: string;
    tier_current: number;
  }[];
  augments: string[];
  goldLeft?: number;
}

interface RuleViolation {
  ruleId: string;
  ruleName: string;
  puuid: string;
  description: string;
  evidence: Record<string, unknown>;
}

// POST: Verify rules against match data
// Body: { rules: string[], players: PlayerData[] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rules, players } = body;

    if (!rules || !Array.isArray(rules)) {
      return NextResponse.json(
        { error: 'rules array is required' },
        { status: 400 }
      );
    }

    if (!players || !Array.isArray(players)) {
      return NextResponse.json(
        { error: 'players array is required' },
        { status: 400 }
      );
    }

    const violations: RuleViolation[] = [];

    // Check each rule against each player
    for (const ruleId of rules) {
      const rule = getRuleById(ruleId);
      if (!rule || !rule.verifiable) continue;

      for (const player of players) {
        const violation = checkRule(rule, player);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    return NextResponse.json({
      success: true,
      passed: violations.length === 0,
      violations,
      summary: {
        totalRules: rules.length,
        verifiableRules: rules.filter((r: string) => {
          const rule = getRuleById(r);
          return rule?.verifiable;
        }).length,
        totalPlayers: players.length,
        violationsCount: violations.length,
      },
    });
  } catch (error) {
    console.error('Verify rules error:', error);
    return NextResponse.json(
      { error: 'Failed to verify rules' },
      { status: 500 }
    );
  }
}

// Check if a player violated a specific rule
function checkRule(rule: TFTRule, player: PlayerData): RuleViolation | null {
  const { verifyField, verifyCondition, verifyValue } = rule;
  if (!verifyField || !verifyCondition || verifyValue === undefined) return null;

  let actualValue: number | number[] | boolean = 0;
  let violated = false;
  let evidence: Record<string, unknown> = {};

  // Extract value based on verifyField
  switch (verifyField) {
    case 'placement':
      actualValue = player.placement;
      evidence = { placement: player.placement };
      break;

    case 'level':
      actualValue = player.level;
      evidence = { level: player.level };
      break;

    case 'units.cost':
      // Get max cost of all units
      actualValue = Math.max(...player.units.map(u => u.cost));
      evidence = {
        maxCost: actualValue,
        units: player.units.map(u => ({ id: u.id, cost: u.cost })),
      };
      break;

    case 'units.tier':
      // Get all star levels
      actualValue = player.units.map(u => u.tier);
      evidence = { tiers: actualValue };
      break;

    case 'units.max_tier':
      // Get max star level
      actualValue = Math.max(...player.units.map(u => u.tier));
      evidence = { maxTier: actualValue };
      break;

    case 'units.cost5_tier3':
      // Count 5-cost units at 3 stars
      actualValue = player.units.filter(u => u.cost === 5 && u.tier === 3).length;
      evidence = { 
        count: actualValue,
        units: player.units.filter(u => u.cost === 5).map(u => ({ id: u.id, tier: u.tier })),
      };
      break;

    case 'units.items_count':
      // Get max items on any single unit
      actualValue = Math.max(...player.units.map(u => u.items.length));
      evidence = {
        maxItems: actualValue,
        units: player.units.map(u => ({ id: u.id, items: u.items.length })),
      };
      break;

    default:
      return null;
  }

  // Check condition
  switch (verifyCondition) {
    case 'max':
      if (typeof actualValue === 'number' && typeof verifyValue === 'number') {
        violated = actualValue > verifyValue;
      }
      break;

    case 'min':
      if (typeof actualValue === 'number' && typeof verifyValue === 'number') {
        violated = actualValue < verifyValue;
      }
      break;

    case 'equals':
      if (Array.isArray(verifyValue)) {
        // For rules like "placement must be 1 or 8"
        violated = !(verifyValue as number[]).includes(actualValue as number);
      } else if (typeof actualValue === 'number' && typeof verifyValue === 'number') {
        // For rules like "only use 5-cost"
        if (verifyField === 'units.cost') {
          // All units must be this cost
          violated = player.units.some(u => u.cost !== verifyValue);
        } else {
          violated = actualValue !== verifyValue;
        }
      }
      break;

    case 'includes':
      if (Array.isArray(actualValue)) {
        violated = !(actualValue as number[]).includes(verifyValue as number);
      }
      break;

    case 'excludes':
      if (Array.isArray(actualValue)) {
        violated = (actualValue as number[]).includes(verifyValue as number);
      }
      break;
  }

  if (violated) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      puuid: player.puuid,
      description: `Vi phạm: ${rule.description}`,
      evidence,
    };
  }

  return null;
}
