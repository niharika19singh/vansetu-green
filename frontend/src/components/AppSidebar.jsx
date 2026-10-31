/**
 * AppSidebar.jsx — Sleek, Collapsible Application Navigation Sidebar.
 * Used across all functional pages (Map Explorer, Corridors, Canopy, Scenarios, Studio, Records).
 * Provides one-click access between logical destinations while preserving maximum screen real estate.
 */
import React from 'react';
import {
  Map,
  Trees,
  Droplets,
  Sliders,
  Calculator,
  Brain,
  Home,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';

export const APP_NAV_ITEMS = [
  { id: 'map', label: '2. Interactive Map', shortLabel: 'Map Explorer', icon: Map },
  { id: 'corridors', label: '3. Corridor Intelligence', shortLabel: 'Corridors (44)', icon: Trees },
  { id: 'canopy', label: '1. Climate Overview', shortLabel: 'Canopy & Hydrology', icon: Droplets },
  { id: 'scenarios', label: '4. Scenario Lab', shortLabel: 'Scenario Lab', icon: Sliders },
  { id: 'studio', label: '5. Intervention Optimizer', shortLabel: 'Decision Studio', icon: Calculator },
  { id: 'records', label: '8. Institutional Memory (Meko)', shortLabel: 'Intelligence & Records', icon: Brain },
];

export default function AppSidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mekoEnabled,
  onToggleMeko,
  isMuted,
  onToggleSound,
  onOpenVeinsStory,
}) {
  return (
    <aside
      className={`relative z-30 h-full flex flex-col justify-between bg-[#071C16]/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header / Brand */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 overflow-hidden text-left group"
            title="Return to Home"
          >
            <div className="w-9 h-9 rounded-xl bg-[#12392B] border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-md group-hover:border-emerald-400 transition">
              <Trees className="w-5 h-5 text-emerald-300" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="font-editorial text-base font-bold text-[#F3F1E7] tracking-wide group-hover:text-emerald-200 transition">
                  VanSetu
                </div>
                <div className="text-[10px] text-[#9CB9A3] font-mono">NCT Delhi v2.0</div>
              </div>
            )}
          </button>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-2 space-y-1 mt-2">
          {/* Return Home Button */}
          <button
            onClick={() => onNavigate('home')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activePage === 'home'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
            title="Landing Page / Home"
          >
            <Home className="w-4 h-4 shrink-0 text-emerald-400" />
            {!collapsed && <span className="truncate">Home / Introduction</span>}
          </button>

          <div className="my-2 border-t border-white/5" />

          {/* Functional Destinations */}
          {APP_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title={item.shortLabel}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                {!collapsed && <span className="truncate">{item.shortLabel}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utilities & Controls */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {/* Veins of Life Story button */}
        <button
          onClick={onOpenVeinsStory}
          className={`w-full flex items-center justify-center gap-2 py-2 px-2 rounded-xl text-xs font-bold border transition ${
            collapsed
              ? 'bg-[#12392B]/60 border-emerald-400/40 text-amber-200'
              : 'bg-gradient-to-r from-emerald-950/60 to-amber-950/60 hover:from-emerald-900/60 hover:to-amber-900/60 border-emerald-400/40 text-amber-200'
          }`}
          title="Launch 7-Stage Veins of Life Cinematic Journey"
        >
          <span>🍃</span>
          {!collapsed && <span>Veins of Life Story</span>}
        </button>

        {/* MEKO ON/OFF toggle */}
        <button
          onClick={onToggleMeko}
          className={`w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold border transition ${
            mekoEnabled
              ? 'bg-emerald-900/50 border-emerald-400/60 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
          }`}
          title="Toggle YugabyteDB / Meko Institutional Memory"
        >
          <Brain className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>{mekoEnabled ? 'MEKO: ON' : 'MEKO: OFF'}</span>}
        </button>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between gap-1 pt-1">
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl border transition ${
              collapsed ? 'w-full flex justify-center' : 'px-3 py-1.5 flex items-center gap-2 text-xs text-slate-300'
            } ${
              isMuted
                ? 'bg-slate-900/50 border-white/10 text-slate-400 hover:text-white'
                : 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
            }`}
            title="Toggle Ambient Audio [M]"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {!collapsed && <span>{isMuted ? 'Muted' : 'Audio On'}</span>}
          </button>

          {collapsed && (
            <button
              onClick={onToggleCollapse}
              className="w-full mt-1 p-1.5 rounded-lg text-slate-400 hover:text-white flex justify-center hover:bg-white/5 transition"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
