import React, { useState } from 'react';
import {
  HeartPulse,
  Sun,
  Thermometer,
  ShieldAlert,
  AlertTriangle,
  Droplets,
  Trees,
  PhoneCall,
  MapPin,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

export const DELHI_EMERGENCY_HOSPITALS = [
  { name: 'Lok Nayak Jai Prakash Narayan (LNJP) Hospital', district: 'Central Delhi', phone: '011-23233000', coolingUnits: 45, address: 'Jawaharlal Nehru Marg, Delhi Gate' },
  { name: 'Safdarjung Hospital & VMMC', district: 'South Delhi', phone: '011-26165060', coolingUnits: 60, address: 'Ring Road, Opposite AIIMS' },
  { name: 'All India Institute of Medical Sciences (AIIMS)', district: 'South Delhi', phone: '011-26588500', coolingUnits: 80, address: 'Sri Aurobindo Marg, Ansari Nagar' },
  { name: 'Guru Teg Bahadur (GTB) Hospital', district: 'Shahdara / East Delhi', phone: '011-22586262', coolingUnits: 40, address: 'Dilshad Garden, Tahirpur' },
  { name: 'Dr. Ram Manohar Lohia (RML) Hospital', district: 'New Delhi', phone: '011-23365525', coolingUnits: 50, address: 'Baba Kharak Singh Marg' },
  { name: 'Deen Dayal Upadhyay (DDU) Hospital', district: 'West Delhi', phone: '011-25494401', coolingUnits: 35, address: 'Hari Nagar, Clock Tower' },
  { name: 'Sanjay Gandhi Memorial Hospital', district: 'North West Delhi', phone: '011-27922800', coolingUnits: 30, address: 'Mangolpuri, Outer Ring Road' },
  { name: 'Acharyashree Bhikshu Hospital', district: 'West Delhi', phone: '011-25102000', coolingUnits: 25, address: 'Moti Nagar' },
];

export default function PublicHeatSafetyView({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('safety'); // 'safety', 'science', 'hospitals'

  return (
    <div className="h-full overflow-y-auto bg-[#071C16] p-4 md:p-6 space-y-6 text-slate-100 font-body">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/70 via-[#0D2821] to-[#071C16] border border-rose-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/40 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                CITIZEN HEAT SAFETY &amp; HEALTH DIRECTORY
              </span>
              <span className="text-slate-400 text-xs">Public Heatwave Guidelines</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Beat the Heat: Health Protection &amp; Cooling Centers
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Understand heat risks, recognize heatstroke symptoms, find cool shelters, and access
              designated government emergency cooling wards across Delhi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="tel:102"
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Medical Emergency: 102</span>
            </a>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2">
        <button
          onClick={() => setActiveTab('safety')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'safety'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Heat Safety &amp; First Aid</span>
        </button>

        <button
          onClick={() => setActiveTab('science')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'science'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Why Delhi Streets Overheat</span>
        </button>

        <button
          onClick={() => setActiveTab('hospitals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'hospitals'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Emergency Cooling Centers ({DELHI_EMERGENCY_HOSPITALS.length})</span>
        </button>
      </div>

      {/* Tab 1: Safety & Symptoms */}
      {activeTab === 'safety' && (
        <div className="space-y-6">
          {/* Heat Exhaustion vs Heatstroke */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Heat Exhaustion (Moderate Caution) */}
            <div className="bg-[#0D2821] border border-amber-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <span className="font-bold text-amber-300 text-sm">Heat Exhaustion (Early Warning)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                  MOVE TO SHADE IMMEDIATELY
                </span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Heavy sweating, cold and clammy skin</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Dizziness, lightheadedness, or feeling faint</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Nausea, stomach cramps, or vomiting</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Fast, weak pulse and muscle cramps</span>
                </li>
              </ul>
              <div className="p-3 rounded-xl bg-[#071C16] border border-amber-500/20 text-[11px] text-amber-200">
                <strong>First Aid:</strong> Loosen clothing, sip cool water, apply wet cloths to neck, and rest in deep tree shade or an air-conditioned room.
              </div>
            </div>

            {/* Heatstroke (Life-Threatening Emergency) */}
            <div className="bg-[#0D2821] border border-rose-500/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <span className="font-bold text-rose-300 text-sm">Heatstroke (Medical Emergency)</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold">
                  CALL 102 IMMEDIATELY
                </span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Extremely high body temperature (above 39.5°C / 103°F)</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Hot, red, dry skin with no sweating</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Confusion, slurred speech, or loss of consciousness</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Throbbing headache and rapid, strong pulse</span>
                </li>
              </ul>
              <div className="p-3 rounded-xl bg-[#071C16] border border-rose-500/20 text-[11px] text-rose-200">
                <strong>Emergency Action:</strong> Call 102 immediately. Move person to shade, pour cold water over body, fan rapidly, and do NOT give liquids to an unconscious person.
              </div>
            </div>
          </div>

          {/* Dos and Don'ts */}
          <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Daily Heatwave Dos and Don&apos;ts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>DO</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li>• Carry a refillable water bottle and drink at least 3-4 liters daily.</li>
                  <li>• Wear light-colored, loose cotton clothing and a wide-brim hat.</li>
                  <li>• Use shaded pedestrian corridors and avoid walking on open asphalt during 12 PM - 4 PM.</li>
                  <li>• Keep oral rehydration salts (ORS) or nimbu paani handy.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>DON&apos;T</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  <li>• Do not leave children or elderly persons inside parked vehicles.</li>
                  <li>• Avoid heavy protein meals and excessive caffeine/alcohol in peak sun.</li>
                  <li>• Do not engage in strenuous outdoor exercise during afternoon hours.</li>
                  <li>• Do not walk pets on dark asphalt when road surface is scalding.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Why Delhi Streets Overheat (Science in Plain English) */}
      {activeTab === 'science' && (
        <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-6 space-y-5">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-base font-bold text-white">Why Do Delhi Roads Become Extreme Heat Traps?</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              When satellite sensors fly over Delhi, they measure ground temperatures up to 48°C on unshaded roads.
              Here is how urban physics affects your daily walk:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/10 space-y-2">
              <div className="flex items-center gap-2 text-orange-400">
                <Thermometer className="w-4 h-4" />
                <h3 className="text-xs font-bold text-white">Asphalt Heat Sponge</h3>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Black tar absorbs 95% of incoming solar radiation, storing heat throughout the day and radiating it back onto pedestrians even hours after sunset.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/10 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Trees className="w-4 h-4" />
                <h3 className="text-xs font-bold text-white">The Power of Tree Canopy</h3>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                A mature Neem or Peepal tree cools through &apos;evapotranspiration&apos; — releasing moisture into the air. This cools sidewalks by 4°C to 8°C compared to bare pavement.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/10 space-y-2">
              <div className="flex items-center gap-2 text-teal-400">
                <Droplets className="w-4 h-4" />
                <h3 className="text-xs font-bold text-white">Shade Continuity</h3>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Isolated trees do not protect pedestrians. VanSetu plans continuous 500-meter shade corridors so walkers never have to step into scorching direct sunlight.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Emergency Cooling Centers & Hospitals */}
      {activeTab === 'hospitals' && (
        <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                Designated Government Heat Emergency Centers
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Equipped with specialized heatstroke ice baths, IV fluids, and air-conditioned recovery wards.</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
              ABDM Verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DELHI_EMERGENCY_HOSPITALS.map((h, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/10 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-xs leading-snug">{h.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-teal-500/20 text-teal-300 shrink-0">
                    {h.coolingUnits} Beds
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>{h.address} ({h.district})</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[11px] text-slate-300 font-mono">Emergency: {h.phone}</span>
                  <a
                    href={`tel:${h.phone}`}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                  >
                    <span>Call Emergency</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
