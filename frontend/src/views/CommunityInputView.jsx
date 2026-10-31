/**
 * CommunityInputView.jsx — Citizen & Community Observation Intake Workspace.
 * 
 * Features:
 * - Direct intake form for ground-level heat, shade, and air quality observations.
 * - Anonymized privacy protection (salted IP hashing).
 * - Real-time review feed of submitted citizen observations.
 * - District coverage across all 11 NCT Delhi administrative districts.
 */
import React, { useState, useEffect } from 'react';
import {
  Users,
  Send,
  MapPin,
  Flame,
  Trees,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';

export default function CommunityInputView({
  districts = [],
  selectedDistrict = 'All Districts',
  onSelectDistrict,
}) {
  const [formData, setFormData] = useState({
    city: 'Delhi',
    ward: selectedDistrict !== 'All Districts' ? selectedDistrict : 'Central',
    street: '',
    userType: 'resident',
    heatLevel: 'Extreme',
    shadeLevel: 'No Shade',
    pedestrianActivity: 'High',
    peakTime: 'Afternoon',
    pollutionLevel: 'Moderate',
    pollutionSource: 'Vehicular',
    heatwaveRisk: 'High',
    vulnerablePopulation: 'High',
    emergencyHeatIncidents: 'Heat exhaustion observed near bus stop',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [observations, setObservations] = useState([]);
  const [isLoadingObs, setIsLoadingObs] = useState(false);

  // Sync ward if district changes
  useEffect(() => {
    if (selectedDistrict && selectedDistrict !== 'All Districts') {
      setFormData((prev) => ({ ...prev, ward: selectedDistrict }));
    }
  }, [selectedDistrict]);

  // Load observations feed
  const loadObservations = async () => {
    setIsLoadingObs(true);
    try {
      const data = await api.getCommunityObservationsLegacy();
      if (Array.isArray(data)) {
        setObservations(data);
      }
    } catch (err) {
      console.warn('Failed to load community observations:', err);
    } finally {
      setIsLoadingObs(false);
    }
  };

  useEffect(() => {
    loadObservations();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.street.trim()) {
      setSubmitError('Please specify the street or landmark location.');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      const res = await api.submitCommunityObservationLegacy(formData);
      setSubmitSuccess(`Observation recorded successfully (ID: ${res.id}). Thank you for contributing!`);
      setFormData((prev) => ({ ...prev, street: '', emergencyHeatIncidents: '' }));
      loadObservations();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit observation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#071C16] text-[#F3F1E7]">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#071C16]/95 backdrop-blur-md flex-shrink-0">
        <div>
          <h2 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Citizen &amp; Community Ground Observations
          </h2>
          <p className="text-xs text-[#9CB9A3]">
            Submit localized heat stress, shade deficit, and walking conditions to inform municipal greening priority
          </p>
        </div>

        <button
          onClick={loadObservations}
          className="px-3 py-1.5 rounded-xl bg-[#12392B] hover:bg-[#12392B]/80 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingObs ? 'animate-spin' : ''}`} />
          <span>Refresh Observations</span>
        </button>
      </header>

      {/* Main Form & Feed Split */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Intake Form Column */}
          <div className="lg:col-span-7 bg-[#0d2b21] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Submit Ground Observation
              </h3>
              <span className="text-[11px] text-[#9CB9A3] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Anonymized Privacy Hashed
              </span>
            </div>

            {submitSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* District / Ward */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Delhi District / Ward</label>
                  <select
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d} className="bg-[#0b241c] text-white">{d}</option>
                    ))}
                  </select>
                </div>

                {/* Observer Role */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Your Perspective</label>
                  <select
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="resident">Local Resident</option>
                    <option value="commuter">Daily Pedestrian / Commuter</option>
                    <option value="vendor">Street Vendor / Outdoor Worker</option>
                    <option value="student">Student / School Transit</option>
                    <option value="senior">Senior Citizen</option>
                  </select>
                </div>
              </div>

              {/* Street Location */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Street / Landmark / Bus Stop Name</label>
                <input
                  type="text"
                  placeholder="e.g., Near ITO Crossing, Ring Road Bus Stop, Vikas Marg Footover"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {/* Heat & Shade Levels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Heat Stress Level
                  </label>
                  <select
                    value={formData.heatLevel}
                    onChange={(e) => setFormData({ ...formData, heatLevel: e.target.value })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Extreme">Extreme (Unbearable radiative heat)</option>
                    <option value="Severe">Severe (Very hot, uncomfortable)</option>
                    <option value="Warm">Warm (Tolerable)</option>
                    <option value="Moderate">Moderate</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Trees className="w-3.5 h-3.5 text-emerald-400" />
                    Tree Shade Coverage
                  </label>
                  <select
                    value={formData.shadeLevel}
                    onChange={(e) => setFormData({ ...formData, shadeLevel: e.target.value })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="No Shade">No Shade (Direct asphalt exposure)</option>
                    <option value="Minimal Shade">Minimal Shade (Scattered saplings)</option>
                    <option value="Partial Shade">Partial Shade (Some mature trees)</option>
                    <option value="Well Shaded">Well Shaded (Continuous canopy)</option>
                  </select>
                </div>
              </div>

              {/* Incident Notes */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">Incident / Health Observations (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Elderly commuters experiencing exhaustion waiting for bus; lack of drinking water or shade..."
                  value={formData.emergencyHeatIncidents}
                  onChange={(e) => setFormData({ ...formData, emergencyHeatIncidents: e.target.value })}
                  className="w-full bg-[#12392B] border border-white/10 rounded-xl p-3 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Observation...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Ground Observation</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Recent Observations Feed Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Recent Community Observations ({observations.length})
              </h3>
            </div>

            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {observations.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#0d2b21] border border-white/10 text-center text-xs text-[#9CB9A3]">
                  No recent ground observations submitted yet. Submit the first one using the form!
                </div>
              ) : (
                observations.map((obs) => (
                  <div
                    key={obs.id}
                    className="p-4 rounded-xl bg-[#0d2b21] border border-white/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400">{obs.ward || obs.city}</span>
                      <span className="text-slate-400 font-mono">
                        {obs.submitted_at ? new Date(obs.submitted_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <h4 className="font-semibold text-white">{obs.street || 'General Corridor Segment'}</h4>

                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                        Heat: {obs.heatLevel || 'Warm'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                        Shade: {obs.shadeLevel || 'Partial'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 font-medium capitalize">
                        {obs.userType || 'Resident'}
                      </span>
                    </div>

                    {obs.emergencyHeatIncidents && (
                      <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/5">
                        "{obs.emergencyHeatIncidents}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
