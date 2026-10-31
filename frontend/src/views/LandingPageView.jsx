/**
 * LandingPageView.jsx — Minimal, Nature-Inspired Editorial Landing Page.
 * Features:
 * - Completely clean opening screen: ZERO top buttons, uninterrupted forest and living water.
 * - Spacious asymmetric hero: Left-aligned editorial headline, concise description, and single primary "Explore Delhi Map" CTA.
 * - Narrative sections below hero:
 *   1. The Urban Challenge (Heat Island, Canopy Deficit, Public Health)
 *   2. How VanSetu Works (Observe -> Analyze -> Prioritize -> Plan)
 *   3. Explore the Map (Flagship Map Preview)
 *   4. Platform Capabilities (Corridors, Scenario Lab, Intervention Optimizer, Records)
 *   5. Closing Action & Interactive Map Explorer Launch
 */
import React from 'react';
import {
  Map,
  Trees,
  Sliders,
  Calculator,
  Brain,
  Droplets,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Thermometer,
  Wind,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import LivingForestExperience from '../forest/LivingForestExperience';

export default function LandingPageView({
  onNavigate,
  statsSummary,
}) {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const lstMean = statsSummary?.raster?.lst?.mean ? statsSummary.raster.lst.mean.toFixed(1) : '25.8';
  const ndviMean = statsSummary?.raster?.ndvi?.mean ? statsSummary.raster.ndvi.mean.toFixed(3) : '0.310';
  const aqiMean = statsSummary?.aqi?.mean_aqi || '237.6';

  return (
    <div className="relative w-full min-h-screen text-[#F3F1E7] font-body selection:bg-emerald-600/30 selection:text-emerald-100">
      {/* =========================================================================
          LOCKED VISUAL ASSET — THE LIVING FOREST BACKGROUND (Continuous water motion)
          ========================================================================= */}
      <LivingForestExperience interactiveWater={true} />

      {/* Atmospheric Vignette for readability */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-gradient-to-b from-[#071C16]/25 via-transparent to-[#071C16]/80" />

      {/* =========================================================================
          SECTION 1: HERO — COMPLETELY UNINTERRUPTED (ZERO TOP BUTTONS)
          ========================================================================= */}
      <section
        id="hero"
        className="min-h-screen flex flex-col justify-center px-6 sm:px-14 lg:px-24 pt-20 pb-16 relative"
      >
        <div className="max-w-2xl space-y-7">
          {/* Elegant Headline */}
          <h1 className="font-editorial text-5xl sm:text-7xl lg:text-8xl font-bold text-[#F3F1E7] tracking-tight leading-[1.04] drop-shadow-2xl">
            Where Nature’s Canopy <br />
            <span className="italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-emerald-100 to-[#D4BD82]">
              Breathes Life into Delhi.
            </span>
          </h1>

          {/* Concise Product Description */}
          <p className="text-base sm:text-lg text-[#F3F1E7]/90 font-normal leading-relaxed max-w-xl drop-shadow-lg">
            VanSetu is an urban heat and green corridor decision-support platform that combines
            satellite observations, environmental analysis, and optimization tools to help identify,
            compare, and prioritize greener interventions across Delhi.
          </p>

          {/* Restrained CTAs: Primary Map CTA + Secondary Discover */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('map')}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm sm:text-base flex items-center gap-3 shadow-2xl shadow-emerald-950/80 transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <span>Explore Delhi Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => scrollToSection('urban-challenge')}
              className="px-6 py-4 rounded-full bg-[#071C16]/50 hover:bg-[#071C16]/80 border border-white/20 text-[#F3F1E7] font-medium text-sm backdrop-blur-md transition-all hover:scale-[1.02]"
            >
              Discover VanSetu
            </button>
          </div>
        </div>

        {/* Subtle Scroll Hint */}
        <div
          onClick={() => scrollToSection('urban-challenge')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-[#9CB9A3] text-xs cursor-pointer transition hover:text-white"
        >
          <span>Scroll to learn more</span>
          <ChevronDown className="w-4 h-4 text-emerald-300 animate-bounce" />
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: THE URBAN CHALLENGE
          ========================================================================= */}
      <section
        id="urban-challenge"
        className="min-h-[85vh] flex flex-col justify-center px-6 sm:px-14 lg:px-24 py-24 bg-[#071C16]/85 backdrop-blur-2xl border-t border-white/10"
      >
        <div className="max-w-3xl space-y-4">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
            01 • The Urban Climate Challenge
          </div>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[#F3F1E7] tracking-tight">
            Delhi's Extreme Heat &amp; Vegetative Deficits
          </h2>
          <p className="text-[#F3F1E7]/80 text-sm sm:text-base leading-relaxed">
            Rapid urbanization, dense concrete pavements, and vehicular emissions have created severe
            microclimate thermal anomalies across the National Capital Territory. Millions of daily
            commuters traverse exposed asphalt corridors with sparse vegetative canopy coverage.
          </p>
        </div>

        {/* 3 Factual Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-5xl">
          <div className="bg-[#12392B]/50 border border-white/10 hover:border-emerald-400/30 rounded-3xl p-6 space-y-3 transition">
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400">
                <Thermometer className="w-5 h-5" />
              </span>
              <span className="font-mono text-2xl font-bold text-white">{lstMean}°C</span>
            </div>
            <h3 className="font-editorial text-lg font-bold text-white">Surface Heat Islands</h3>
            <p className="text-xs text-[#9CB9A3] leading-relaxed">
              NASA MODIS daytime land surface temperature revealing localized hotspots exceeding 34.2°C
              in dense commercial and industrial wards.
            </p>
          </div>

          <div className="bg-[#12392B]/50 border border-white/10 hover:border-emerald-400/30 rounded-3xl p-6 space-y-3 transition">
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300">
                <Trees className="w-5 h-5" />
              </span>
              <span className="font-mono text-2xl font-bold text-white">{ndviMean}</span>
            </div>
            <h3 className="font-editorial text-lg font-bold text-white">Canopy Deficits</h3>
            <p className="text-xs text-[#9CB9A3] leading-relaxed">
              ESA Sentinel-2 10m Normalized Difference Vegetation Index indicating critical canopy and
              evapotranspiration deficits along high-volume transit routes.
            </p>
          </div>

          <div className="bg-[#12392B]/50 border border-white/10 hover:border-emerald-400/30 rounded-3xl p-6 space-y-3 transition">
            <div className="flex items-center justify-between">
              <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300">
                <Wind className="w-5 h-5" />
              </span>
              <span className="font-mono text-2xl font-bold text-amber-200">{aqiMean}</span>
            </div>
            <h3 className="font-editorial text-lg font-bold text-white">Particulate Exposure</h3>
            <p className="text-xs text-[#9CB9A3] leading-relaxed">
              Continuous CPCB telemetry capturing elevated particulate concentrations where street
              canyons trap vehicular dust and heat.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: HOW VANSETU WORKS (Observe -> Analyze -> Prioritize -> Plan)
          ========================================================================= */}
      <section
        id="how-it-works"
        className="min-h-[85vh] flex flex-col justify-center px-6 sm:px-14 lg:px-24 py-24 bg-[#071C16]/95 border-t border-white/10"
      >
        <div className="max-w-3xl space-y-4">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
            02 • Scientific Workflow
          </div>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[#F3F1E7] tracking-tight">
            How VanSetu Works
          </h2>
          <p className="text-[#F3F1E7]/80 text-sm sm:text-base leading-relaxed">
            A continuous four-stage analytical methodology translating raw Earth observation data into
            mathematically optimized green corridor budgets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12 max-w-6xl">
          {[
            {
              step: '01',
              title: 'Observe',
              desc: 'Ingests native NASA MODIS (1km) LST, ESA Sentinel-2 (10m) NDVI, and CPCB AQI stations.',
              icon: Droplets,
            },
            {
              step: '02',
              title: 'Analyze',
              desc: 'Models microclimate thermal stress, pedestrian exposure density, and green deficit indices (GDI).',
              icon: Thermometer,
            },
            {
              step: '03',
              title: 'Prioritize',
              desc: 'Ranks 44 arterial corridors across 5 customizable municipal policy scenarios.',
              icon: Sliders,
            },
            {
              step: '04',
              title: 'Plan',
              desc: 'Solves Mixed-Integer Linear Programs (MILP) to allocate green infrastructure budgets optimally.',
              icon: Calculator,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-[#12392B]/40 border border-white/10 hover:border-emerald-400/40 rounded-3xl p-6 space-y-4 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Stage {item.step}
                  </span>
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="font-editorial text-xl font-bold text-white">{item.title}</h3>
                <p className="text-xs text-[#9CB9A3] leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: EXPLORE THE MAP (Flagship Preview)
          ========================================================================= */}
      <section
        id="map-preview"
        className="min-h-[80vh] flex flex-col justify-center px-6 sm:px-14 lg:px-24 py-24 bg-[#071C16]/90 border-t border-white/10 relative overflow-hidden"
      >
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
              03 • Flagship Product Experience
            </div>
            <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[#F3F1E7] tracking-tight">
              Interactive Delhi Map Explorer
            </h2>
            <p className="text-[#F3F1E7]/80 text-sm leading-relaxed">
              Explore 44 prioritized transit corridors across all 11 Delhi districts. Toggle Land Surface
              Temperature thermal zones, Sentinel vegetation overlays, and ground CPCB telemetry with
              point-and-click inspection.
            </p>
            <button
              onClick={() => onNavigate('map')}
              className="px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-emerald-950/60 transition hover:scale-[1.02]"
            >
              <span>Launch Fullscreen Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div
            onClick={() => onNavigate('map')}
            className="lg:col-span-7 bg-[#12392B]/50 border border-emerald-400/40 rounded-3xl p-4 shadow-2xl cursor-pointer group hover:border-emerald-300 transition-all hover:scale-[1.01]"
          >
            <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center">
              {/* Map Preview Graphic */}
              <img
                src="/textures/delhi_map_reference.png"
                alt="Delhi Map Preview"
                className="w-full h-full object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-600/90 border border-white/20 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition">
                  <Map className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider bg-slate-950/80 px-3 py-1 rounded-full border border-white/10">
                  Click to Open Interactive Map
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: PLATFORM CAPABILITIES
          ========================================================================= */}
      <section
        id="capabilities"
        className="min-h-[85vh] flex flex-col justify-center px-6 sm:px-14 lg:px-24 py-24 bg-[#071C16]/95 border-t border-white/10"
      >
        <div className="max-w-3xl space-y-4">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
            04 • Specialized Tools
          </div>
          <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-[#F3F1E7] tracking-tight">
            Comprehensive Climate Decision Suite
          </h2>
          <p className="text-[#F3F1E7]/80 text-sm sm:text-base leading-relaxed">
            Move seamlessly between high-level geospatial exploration and granular computational
            decision-support.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 max-w-6xl">
          <div
            onClick={() => onNavigate('corridors')}
            className="bg-[#12392B]/40 hover:bg-[#12392B]/70 border border-white/10 hover:border-emerald-400/40 rounded-3xl p-6 space-y-3 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Trees className="w-5 h-5" />
            </div>
            <h3 className="font-editorial text-lg font-bold text-white">44 Corridors Explorer</h3>
            <p className="text-xs text-[#9CB9A3] leading-relaxed">
              Inspect verified arterial transit corridors with detailed severity rankings and lengths.
            </p>
            <span className="text-xs text-emerald-400 font-bold inline-flex items-center gap-1 pt-2">
              Explore Corridors &rarr;
            </span>
          </div>

          <div
            onClick={() => onNavigate('canopy')}
            className="bg-[#12392B]/40 hover:bg-[#12392B]/70 border border-white/10 hover:border-emerald-400/40 rounded-3xl p-6 space-y-3 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
            <h3 className="font-editorial text-lg font-bold text-white">Canopy &amp; Hydrology</h3>
            <p className="text-xs text-[#9CB9A3] leading-relaxed">
              Explore 10m Sentinel canopy density, 1km thermal anomalies, and district matrices.
            </p>
            <span className="text-xs text-teal-300 font-bold inline-flex items-center gap-1 pt-2">
              View Canopy Data &rarr;
            </span>
          </div>

          <div
            onClick={() => onNavigate('scenarios')}
            className="bg-[#12392B]/40 hover:bg-[#12392B]/70 border border-white/10 hover:border-emerald-400/40 rounded-3xl p-6 space-y-3 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-editorial text-lg font-bold text-white">Scenario Lab</h3>
            <p className="text-xs text-[#9CB9A3] leading-relaxed">
              Simulate 5 municipal policy scenarios and dynamically test heat sensitivity weights.
            </p>
            <span className="text-xs text-amber-300 font-bold inline-flex items-center gap-1 pt-2">
              Run Scenarios &rarr;
            </span>
          </div>

          <div
            onClick={() => onNavigate('studio')}
            className="bg-[#12392B]/40 hover:bg-[#12392B]/70 border border-white/10 hover:border-emerald-400/40 rounded-3xl p-6 space-y-3 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-editorial text-lg font-bold text-white">Decision Studio</h3>
            <p className="text-xs text-[#9CB9A3] leading-relaxed">
              Run MILP budget optimization, IOMETE procurement, and Gemini 3.8 Flash AI co-pilot.
            </p>
            <span className="text-xs text-blue-300 font-bold inline-flex items-center gap-1 pt-2">
              Open Decision Studio &rarr;
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: CLOSING ACTION & MAP EXPLORER LAUNCH
          ========================================================================= */}
      <section
        id="closing-cta"
        className="min-h-[70vh] flex flex-col justify-center items-center text-center px-6 sm:px-14 py-24 bg-[#071C16] border-t border-white/10 relative"
      >
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <span>🌿</span>
            <span>Ecological Corridors & Urban Heat Mitigation</span>
          </div>

          <h2 className="font-editorial text-4xl sm:text-6xl font-bold text-white tracking-tight">
            Ready to Explore Delhi's Climate Corridors?
          </h2>

          <p className="text-sm sm:text-base text-[#F3F1E7]/80 leading-relaxed max-w-xl mx-auto">
            Step into the interactive map to inspect microclimates, evaluate corridor priority scores,
            and model greener urban futures.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('map')}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm sm:text-base flex items-center gap-3 shadow-2xl shadow-emerald-950/80 transition hover:scale-105"
            >
              <span>Launch Map Explorer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="mt-20 pt-8 border-t border-white/10 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between text-xs text-[#9CB9A3] gap-4">
          <div className="flex items-center gap-2">
            <Trees className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">VanSetu — NCT Delhi v2.0</span>
            <span>• HackCBS 9.0 GreenTech</span>
          </div>
          <div>
            The Living Forest Engine • NASA MODIS • ESA Sentinel-2 • CPCB Telemetry
          </div>
        </footer>
      </section>
    </div>
  );
}
