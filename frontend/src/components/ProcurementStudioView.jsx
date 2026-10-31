import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  FileText,
  CheckCircle2,
  HelpCircle,
  Layers,
  IndianRupee,
} from 'lucide-react';
import { api } from '../api/client';

export default function ProcurementStudioView({
  selectedCorridor,
  mekoEnabled,
  onToggleMeko,
}) {
  const [catalog, setCatalog] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [corridorCode, setCorridorCode] = useState(selectedCorridor?.code || 'C-14');
  const [budgetLakh, setBudgetLakh] = useState(8.0);
  const [rfpDoc, setRfpDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadProcurement = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, rfpRes] = await Promise.all([
        api.getProcurementCatalog(selectedCategory),
        api.generateProcurementRfp({
          corridor_id: corridorCode,
          budget_lakh: Number(budgetLakh),
          meko_enabled: mekoEnabled,
          include_monitoring_kit: true,
        }),
      ]);
      setCatalog(catRes);
      setRfpDoc(rfpRes);
    } catch (err) {
      console.error('Procurement error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, corridorCode, budgetLakh, mekoEnabled]);

  useEffect(() => {
    loadProcurement();
  }, [loadProcurement]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              VanSetu Climate Technology Procurement Studio
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              IOMETE Challenge: Make Complex Tech Easy to Buy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Translates complex IoT sensing, microclimate telemetry, and heat-mitigation hardware into plain-language buyer comparisons and procurement-ready municipal RFPs.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => onToggleMeko(!mekoEnabled)}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              mekoEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {mekoEnabled ? 'MEKO ON (Survey-014 Enforced)' : 'MEKO OFF'}
          </button>
        </div>
      </div>

      {/* Category Filter Strip */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-lg font-medium border transition ${
            selectedCategory === ''
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          All 6 Categories
        </button>
        {(catalog?.categories || []).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg font-medium border transition ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Pricing Integrity Notice */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg px-3.5 py-2 text-[11px] text-slate-300 flex items-center justify-between">
        <span>
          <strong className="text-emerald-400">Pricing Classification: </strong>
          {catalog?.pricing_disclaimer}
        </span>
      </div>

      {/* Equipment Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(catalog?.items || []).map((item) => (
          <div
            key={item.sku_id}
            className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 text-xs"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {item.category_label}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {item.sku_id}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{item.product_tier}</h3>
              <p className="text-slate-300 text-[11px] bg-slate-950 p-2.5 rounded border border-slate-800">
                <strong className="text-emerald-400">Plain-Language Fit: </strong>
                {item.plain_english_summary}
              </p>

              {/* Cost Strip */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block">CapEx (Ref)</span>
                  <span className="text-emerald-400 font-bold">
                    ₹{(item.capex_inr / 100000).toFixed(2)}L
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Annual OpEx</span>
                  <span className="text-amber-300 font-bold">
                    ₹{(item.annual_opex_inr / 100000).toFixed(2)}L/yr
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">5-Yr Lifecycle</span>
                  <span className="text-cyan-300 font-bold">
                    ₹{(item.lifecycle_5yr_inr / 100000).toFixed(2)}L
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-300">
                <div>
                  <strong className="text-slate-400">Compatibility: </strong>
                  {item.compatibility}
                </div>
                <div>
                  <strong className="text-slate-400">Installation: </strong>
                  {item.installation_requirements}
                </div>
                <div>
                  <strong className="text-slate-400">Maintenance &amp; SLA: </strong>
                  {item.maintenance_requirements} ({item.warranty_support})
                </div>
                <div>
                  <strong className="text-slate-400">Interoperability: </strong>
                  {item.interoperability}
                </div>
              </div>
            </div>

            {/* Vendor Questions */}
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                Questions to Ask Vendors Before Buying:
              </div>
              <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                {(item.vendor_questions || []).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Draft Municipal RFP Specification Generator */}
      {rfpDoc && (
        <div className="bg-slate-900/95 border border-emerald-500/40 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Generated Draft Municipal RFP Specification — {rfpDoc.rfp_reference_number}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {rfpDoc.project_title} • {rfpDoc.pricing_classification}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={corridorCode}
                onChange={(e) => setCorridorCode(e.target.value)}
                className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white"
              />
              <button
                onClick={loadProcurement}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                Regenerate RFP
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div>
              <div className="font-bold text-emerald-400 mb-1">
                Section 1 &amp; 2: Baseline &amp; Meko Constraints
              </div>
              <p className="text-[11px] text-slate-300">
                Corridor: {rfpDoc.section_1_environmental_baseline?.corridor_name} ({rfpDoc.section_1_environmental_baseline?.corridor_code}) • LST: {rfpDoc.section_1_environmental_baseline?.observed_lst_celsius}°C • NDVI: {rfpDoc.section_1_environmental_baseline?.observed_ndvi}
              </p>
              <p className="text-[11px] text-amber-300 mt-1">
                {(rfpDoc.section_2_institutional_memory_constraints?.mandatory_engineering_exclusions || [])[0]}
              </p>
            </div>

            <div>
              <div className="font-bold text-emerald-400 mb-1">
                Section 3: Selected Bill of Quantities (MILP)
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {(rfpDoc.section_3_selected_intervention_bill_of_quantities?.selected_interventions || []).map((s, idx) => (
                  <div key={idx} className="text-slate-200">
                    • {s.intervention_name}: ₹{s.capex_lakh_inr}L CapEx
                  </div>
                ))}
                <div className="text-emerald-300 font-bold pt-1">
                  Total CapEx: ₹{rfpDoc.section_3_selected_intervention_bill_of_quantities?.total_capex_lakh_inr}L / ₹{budgetLakh}L Budget
                </div>
              </div>
            </div>

            <div>
              <div className="font-bold text-emerald-400 mb-1">
                Section 5: Mandatory Vendor Compliance Checks
              </div>
              <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                {(rfpDoc.section_5_mandatory_vendor_compliance_questions || []).slice(0, 3).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
