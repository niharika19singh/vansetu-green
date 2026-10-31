/**
 * VeinsOfLifeExperience.jsx — Layer 1 3D Background Engine.
 * Features:
 * - Direct photo landing cover on initial load transitioning into continuous 3D WebGL.
 * - 7-Stage Journey: Leaf -> Droplet -> Liquid Entry -> Clouds -> Veins -> Street Morph -> Delhi Map.
 * - Non-blocking pointer events (pointer-events-none) allowing full website interaction in foreground.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  X,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { CinematicDirector } from './CinematicDirector';

export const SCENE_STAGES = [
  { id: 1, name: 'Living Leaf', range: [0.0, 0.15], icon: '🍃' },
  { id: 2, name: 'Approaching Bubble', range: [0.15, 0.30], icon: '💧' },
  { id: 3, name: 'Passing Through Bubble', range: [0.30, 0.45], icon: '🌊' },
  { id: 4, name: 'Moving Through Clouds', range: [0.45, 0.60], icon: '☁️' },
  { id: 5, name: 'Veins Emerging', range: [0.60, 0.75], icon: '🔬' },
  { id: 6, name: 'Veins Morphing to Streets', range: [0.75, 0.90], icon: '⚡' },
  { id: 7, name: 'New Delhi Roadmap', range: [0.90, 1.00], icon: '🗺️' },
];

export default function VeinsOfLifeExperience({
  scrollProgress = 0,
  isInteractiveMap = false,
  onToggleInteractiveMap,
  onSelectCorridor,
  onOpenStudioView,
}) {
  const canvasRef = useRef(null);
  const directorRef = useRef(null);
  const onSelectCorridorRef = useRef(onSelectCorridor);
  onSelectCorridorRef.current = onSelectCorridor;
  const [activeLandmark, setActiveLandmark] = useState(null);

  // Initialize Cinematic Director on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const director = new CinematicDirector(canvasRef.current, {
      onLandmarkSelect: (landmark) => setActiveLandmark(landmark),
      onCorridorSelect: (corridorId) => {
        onSelectCorridorRef.current?.(corridorId);
      },
    });

    directorRef.current = director;

    return () => {
      director.destroy();
      directorRef.current = null;
    };
  }, []);

  // Synchronize scroll progress with 3D animation timeline
  useEffect(() => {
    if (directorRef.current && !isInteractiveMap) {
      directorRef.current.setProgress(scrollProgress);
    }
  }, [scrollProgress, isInteractiveMap]);

  // Toggle interactive orbit mode
  useEffect(() => {
    if (directorRef.current) {
      directorRef.current.setInteractiveMode(isInteractiveMap);
    }
  }, [isInteractiveMap]);

  // Find active stage
  let activeStage = SCENE_STAGES[0];
  for (const s of SCENE_STAGES) {
    if (scrollProgress >= s.range[0] && scrollProgress <= s.range[1]) {
      activeStage = s;
      break;
    }
  }

  // Cover photo opacity: exact 1.0 at initial page load, fades as animation glides into 3D
  const coverOpacity = scrollProgress < 0.02 ? 1 : Math.max(0, 1 - (scrollProgress - 0.02) * 12);

  return (
    <>
      {/* Starting Photo Cover: 100% authentic photograph on initial load */}
      <img
        src="/textures/leaf_cover.jpg"
        alt="Living Leaf Cover"
        className="fixed inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-700"
        style={{ opacity: coverOpacity, zIndex: 1 }}
      />

      {/* 3D WebGL Canvas Layer */}
      <div
        className={`fixed inset-0 w-full h-full overflow-hidden ${
          isInteractiveMap ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{ zIndex: 0 }}
      >
        <canvas
          ref={canvasRef}
          className={`w-full h-full block ${
            isInteractiveMap ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
          }`}
        />

        {/* Floating Exploration Banner (Active in 3D Orbit Mode) */}
        {isInteractiveMap && (
          <div className="absolute top-20 right-6 z-40 pointer-events-auto flex items-center gap-3">
            <div className="bg-slate-950/90 backdrop-blur-md border border-emerald-500/50 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-xs">
                <span className="font-bold text-white block">Interactive 3D Map Orbit Active</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Click &amp; drag to rotate • Right-click to pan • Wheel to zoom
                </span>
              </div>
              {onToggleInteractiveMap && (
                <button
                  onClick={() => onToggleInteractiveMap(false)}
                  className="ml-2 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1 transition"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Exit Orbit</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Interactive Landmark Tooltip / Modal */}
        {activeLandmark && isInteractiveMap && (
          <div className="absolute top-28 left-6 max-w-sm bg-slate-950/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-4 shadow-2xl z-40 pointer-events-auto animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{activeLandmark.name}</h3>
                  <span className="text-[10px] text-amber-300 font-mono">{activeLandmark.subtitle}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveLandmark(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
              {activeLandmark.description}
            </p>
            <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                {activeLandmark.lat.toFixed(4)}°N, {activeLandmark.lng.toFixed(4)}°E
              </span>
              {onOpenStudioView && (
                <button
                  onClick={() => {
                    setActiveLandmark(null);
                    if (onToggleInteractiveMap) onToggleInteractiveMap(false);
                    onOpenStudioView('map');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
                >
                  Inspect in Studio <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Cinematic Stage Pill (Non-blocking, informs user of current 3D stage) */}
      <div className="fixed bottom-4 left-6 z-30 pointer-events-none hidden sm:flex items-center gap-2">
        <div className="bg-slate-950/70 backdrop-blur-md border border-slate-800/80 rounded-full px-3 py-1 flex items-center gap-2 text-xs shadow-lg">
          <span className="text-sm">{activeStage.icon}</span>
          <span className="font-mono text-[10px] text-emerald-400 font-bold">
            0{activeStage.id}/07
          </span>
          <span className="text-slate-300 font-medium text-[11px]">{activeStage.name}</span>
        </div>
      </div>
    </>
  );
}
