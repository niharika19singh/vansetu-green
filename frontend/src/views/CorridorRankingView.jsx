/**
 * CorridorRankingView.jsx — Dedicated Two-Factor What-If Corridor Ranking Workspace.
 * 
 * Features:
 * - Direct interactive weighting slider: score = heat_weight * Heat + (1 - heat_weight) * (1 - NDVI)
 * - Dynamic Rank Delta and Score Delta relative to 0.60 baseline.
 * - Top N selector (5, 10, 20, 44) and District filtering across all 11 districts.
 * - "Explain Ranking" AI modal providing transparent mathematical rationale.
 */
import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Flame,
  Trees,
  Bot,
  X,
  MapPin,
  ArrowRight,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { api } from '../api/client';
import {
  safeToFixed,
  formatScore,
  isValidNumber,
} from '../utils/numericFormat';

export default function CorridorRankingView({
  districts = [],
  selectedDistrict = 'All Districts',
  onSelectDistrict,
  onSelectCorridor,
  onNavigate,
  onOpenPassport,
}) {
  const [heatWeight, setHeatWeight] = useState(0.60);
  const [topN, setTopN] = useState(10);
  const [rankedCorridors, setRankedCorridors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedForExplanation, setSelectedForExplanation] = useState(null);
  const [explanationData, setExplanationData] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const safeHeatWeight = isValidNumber(heatWeight) ? Number(heatWeight) : 0.60;
  const greenWeight = safeToFixed(1.0 - safeHeatWeight, 2);

  // Fetch What-if ranked corridors
  useEffect(() => {
    let cancelled = false;
    async function fetchRanking() {
      setIsLoading(true);
      try {
        const res = await api.getCorridorsWhatIfRank({
          heatWeight: safeHeatWeight,
          top: topN,
          district: selectedDistrict !== 'All Districts' ? selectedDistrict : null,
        });
        if (!cancelled && res && res.corridors) {
          setRankedCorridors(res.corridors);
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to fetch What-If ranking:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRanking();
    return () => {
      cancelled = true;
    };
  }, [heatWeight, topN, selectedDistrict]);

  // Handle Explain Ranking request
  const handleExplain = async (corridor) => {
    setSelectedForExplanation(corridor);
    setIsExplaining(true);
    setExplanationData(null);
    try {
      const res = await api.explainCorridorRanking({
        name: corridor.name,
        district: corridor.district,
        heat_weight: heatWeight,
        heat: corridor.heat,
        ndvi: corridor.ndvi,
        green_deficit: corridor.green_deficit,
        score: corridor.score,
        rank: corridor.rank,
        baseline_rank: corridor.baseline_rank,
        rank_change: corridor.rank_delta,
      });
      setExplanationData(res);
    } catch (err) {
      console.error('Failed to explain ranking:', err);
      setExplanationData({
        status: 'fallback',
        explanation: `${corridor.name} ranked #${corridor.rank} with score ${formatScore(corridor.score, 4)}. Thermal weight: ${safeToFixed(safeHeatWeight, 2)}, Green deficit weight: ${greenWeight}.`,
      });
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#071C16] text-[#F3F1E7]">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#071C16]/95 backdrop-blur-md flex-shrink-0">
        <div>
          <h2 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            What-If Corridor Ranking Engine
          </h2>
          <p className="text-xs text-[#9CB9A3]">
            Two-factor dynamic policy calibration: <code>score = w_heat × Heat + (1 - w_heat) × (1 - NDVI)</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* District selector */}
          <div className="flex items-center gap-2 bg-[#12392B] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => onSelectDistrict && onSelectDistrict(e.target.value)}
              className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All Districts" className="bg-[#0b241c] text-white">All 11 Districts</option>
              {districts.map((d) => (
                <option key={d} value={d} className="bg-[#0b241c] text-white">{d}</option>
              ))}
            </select>
          </div>

          {/* Top N selector */}
          <div className="flex items-center gap-2 bg-[#12392B] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <span className="text-[#9CB9A3]">Show:</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value={5} className="bg-[#0b241c] text-white">Top 5</option>
              <option value={10} className="bg-[#0b241c] text-white">Top 10</option>
              <option value={20} className="bg-[#0b241c] text-white">Top 20</option>
              <option value={44} className="bg-[#0b241c] text-white">All 44 Corridors</option>
            </select>
          </div>
        </div>
      </header>

      {/* Control Strip — Interactive Weighting Slider */}
      <div className="p-6 bg-[#0d2b21] border-b border-white/10 flex-shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Heat vs. Green Deficit Weight Calibration
              </span>
              {isLoading && <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />}
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Heat Weight: {safeToFixed(safeHeatWeight, 2)}
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Trees className="w-3.5 h-3.5" /> Green Deficit Weight: {greenWeight}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <input
              type="range"
              min="0.00"
              max="1.00"
              step="0.05"
              value={heatWeight}
              onChange={(e) => setHeatWeight(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[11px] text-[#9CB9A3]">
              <span>0.00: 100% Vegetation Deficit Priority</span>
              <span className="font-semibold text-white">0.60: Baseline Scientific Calibration</span>
              <span>1.00: 100% Thermal Exposure Priority</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Ranking Table Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-[#9CB9A3]">
            <span>
              Showing <strong>{rankedCorridors.length}</strong> prioritized corridors for{' '}
              <strong className="text-white">{selectedDistrict}</strong>
            </span>
            <span className="text-[11px]">Click "Explain" on any corridor for AI mathematical derivation</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0d2b21]/70 backdrop-blur-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#12392B]/80 text-[#9CB9A3] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Δ Rank</th>
                  <th className="py-3 px-4">Corridor Name</th>
                  <th className="py-3 px-4">District</th>
                  <th className="py-3 px-4 text-right">What-If Score</th>
                  <th className="py-3 px-4 text-right">Baseline (0.60)</th>
                  <th className="py-3 px-4 text-right">Heat Exposure</th>
                  <th className="py-3 px-4 text-right">Green Deficit</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {rankedCorridors.map((c) => {
                  const delta = c.rank_delta || 0;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => onSelectCorridor && onSelectCorridor(c)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                        #{c.rank}
                      </td>
                      <td className="py-3.5 px-4">
                        {delta > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                            <TrendingUp className="w-3 h-3" /> +{delta}
                          </span>
                        ) : delta < 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-500/20 text-[11px]">
                            <TrendingDown className="w-3 h-3" /> {delta}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded text-[11px]">
                            <Minus className="w-3 h-3" /> 0
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white group-hover:text-emerald-300 transition">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                            {c.code}
                          </span>
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#9CB9A3]">{c.district_full || c.district}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatScore(c.score, 4)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {formatScore(c.baseline_score, 4)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-300">
                        {formatScore(c.heat_contribution, 4)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-300">
                        {formatScore(c.green_deficit_contribution, 4)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExplain(c);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-medium text-[11px] inline-flex items-center gap-1.5 transition shadow"
                        >
                          <Bot className="w-3 h-3" />
                          <span>Explain</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Explanation Modal */}
      {selectedForExplanation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b241c] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedForExplanation(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
              <Bot className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-editorial text-base font-bold text-white">
                  Explainable Ranking Derivation
                </h3>
                <p className="text-xs text-[#9CB9A3]">
                  {selectedForExplanation.name} ({selectedForExplanation.district})
                </p>
              </div>
            </div>

            {isExplaining ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-emerald-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Generating deterministic mathematical explanation...</span>
              </div>
            ) : (
              <div className="space-y-3 text-xs leading-relaxed text-slate-200">
                <div className="p-3.5 rounded-xl bg-[#12392B]/80 border border-emerald-500/30 text-white font-mono text-[11px] space-y-1">
                  <div>Formula: score = {safeToFixed(safeHeatWeight, 2)} × Heat + {greenWeight} × (1 - NDVI)</div>
                  <div>Computed Score: {formatScore(selectedForExplanation.score, 4)}</div>
                  <div>Rank: #{selectedForExplanation.rank} (Baseline: #{selectedForExplanation.baseline_rank})</div>
                </div>

                <p className="text-slate-100">
                  {explanationData?.explanation || 'Rationale generated based on primary thermal driver.'}
                </p>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (onOpenPassport) onOpenPassport(selectedForExplanation.id);
                      setSelectedForExplanation(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Evidence Passport</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onSelectCorridor) onSelectCorridor(selectedForExplanation);
                      if (onNavigate) onNavigate('map');
                      setSelectedForExplanation(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <span>View on Map</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
