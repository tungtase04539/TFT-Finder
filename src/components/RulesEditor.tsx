'use client';

import { useState } from 'react';
import { RULE_TEMPLATES, RULE_CATEGORIES, getRulesByCategory, TFTRule } from '@/lib/tft-rules';

interface RulesEditorProps {
  selectedRules: string[];
  onRulesChange: (rules: string[]) => void;
  customNote?: string;
  onCustomNoteChange?: (note: string) => void;
  readOnly?: boolean;
}

export default function RulesEditor({
  selectedRules,
  onRulesChange,
  customNote = '',
  onCustomNoteChange,
  readOnly = false,
}: RulesEditorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('champion_cost');

  const toggleRule = (ruleId: string) => {
    if (readOnly) return;
    
    if (selectedRules.includes(ruleId)) {
      onRulesChange(selectedRules.filter(id => id !== ruleId));
    } else {
      onRulesChange([...selectedRules, ruleId]);
    }
  };

  const isRuleSelected = (ruleId: string) => selectedRules.includes(ruleId);

  return (
    <div className="space-y-4">
      {/* Category Accordion */}
      {RULE_CATEGORIES.map(category => {
        const categoryRules = getRulesByCategory(category.id);
        const selectedCount = categoryRules.filter(r => isRuleSelected(r.id)).length;
        const isExpanded = expandedCategory === category.id;

        return (
          <div key={category.id} className="bg-tft-dark-secondary rounded-lg overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-tft-dark transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <span className="font-semibold text-tft-gold-light">{category.name}</span>
                {selectedCount > 0 && (
                  <span className="bg-tft-teal text-tft-dark text-xs px-2 py-0.5 rounded-full">
                    {selectedCount}
                  </span>
                )}
              </div>
              <span className="text-tft-gold/60">
                {isExpanded ? '▲' : '▼'}
              </span>
            </button>

            {/* Rules List */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {categoryRules.map(rule => (
                  <RuleItem
                    key={rule.id}
                    rule={rule}
                    isSelected={isRuleSelected(rule.id)}
                    onClick={() => toggleRule(rule.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom Note */}
      {!readOnly && onCustomNoteChange && (
        <div className="bg-tft-dark-secondary rounded-lg p-4">
          <label className="block text-tft-gold text-sm mb-2">
            📝 Ghi chú thêm (tùy chọn)
          </label>
          <textarea
            value={customNote}
            onChange={(e) => onCustomNoteChange(e.target.value)}
            placeholder="Thêm luật đặc biệt không có trong danh sách..."
            className="input-tft w-full rounded-lg h-20 resize-none"
          />
        </div>
      )}

      {/* Selected Rules Summary */}
      {selectedRules.length > 0 && (
        <div className="bg-tft-teal/10 border border-tft-teal/30 rounded-lg p-4">
          <h4 className="text-tft-teal font-semibold mb-2">
            📋 Luật đã chọn ({selectedRules.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedRules.map(ruleId => {
              const rule = RULE_TEMPLATES.find(r => r.id === ruleId);
              if (!rule) return null;
              return (
                <span
                  key={ruleId}
                  className="inline-flex items-center gap-1 bg-tft-dark px-2 py-1 rounded text-sm"
                >
                  <span>{rule.icon || '📌'}</span>
                  <span className="text-tft-gold-light">{rule.name}</span>
                  {!readOnly && (
                    <button
                      onClick={() => toggleRule(ruleId)}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      ✕
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {customNote && readOnly && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-yellow-400 font-semibold mb-1">📝 Ghi chú từ Host</h4>
          <p className="text-tft-gold-light/80 text-sm">{customNote}</p>
        </div>
      )}
    </div>
  );
}

// Individual Rule Item Component
function RuleItem({
  rule,
  isSelected,
  onClick,
  readOnly,
}: {
  rule: TFTRule;
  isSelected: boolean;
  onClick: () => void;
  readOnly: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={readOnly}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left
        ${isSelected 
          ? 'bg-tft-teal/20 border-2 border-tft-teal' 
          : 'bg-tft-dark border-2 border-transparent hover:border-tft-gold/30'
        }
        ${readOnly ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      {/* Checkbox */}
      <div className={`
        w-5 h-5 rounded flex items-center justify-center text-xs
        ${isSelected 
          ? 'bg-tft-teal text-tft-dark' 
          : 'border border-tft-gold/50'
        }
      `}>
        {isSelected && '✓'}
      </div>

      {/* Icon */}
      <span className="text-xl">{rule.icon || '📌'}</span>

      {/* Text */}
      <div className="flex-1">
        <div className="font-medium text-tft-gold-light">{rule.name}</div>
        <div className="text-xs text-tft-gold/60">{rule.description}</div>
      </div>

      {/* Verifiable Badge */}
      {rule.verifiable && (
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
          Auto-check
        </span>
      )}
    </button>
  );
}
