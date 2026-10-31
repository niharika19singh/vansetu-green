/**
 * VeinsOfLifeModal.jsx — Accessible Full-Screen Storytelling Journey Modal.
 * Preserves the complete 7-stage "Veins of Life" 3D WebGL cinematic journey:
 * 1. Living Leaf
 * 2. Approaching Bubble
 * 3. Passing Through Bubble
 * 4. Moving Through Clouds
 * 5. Veins Emerging
 * 6. Veins Morphing to Streets
 * 7. New Delhi Roadmap
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  ArrowRight,
  ExternalLink,
  MapPin,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import VeinsOfLifeExperience, { SCENE_STAGES } from '../cinematic/VeinsOfLifeExperience';
import { cinematicAudio } from '../cinematic/audioSynth';
import { DELHI_LANDMARKS } from '../cinematic/delhiNetwork';

export default function VeinsOfLifeModal({
  isOpen,
  onClose,
  onSelectCorridor,
  onOpenStudioView,
}) {
  const [stageProgress, setStageProgress] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isInteractiveMap, setIsInteractiveMap] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const animFrameRef = useRef(null);

  // Auto-play timeline when open
  useEffect(() => {
    if (!isOpen || !isPlaying || isInteractiveMap) return;

    let lastTime = performance.now();
    const step = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      setStageProgress((prev) => {
        // Complete journey over ~35 seconds (or loop)
        const next = prev + delta * 0.028;
        if (next >= 1.0) {
          return 1.0;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPlaying, isInteractiveMap]);

  if (!isOpen) return null;

  const currentStage =
    SCENE_STAGES.find(
      (s) => stageProgress >= s.range[0] && stageProgress <= s.range[1]
    ) || SCENE_STAGES[0];

  const handleToggleSound = () => {
    const unmuted = cinematicAudio.toggleMute();
    setIsMuted(!unmuted);
  };

  const jumpToStage = (stage) => {
    setStageProgress(stage.range[0] + 0.02);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl text-slate-100">
      {/* 3D WebGL Background Scene */}
      <VeinsOfLifeExperience
        scrollProgress={stageProgress}
        isInteractiveMap={isInteractiveMap}
        onToggleInteractiveMap={setIsInteractiveMap}
        onSelectCorridor={(id) => {
          onSelectCorridor?.(id);
          onClose();
        }}
        onOpenStudioView={(view) => {
          onOpenStudioView?.(view);
          onClose();
        }}
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-0 left-0 right-0 h-20 px-6 sm:px-10 flex items-center justify-between z-30 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
            <span className="text-lg">🍃</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white drop-shadow">
                Veins of Life — 7-Stage Journey
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Stage {currentStage.id}/7
              </span>
            </div>
            <p className="text-xs text-slate-300 drop-shadow">
              Biological leaf venation to NCT Delhi arterial climate corridors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2.5 rounded-xl border backdrop-blur-md transition ${
              isMuted
                ? 'bg-slate-900/70 border-white/10 text-slate-400 hover:text-white'
                : 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20'
            }`}
            title="Toggle Ambient Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* 3D Orbit Toggle */}
          <button
            onClick={() => setIsInteractiveMap(!isInteractiveMap)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border backdrop-blur-md flex items-center gap-1.5 transition ${
              isInteractiveMap
                ? 'bg-amber-600/40 border-amber-400 text-amber-200'
                : 'bg-slate-900/70 border-white/10 hover:border-white/20 text-slate-200'
            }`}
            title="Toggle 3D Orbit Controls"
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isInteractiveMap ? '3D Orbit Active' : 'Orbit 3D'}
            </span>
          </button>

          {/* Close Story Button */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/20 text-slate-200 hover:text-white transition shadow-lg"
            title="Close Cinematic Story and return to Homepage"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Timeline & Stage Navigation Bar */}
      <div className="absolute bottom-6 left-6 right-6 sm:left-12 sm:right-12 z-30 max-w-4xl mx-auto bg-slate-950/80 backdrop-blur-xl border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
        {/* Stage Name & Play/Pause */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md"
              title={isPlaying ? 'Pause Timeline' : 'Play Timeline'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                setStageProgress(0);
                setIsPlaying(true);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Restart Journey"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-white text-sm ml-1">
              {currentStage.icon} {currentStage.name}
            </span>
          </div>

          <span className="font-mono text-emerald-400 font-bold">
            {(stageProgress * 100).toFixed(0)}%
          </span>
        </div>

        {/* Scrub Slider */}
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.002"
          value={stageProgress}
          onChange={(e) => {
            setStageProgress(parseFloat(e.target.value));
            setIsPlaying(false);
          }}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />

        {/* 7 Stage Pills */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-1">
          {SCENE_STAGES.map((st) => {
            const isActive = currentStage.id === st.id;
            return (
              <button
                key={st.id}
                onClick={() => jumpToStage(st)}
                className={`py-1 px-1 rounded-xl text-[10px] sm:text-xs font-semibold truncate transition text-center border ${
                  isActive
                    ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-800'
                }`}
                title={st.name}
              >
                <span className="sm:inline hidden">{st.icon} </span>
                <span>{st.id}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
