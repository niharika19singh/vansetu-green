/**
 * DecisionStudioView.jsx — Computational Decision & Planning Studio.
 * Houses 3 advanced decision tools:
 * 1. 5. Intervention Optimizer (MILP Budget Solver in INR Lakhs)
 * 2. 6. Climate Procurement Studio (IOMETE Lakehouse Procurement & Vendor Scoring)
 * 3. 7. AI Planning Assistant (Google Gemini 3.8 Flash Municipal Co-pilot)
 */
import React, { useState } from 'react';
import {
  Calculator,
  ShoppingBag,
  Sparkles,
  Brain,
  Trees,
} from 'lucide-react';
import InterventionOptimizerView from '../components/InterventionOptimizerView';
import ProcurementStudioView from '../components/ProcurementStudioView';
import AiPlanningAssistantView from '../components/AiPlanningAssistantView';

export const STUDIO_TABS = [
  { id: 'optimizer', label: '5. Intervention Optimizer', shortLabel: 'MILP Budget Optimizer', icon: Calculator },
  { id: 'procurement', label: '6. Climate Procurement Studio', shortLabel: 'IOMETE Procurement', icon: ShoppingBag },
  { id: 'agent', label: '7. AI Planning Assistant', shortLabel: 'Gemini AI Assistant', icon: Sparkles },
];

export default function DecisionStudioView({
  selectedCorridor,
  corridors,
  onSelectCorridor,
  mekoEnabled,
  onToggleMeko,
}) {
  const [activeTab, setActiveTab] = useState('optimizer');

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#071C16] text-[#F3F1E7]">
      {/* Studio Header & Tab Bar */}
      <header className="px-6 py-4 border-b border-white/10 bg-[#071C16]/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-400" />
            VanSetu Decision Studio Workspace
          </h2>
          <p className="text-xs text-[#9CB9A3] mt-0.5">
            Mathematical MILP Solver • IOMETE Procurement Ledger • Google Gemini 3.8 Flash
          </p>
        </div>

        {/* Selected Corridor Chip */}
        {selectedCorridor && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12392B] border border-emerald-400/30 text-xs">
            <span className="text-[#9CB9A3]">Corridor:</span>
            <span className="font-bold text-white truncate max-w-[180px]">{selectedCorridor.name}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
              {selectedCorridor.code || `#${selectedCorridor.rank}`}
            </span>
          </div>
        )}
      </header>

      {/* 3 Specialized Tools Navigation Strip */}
      <div className="bg-[#12392B]/50 px-6 py-2.5 border-b border-white/10 flex items-center gap-2 overflow-x-auto">
        {STUDIO_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Workspace */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'optimizer' && (
          <InterventionOptimizerView
            selectedCorridor={selectedCorridor}
            mekoEnabled={mekoEnabled}
            onToggleMeko={onToggleMeko}
          />
        )}

        {activeTab === 'procurement' && (
          <ProcurementStudioView
            selectedCorridor={selectedCorridor}
            mekoEnabled={mekoEnabled}
            onToggleMeko={onToggleMeko}
          />
        )}

        {activeTab === 'agent' && (
          <AiPlanningAssistantView
            selectedCorridor={selectedCorridor}
            mekoEnabled={mekoEnabled}
            onToggleMeko={onToggleMeko}
          />
        )}
      </div>
    </div>
  );
}
