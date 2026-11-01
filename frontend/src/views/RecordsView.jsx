/**
 * RecordsView.jsx — Institutional Records, Temporal Intelligence & Data Provenance.
 * Houses 3 institutional capabilities:
 * 1. 8. Institutional Memory (Meko) (YugabyteDB Persistent Audit Ledger)
 * 2. 9. Temporal Insights (Tiger Data) (TimescaleDB Multi-Year Trends 2020–2026)
 * 3. 10. Evidence & Data Provenance (SHA-256 Cryptographic Lineage & EPSG:4326 Metadata)
 */
import React, { useState } from 'react';
import {
  Brain,
  Clock,
  Users,
  Database,
  ShieldCheck,
} from 'lucide-react';
import MekoMemoryStudioView from '../components/MekoMemoryStudioView';
import TemporalInsightsView from '../components/TemporalInsightsView';
import EquityAndProvenanceView from '../components/EquityAndProvenanceView';

export const RECORDS_TABS = [
  { id: 'meko', label: '8. Institutional Memory (Meko)', shortLabel: 'Meko Memory', icon: Brain },
  { id: 'temporal', label: '9. Temporal Insights (Tiger Data)', shortLabel: 'Tiger Data', icon: Clock },
  { id: 'provenance', label: '10. Evidence & Data Provenance', shortLabel: 'Evidence & Provenance', icon: Users },
];

export default function RecordsView({
  selectedCorridor,
  mekoEnabled,
  onToggleMeko,
  provenance,
  statsSummary,
  onOpenProvenanceModal,
}) {
  const [activeTab, setActiveTab] = useState('meko');

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#071C16] text-[#F3F1E7]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10 bg-[#071C16]/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-editorial text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-emerald-400" />
            Intelligence &amp; Institutional Records
          </h2>
          <p className="text-xs text-[#9CB9A3] mt-0.5">
            Meko YugabyteDB Audit Trail • Tiger Data TimescaleDB • Cryptographic SHA-256 Provenance
          </p>
        </div>

        <button
          onClick={onOpenProvenanceModal}
          className="px-4 py-2 rounded-xl bg-[#12392B] hover:bg-[#12392B]/80 border border-emerald-400/30 text-xs font-semibold text-emerald-300 flex items-center gap-2 shadow transition"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>View Provenance Signatures</span>
        </button>
      </header>

      {/* Navigation Strip */}
      <div className="bg-[#12392B]/50 px-6 py-2.5 border-b border-white/10 flex items-center gap-2 overflow-x-auto">
        {RECORDS_TABS.map((tab) => {
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

      {/* Active Tab View */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'meko' && (
          <MekoMemoryStudioView
            mekoEnabled={mekoEnabled}
            onToggleMeko={onToggleMeko}
          />
        )}

        {activeTab === 'temporal' && (
          <TemporalInsightsView selectedCorridor={selectedCorridor} />
        )}

        {activeTab === 'provenance' && (
          <EquityAndProvenanceView
            provenance={provenance}
            statsSummary={statsSummary}
          />
        )}
      </div>
    </div>
  );
}
