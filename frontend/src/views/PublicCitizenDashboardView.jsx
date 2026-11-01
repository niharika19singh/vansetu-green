import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Trees,
  Wind,
  ShieldAlert,
  ArrowRight,
  MapPin,
  HeartPulse,
  Users,
  AlertTriangle,
  Droplets,
  Sun,
  Eye,
  CheckCircle2,
  Calendar,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { api } from '../api/client';

export const DELHI_DISTRICTS_LIST = [
  'Central',
  'East',
  'New Delhi',
  'North',
  'North East',
  'North West',
  'Shahdara',
  'South',
  'South East',
  'South West',
  'West',
];

export const DISTRICT_CLIMATE_DATA = {
  'Central': { temp: 42.4, status: 'Severe Heat Risk', canopy: '14%', coolSpots: 12, advice: 'Avoid unshaded footpaths along Asaf Ali Rd between 12 PM - 4 PM.' },
  'New Delhi': { temp: 37.8, status: 'Moderate Heat', canopy: '38%', coolSpots: 48, advice: 'Good tree cover along Shanti Path; Lodi Garden cooling refuge.' },
  'South': { temp: 41.2, status: 'High Heat Risk', canopy: '22%', coolSpots: 24, advice: 'Severe pedestrian heat along MB Road; seek metro station underpasses.' },
  'North': { temp: 43.1, status: 'Extreme Heat Risk', canopy: '11%', coolSpots: 8, advice: 'GT Karnal Road corridor has zero shade canopy. Carry water.' },
  'North East': { temp: 42.8, status: 'Extreme Heat Risk', canopy: '9%', coolSpots: 6, advice: 'High density, minimal tree cover. Community cooling tent active at Seelampur.' },
  'North West': { temp: 43.5, status: 'Extreme Heat Risk', canopy: '12%', coolSpots: 14, advice: 'Industrial heat island around Wazirpur; stay indoors during peak sun.' },
  'East': { temp: 41.8, status: 'High Heat Risk', canopy: '16%', coolSpots: 18, advice: 'Vikas Marg footpaths lack continuous shade; cooling shelters near Laxmi Nagar.' },
  'West': { temp: 41.5, status: 'High Heat Risk', canopy: '18%', coolSpots: 21, advice: 'Najafgarh Road corridor undergoing PWD tree planting.' },
  'South West': { temp: 40.5, status: 'High Heat Risk', canopy: '24%', coolSpots: 32, advice: 'Dwarka sub-city sectors offer scattered tree shade.' },
  'South East': { temp: 42.0, status: 'Severe Heat Risk', canopy: '17%', coolSpots: 16, advice: 'Mathura Road and Badarpur flyover underpasses have drinking water.' },
  'Shahdara': { temp: 42.6, status: 'Severe Heat Risk', canopy: '10%', coolSpots: 9, advice: 'GT Road Shahdara lacks pedestrian shade trees. Heat alert active.' },
};

export default function PublicCitizenDashboardView({
  onNavigate,
  selectedDistrict: initialDistrict = 'South',
  onSelectCorridor,
}) {
  const [district, setDistrict] = useState(initialDistrict);
  const [stats, setStats] = useState(null);
  const [communityReports, setCommunityReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [statsRes, reportsRes] = await Promise.allSettled([
          api.getStatsSummary(),
          api.getCommunityObservationsLegacy(),
        ]);
        if (!mounted) return;
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (reportsRes.status === 'fulfilled') setCommunityReports(reportsRes.value || []);
      } catch (err) {
        console.warn('Failed loading citizen dashboard data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const dInfo = DISTRICT_CLIMATE_DATA[district] || DISTRICT_CLIMATE_DATA['South'];

  return (
    <div className="h-full overflow-y-auto bg-[#071C16] p-4 md:p-6 space-y-6 text-slate-100 font-body">
      {/* Citizen Welcome & Heat Advisory Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-[#0D2821] to-[#071C16] border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/40 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                DELHI PUBLIC CLIMATE OBSERVATORY
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">Clean Air &amp; Pedestrian Shade for Citizens</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Delhi Urban Heat &amp; Green Walking Guide
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Find shaded walking routes, check neighborhood heat alerts, discover new tree-planting projects,
              and report unshaded bus stops or broken water booths directly to municipal teams.
            </p>
          </div>

          {/* Today's Public Heat Warning Badge */}
          <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl p-4 shrink-0 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Today's Climate Advisory</div>
              <div className="text-sm font-bold text-white">Moderate Heat Caution (38°C - 42°C)</div>
              <div className="text-[11px] text-slate-300">Drink water frequently; prefer tree-covered walkways.</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Accessible Environmental Vital Signs for Citizens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vital 1: Current City Heat */}
        <div className="bg-[#0D2821] border border-emerald-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">City Heat Level</span>
            <Thermometer className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-orange-400 font-mono">41.2°C</span>
            <span className="text-xs text-slate-400">Peak Afternoon</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Unshaded asphalt roads can feel up to 7°C hotter than tree-lined paths.
          </p>
        </div>

        {/* Vital 2: Tree Shade Coverage */}
        <div className="bg-[#0D2821] border border-emerald-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Sidewalk Tree Shade</span>
            <Trees className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">22%</span>
            <span className="text-xs text-slate-400">Avg Citywide</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Delhi PWD target is 45% continuous tree shade on major pedestrian routes.
          </p>
        </div>

        {/* Vital 3: Air Quality Level */}
        <div className="bg-[#0D2821] border border-emerald-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Air Quality (AQI)</span>
            <Wind className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300 font-mono">214</span>
            <span className="text-xs text-amber-400 font-semibold">Moderate</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Trees act as living dust filters, absorbing vehicular exhaust at street level.
          </p>
        </div>

        {/* Vital 4: Active Cooling Projects */}
        <div className="bg-[#0D2821] border border-emerald-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Green Works Active</span>
            <Droplets className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-teal-300 font-mono">18</span>
            <span className="text-xs text-slate-400">Corridors Planted</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Over 24,000 native neem and peepal saplings currently being maintained.
          </p>
        </div>
      </div>

      {/* District Climate Explorer: Select any of Delhi's 11 Districts */}
      <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400" />
              Check Heat &amp; Shade in Your District
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your revenue district to see local surface temperature and safe cool zones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">District:</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="bg-[#071C16] border border-emerald-500/40 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-teal-400"
            >
              {DELHI_DISTRICTS_LIST.map((d) => (
                <option key={d} value={d}>
                  {d} Delhi
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Local District Card Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#071C16] rounded-xl p-4 border border-emerald-500/10">
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400 font-medium">Local Surface Heat</div>
            <div className="text-2xl font-black text-white font-mono flex items-center gap-2">
              <span>{dInfo.temp}°C</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-sans font-bold ${
                dInfo.temp > 42 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {dInfo.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">Tree Canopy Cover: <strong className="text-emerald-400">{dInfo.canopy}</strong></div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-slate-400 font-medium">Cool Refuge Zones</div>
            <div className="text-2xl font-black text-teal-300 font-mono">
              {dInfo.coolSpots} Locations
            </div>
            <div className="text-[11px] text-slate-400">Shaded parks, mist booths, and public gardens.</div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-slate-400 font-medium">Local Public Advisory</div>
            <div className="text-xs text-slate-200 leading-snug">
              {dInfo.advice}
            </div>
            <button
              onClick={() => onNavigate && onNavigate('public_map')}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 pt-1"
            >
              <span>View On Public Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Citizen Feature Cards: Public Climate Map & Report an Issue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Explore Public Climate Map */}
        <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-400">
              <Eye className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Explore Public Heat &amp; Tree Map</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              See which major streets have cool continuous shade and which ones suffer from extreme heat.
              Color-coded green (safe cool walk) to red (extreme heat exposure).
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate && onNavigate('public_map')}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
            >
              <span>Open Public Climate Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Report Missing Trees or Shade */}
        <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Users className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Report an Unshaded Street or Issue</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Is your bus stop baking in the sun? Have roadside trees been chopped down? Report it directly
              so the Public Works Department can prioritize your area for planting.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate && onNavigate('public_report')}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
            >
              <span>Report Neighborhood Issue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Community Observations & Recent Public Activity */}
      <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              Recent Citizen Observations &amp; Complaints
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Real reports submitted by Delhi residents informing municipal priorities</p>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('community_input')}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 transition"
          >
            <span>View All ({communityReports.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {communityReports.slice(0, 6).map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-xl bg-[#071C16] border border-emerald-500/10 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-white truncate max-w-[150px]">
                  {item.street || item.ward || 'Delhi Street'}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  item.verification_status === 'verified_remedied'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {item.verification_status === 'verified_remedied' ? 'Resolved' : 'Under Review'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-2">
                {item.description || `Heat: ${item.heatLevel || 'High'} • Shade: ${item.shadeLevel || 'Low'}`}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5">
                <span>District: {item.ward || 'Central'}</span>
                <span>{item.submitted_at ? item.submitted_at.substring(0, 10) : 'Recent'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
