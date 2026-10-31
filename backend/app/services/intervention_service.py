"""
VanSetu GreenTech — Urban Green Infrastructure Intervention Planning Service.

Provides suitability evaluation, CPWD DSR 2023 capital/operational/lifecycle cost
estimation, site constraints, required pre-installation verification checklists,
and evidence confidence limitations across five GreenTech intervention categories:
1. Linear Street Trees (`linear_street_trees`)
2. Architectural Shade Structures (`architectural_shade_structures`)
3. Roadside Bioswales (`roadside_bioswales`)
4. Living Green Walls (`living_green_walls`)
5. Cool Pavements (`cool_pavements`)

Scientific Integrity Guarantee:
- Literature microclimate benchmarks are explicitly disclosed as empirical
  reference ranges (never fabricated or claimed as guaranteed site outcomes).
"""
from typing import Dict, Any, List, Optional


INTERVENTION_CATALOG: Dict[str, Dict[str, Any]] = {
    "linear_street_trees": {
        "id": "linear_street_trees",
        "legacy_id": "street_trees_canopy",
        "name": "Linear Street Trees",
        "category": "Arboreal Canopy Corridor",
        "summary": (
            "Double-row native drought-resilient avenue plantation (8m spacing, ~120 saplings/km) "
            "with root-barrier structural soil trenches and drip irrigation."
        ),
        "recommended_species_delhi": [
            "Azadirachta indica (Neem — evergreen, high PM2.5 capture)",
            "Alstonia scholaris (Saptaparni — dense shade canopy)",
            "Mimusops elengi (Maulsari — compact urban street crown)",
            "Ficus virens (Pilkhan — broad thermal shading)",
            "Bauhinia variegata (Kachnar — nitrogen-fixing medium avenue tree)",
        ],
        "cost_parameters": {
            "basis": "CPWD Delhi Schedule of Rates (DSR 2023) & Forest Dept NCT Delhi Plantation Norms",
            "unit_basis_per_km": "120 mature saplings (6-8 ft) per km + 1m×1m×1m pits + tree guards + drip line",
            "capex_inr_lakhs_per_km": 7.20,
            "capex_line_items_inr_lakhs_per_km": {
                "earthwork_and_structural_soil_pits": 2.10,
                "mature_native_saplings_120_nos": 1.80,
                "mild_steel_tree_guards_and_grates": 2.10,
                "drip_irrigation_lateral_network": 1.20,
            },
            "annual_opex_inr_lakhs_per_km": 2.40,
            "opex_line_items_inr_lakhs_per_km": {
                "recycled_water_irrigation_and_tanker": 1.15,
                "pruning_arborist_care_and_mulching": 0.75,
                "mortality_replacement_reserve_15pct": 0.50,
            },
            "mortality_replacement_rate_pct": 15.0,
            "five_year_lifecycle_inr_lakhs_per_km": 19.20,
            "expected_service_life_years": 30,
        },
        "site_constraints": [
            "Requires minimum 1.8m–2.4m unobstructed footpath/verge width for root-zone structural soil pits.",
            "Minimum 3.5m lateral clearance from underground high-voltage cables, trunk water mains, and IGL gas pipelines.",
            "Overhead 11kV/33kV power lines restrict maximum mature crown height on narrow residential lanes.",
        ],
        "pre_installation_verification": [
            "Ground Penetrating Radar (GPR) & utility trial-pit scan to confirm 1.2m depth clearance.",
            "Soil pH, electrical conductivity (EC), and bulk-density compaction test.",
            "Pedestrian clear-walkway audit ensuring >=1.8m clear footpath remains after tree-grate installation (IRC:103).",
            "Confirmation of treated effluent / STP non-potable water supply for 3-year establishment irrigation.",
        ],
        "evidence_and_confidence_limitations": [
            "Empirical literature benchmark (Bowler et al., 2010; Oke, 1989): mature continuous street canopy is associated with 1.5–3.5°C localized surface/air cooling and 10–18% roadside PM deposition in peer-reviewed studies; actual cooling is zero at planting and requires 5–8 years of canopy closure.",
            "MODIS 1,000m LST input cannot resolve existing single-row juvenile trees; on-site arboricultural inventory is mandatory before procurement.",
        ],
    },
    "architectural_shade_structures": {
        "id": "architectural_shade_structures",
        "legacy_id": "shade_structures_waiting",
        "name": "Architectural Shade Structures",
        "category": "Engineered Solar Radiation Shielding",
        "summary": (
            "Modular tensile/pergola shade canopies and high-albedo transit waiting shelters "
            "(6 structures/km, ~300 m² shaded pedestrian zone/km) for immediate radiant heat relief."
        ),
        "recommended_species_delhi": [
            "Optional climber integration: Bougainvillea spectabilis / Quisqualis indica on pergola frames",
        ],
        "cost_parameters": {
            "basis": "CPWD DSR 2023 Structural Steel & Tensile Membrane Rates",
            "unit_basis_per_km": "6 modular steel-frame tensile shade shelters (50 m² each = 300 m²/km)",
            "capex_inr_lakhs_per_km": 15.00,
            "capex_line_items_inr_lakhs_per_km": {
                "rcc_micro_pile_and_pedestal_foundations": 3.60,
                "galvanized_structural_steel_truss_frame": 6.20,
                "pvdf_uv_reflective_tensile_canopy_membrane": 3.90,
                "solar_led_wayfinding_and_seating": 1.30,
            },
            "annual_opex_inr_lakhs_per_km": 0.90,
            "opex_line_items_inr_lakhs_per_km": {
                "membrane_tensioning_and_high_pressure_wash": 0.45,
                "anti_corrosion_coating_and_fastener_audit": 0.30,
                "fixture_and_vandalism_repair_reserve": 0.15,
            },
            "mortality_replacement_rate_pct": 0.0,
            "five_year_lifecycle_inr_lakhs_per_km": 19.50,
            "expected_service_life_years": 12,
        },
        "site_constraints": [
            "Applicable where subterranean utilities or rocky/paved sub-base prevent deep tree-pit excavation.",
            "Requires foundation footing clearance outside active vehicular sightlines and fire-tender access lanes.",
            "Wind-load engineering must comply with IS 875 (Part 3) for Delhi squall/monsoon gusts (47 m/s basic wind speed).",
        ],
        "pre_installation_verification": [
            "Sub-surface utility detection at column footing locations (0.8m × 0.8m × 1.2m).",
            "Solar sun-path shadow casting analysis (April–June 11:00–16:00 IST) to orient canopy tilt over pedestrian queues.",
            "Structural wind-load and municipal street-furniture clearance approval from PWD/MCD.",
        ],
        "evidence_and_confidence_limitations": [
            "Empirical literature benchmark (Middel et al., 2016): engineered shade sails reduce Mean Radiant Temperature (MRT) and direct solar flux immediately upon installation, but do not provide evapotranspiration or gaseous pollutant uptake.",
            "Pedestrian queue locations (bus stops, metro feeders, school gates) must be verified via field footfall counts rather than road-class proxies.",
        ],
    },
    "roadside_bioswales": {
        "id": "roadside_bioswales",
        "legacy_id": "water_sensitive_infrastructure",
        "name": "Roadside Bioswales",
        "category": "Water-Sensitive Urban Design (WSUD)",
        "summary": (
            "Vegetated infiltration swales and permeable check-trenches (400 linear meters/km, 1.5m width) "
            "capturing stormwater runoff, recharging shallow aquifers, and supporting evaporative cooling."
        ),
        "recommended_species_delhi": [
            "Chrysopogon zizanioides (Vetiver grass — deep root filtration & bank stabilization)",
            "Canna indica (Canna lily — phytoremediation of heavy metals in road runoff)",
            "Cyperus alternifolius (Umbrella palm — periodic inundation tolerance)",
            "Pennisetum pedicellatum (Dinanath grass — drought & monsoon resilience)",
        ],
        "cost_parameters": {
            "basis": "CPWD DSR 2023 Earthwork/Drainage & MoHUA Urban Stormwater Guidelines",
            "unit_basis_per_km": "400 linear meters of 1.5m-wide engineered filter-media bioswale per km",
            "capex_inr_lakhs_per_km": 11.00,
            "capex_line_items_inr_lakhs_per_km": {
                "trench_excavation_and_geotextile_lining": 2.80,
                "graded_gravel_sand_engineered_filter_media": 4.10,
                "perforated_underdrain_and_overflow_weirs": 2.40,
                "phytoremediation_hydrophytic_planting": 1.70,
            },
            "annual_opex_inr_lakhs_per_km": 1.80,
            "opex_line_items_inr_lakhs_per_km": {
                "pre_monsoon_desilting_and_litter_trap_cleaning": 0.95,
                "filter_crust_scarification_and_mulch_topup": 0.50,
                "vegetation_trimming_and_10pct_replanting": 0.35,
            },
            "mortality_replacement_rate_pct": 10.0,
            "five_year_lifecycle_inr_lakhs_per_km": 20.00,
            "expected_service_life_years": 15,
        },
        "site_constraints": [
            "Requires a continuous roadside verge or median strip >=1.5m wide with longitudinal slope <=4%.",
            "Must maintain >=3.0m horizontal setback from un-waterproofed building basements and road sub-grade toes.",
            "High road-dust sedimentation in Delhi requires mandatory forebay silt traps to prevent media clogging.",
        ],
        "pre_installation_verification": [
            "In-situ double-ring infiltrometer soil percolation test (minimum infiltration rate >=12 mm/hr).",
            "Topographic longitudinal leveling survey to verify curb-cut inlet invert elevations relative to carriageway camber.",
            "Seasonally high water table (post-monsoon piezometer depth) check (>1.5m below swale invert).",
        ],
        "evidence_and_confidence_limitations": [
            "Empirical literature benchmark (EPA, 2016; Coutts et al., 2013): vegetated swales reduce peak street runoff volume by 40–65% for design storms and provide localized latent heat flux cooling when soil moisture is retained.",
            "Satellite NDVI/LST rasters do not capture local storm-drain invert levels or soil permeability; hydraulic engineering verification is mandatory.",
        ],
    },
    "living_green_walls": {
        "id": "living_green_walls",
        "legacy_id": "vertical_greenery_facades",
        "name": "Living Green Walls",
        "category": "Vertical Vegetated Infrastructure",
        "summary": (
            "Modular trellis and hydroponic/substrate vertical green facades along flyover piers, "
            "metro viaduct columns, and boundary walls (~300 m² vertical vegetated surface/km)."
        ),
        "recommended_species_delhi": [
            "Vernonia elaeagnifolia (Curtain creeper — cascading particulate trap for flyover piers)",
            "Ficus pumila (Creeping fig — self-clinging masonry thermal insulation)",
            "Pyrostegia venusta (Flame vine — vigorous sun-tolerant climber)",
            "Chlorophytum comosum & Nephrolepis exaltata (modular pocket panels in shaded piers)",
        ],
        "cost_parameters": {
            "basis": "CPWD / DMRC Vertical Garden Tender Benchmarks (NCT Delhi)",
            "unit_basis_per_km": "300 m² of vertical vegetated facade/pier cladding per km (₹4,500/m² CapEx)",
            "capex_inr_lakhs_per_km": 13.50,
            "capex_line_items_inr_lakhs_per_km": {
                "stainless_steel_subframe_and_hdpe_planter_modules": 6.30,
                "lightweight_coco_peat_perlite_substrate_and_plants": 3.40,
                "automated_fertigation_and_pressure_compensated_drip": 2.60,
                "drainage_gutter_and_pump_control_unit": 1.20,
            },
            "annual_opex_inr_lakhs_per_km": 2.80,
            "opex_line_items_inr_lakhs_per_km": {
                "automated_drip_nozzle_flushing_and_nutrients": 1.20,
                "elevated_access_pruning_and_pest_management": 0.90,
                "plant_module_replacement_reserve_20pct": 0.70,
            },
            "mortality_replacement_rate_pct": 20.0,
            "five_year_lifecycle_inr_lakhs_per_km": 27.50,
            "expected_service_life_years": 8,
        },
        "site_constraints": [
            "Requires existing vertical concrete structures (metro pillars, flyover abutments, acoustic barriers, institutional walls).",
            "Highest operational dependency: 48-hour irrigation pump failure during May–June (45°C+) causes rapid plant desiccation.",
            "Must not obstruct structural bridge inspection joints or statutory traffic signage.",
        ],
        "pre_installation_verification": [
            "Structural dead-load and wind-pullout audit of host pier/wall (~35–50 kg/m² saturated weight).",
            "Dedicated electrical power point and locked water storage tank availability within 100m.",
            "Agreement with structural asset owner (PWD / DMRC / NHAI) for routine pier inspection access.",
        ],
        "evidence_and_confidence_limitations": [
            "Empirical literature benchmark (Pugh et al., 2012; Alexandri & Jones, 2008): street-canyon green walls trap near-source PM10/PM2.5 and lower wall surface temperatures by 4–8°C, but have a smaller footprint on ambient air temperature than tree canopy.",
            "High lifecycle maintenance cost (₹27.50L/km over 5 years); recommended primarily where horizontal ROW is unavailable for street trees.",
        ],
    },
    "cool_pavements": {
        "id": "cool_pavements",
        "legacy_id": "cool_pavements_surfaces",
        "name": "Cool Pavements",
        "category": "High-Albedo & Permeable Surface Retrofit",
        "summary": (
            "Solar-reflective elastomeric coating (Solar Reflectance Index SRI >= 78) and permeable "
            "interlocking concrete pavers across pedestrian footpaths and cycle tracks (~1,800 m²/km)."
        ),
        "recommended_species_delhi": [
            "Non-vegetative surface albedo intervention (pair with Linear Street Trees or Shade Structures to avoid upward shortwave glare).",
        ],
        "cost_parameters": {
            "basis": "CPWD DSR 2023 Reflective Coating & M-35 Permeable Paver Block Schedule",
            "unit_basis_per_km": "1,800 m² of footpath/plaza surface treatment per km (1.8m width × 1,000m)",
            "capex_inr_lakhs_per_km": 7.20,
            "capex_line_items_inr_lakhs_per_km": {
                "surface_scarification_and_crack_sealing": 1.40,
                "high_sri_solar_reflective_mineral_topcoat": 3.80,
                "anti_skid_quartz_aggregate_broadcast": 1.20,
                "edge_restraint_and_tactile_paving_integration": 0.80,
            },
            "annual_opex_inr_lakhs_per_km": 1.60,
            "opex_line_items_inr_lakhs_per_km": {
                "quarterly_power_washing_to_restore_albedo_from_soiling": 0.90,
                "spot_recoating_of_high_wear_zones": 0.70,
            },
            "mortality_replacement_rate_pct": 0.0,
            "five_year_lifecycle_inr_lakhs_per_km": 15.20,
            "expected_service_life_years": 5,
        },
        "site_constraints": [
            "Atmospheric dust and vehicular soot deposition in Delhi degrades surface albedo by 15–25% within 6 months without periodic washing.",
            "Unshaded high-albedo coatings can increase upward reflected shortwave radiation onto pedestrians during midday unless paired with overhead shade.",
            "Wet skid-resistance must meet British Pendulum Number (BPN) >= 55 for pedestrian safety during monsoon.",
        ],
        "pre_installation_verification": [
            "Existing pavement structural integrity and drainage cross-fall inspection.",
            "Baseline portable albedometer / infrared thermography measurement of existing asphalt/concrete.",
            "Slip-resistance laboratory certification (ASTM E303 / IRC guidelines) prior to application on public footways.",
        ],
        "evidence_and_confidence_limitations": [
            "Empirical literature benchmark (Santamouris, 2014): increasing surface albedo by 0.25–0.35 reduces peak pavement surface temperature by 5–10°C and lowers evening sensible heat release.",
            "Service life of reflective topcoats under heavy pedestrian/vendor friction is ~5 years before full re-application is required.",
        ],
    },
}


INTERVENTION_ALIASES: Dict[str, str] = {
    "linear_street_trees": "linear_street_trees",
    "street_trees_canopy": "linear_street_trees",
    " architectural_shade_structures": "architectural_shade_structures",
    "architectural_shade_structures": "architectural_shade_structures",
    "shade_structures_waiting": "architectural_shade_structures",
    "roadside_bioswales": "roadside_bioswales",
    "water_sensitive_infrastructure": "roadside_bioswales",
    "living_green_walls": "living_green_walls",
    "vertical_greenery_facades": "living_green_walls",
    "cool_pavements": "cool_pavements",
    "cool_pavements_surfaces": "cool_pavements",
}


class InterventionService:
    """
    Service for evaluating intervention suitability and generating transparent
    CapEx, OpEx, and 5-year lifecycle cost breakdowns per urban corridor.
    """

    def get_catalog(self) -> Dict[str, Any]:
        """Return full intervention catalog with CPWD DSR 2023 cost methodology."""
        return {
            "methodology": {
                "cost_standard": "CPWD Delhi Schedule of Rates (DSR 2023) & MoHUA Urban Greening Guidelines",
                "currency": "INR Lakhs (1 Lakh = ₹100,000)",
                "horizon_years": 5,
                "lifecycle_formula": "Five_Year_Lifecycle = CapEx + (5 × Annual_OpEx)",
                "length_scaling_formula": "Corridor_Cost = Unit_Cost_per_km × (corridor_length_m / 1000.0)",
                "scientific_disclaimer": (
                    "All microclimate performance ranges represent peer-reviewed empirical literature benchmarks "
                    "(Oke 1989; Bowler et al. 2010; Pugh et al. 2012; Santamouris 2014; EPA 2016) and are "
                    "not presented as deterministic site-level climate predictions."
                ),
            },
            "interventions": list(INTERVENTION_CATALOG.values()),
        }

    def evaluate_corridor_interventions(
        self,
        *,
        heat_norm: Optional[float],
        green_deficit_norm: Optional[float],
        aqi_norm: Optional[float],
        pedestrian_norm: Optional[float],
        feasibility_score: float = 0.78,
        confidence_score: float = 0.75,
        highway_type: str = "secondary",
        length_m: float = 1000.0,
        district: str = "Central Delhi",
    ) -> Dict[str, Any]:
        """
        Evaluate all 5 GreenTech intervention categories for a specific corridor,
        computing deterministic suitability scores, scaled CapEx/OpEx/Lifecycle costs,
        constraints, pre-installation checks, and confidence limitations.
        """
        length_km = max(float(length_m) / 1000.0, 0.05)
        h = float(heat_norm) if heat_norm is not None else 0.55
        g = float(green_deficit_norm) if green_deficit_norm is not None else 0.55
        p = float(aqi_norm) if aqi_norm is not None else 0.55
        ped = float(pedestrian_norm) if pedestrian_norm is not None else 0.70
        hw = (highway_type or "secondary").strip().lower()

        wide_row = hw in ("primary", "secondary", "trunk", "tertiary")
        narrow_row = hw in ("footway", "living_street", "pedestrian", "residential")

        # Compute deterministic suitability [0, 1] for each of the 5 categories
        suitability_map: Dict[str, Dict[str, Any]] = {
            "linear_street_trees": {
                "score": round(
                    min(1.0, max(0.15, 0.35 * g + 0.30 * h + 0.20 * p + 0.15 * feasibility_score + (0.05 if wide_row else -0.04))),
                    4,
                ),
                "rationale": (
                    f"Addresses vegetation deficit ({g:.2f}) and thermal stress ({h:.2f}) along {hw} corridor "
                    f"while capturing particulate matter (AQI factor {p:.2f})."
                ),
            },
            "architectural_shade_structures": {
                "score": round(
                    min(1.0, max(0.15, 0.40 * h + 0.35 * ped + 0.15 * g + 0.10 * (1.0 - feasibility_score * 0.3))),
                    4,
                ),
                "rationale": (
                    f"Provides immediate solar radiation shielding for pedestrian demand ({ped:.2f}) "
                    f"under thermal exposure ({h:.2f}) without waiting for biological canopy maturity."
                ),
            },
            "roadside_bioswales": {
                "score": round(
                    min(1.0, max(0.15, 0.35 * g + 0.25 * p + 0.20 * h + 0.20 * (0.85 if wide_row else 0.45))),
                    4,
                ),
                "rationale": (
                    f"Integrates stormwater infiltration and evaporative cooling along {'wide arterial' if wide_row else 'constrained'} "
                    f"ROW ({hw}), mitigating road dust resuspension and runoff."
                ),
            },
            "living_green_walls": {
                "score": round(
                    min(1.0, max(0.15, 0.45 * p + 0.25 * g + 0.20 * h + (0.10 if narrow_row or hw in ('primary', 'trunk') else 0.0))),
                    4,
                ),
                "rationale": (
                    f"Targets near-road particulate matter deposition (pollution factor {p:.2f}) on vertical surfaces "
                    f"where horizontal planting width is constrained or flyover/metro piers exist."
                ),
            },
            "cool_pavements": {
                "score": round(
                    min(1.0, max(0.15, 0.45 * h + 0.30 * ped + 0.25 * feasibility_score)),
                    4,
                ),
                "rationale": (
                    f"Increases surface solar reflectance along high-exposure pavement ({h:.2f} heat factor, "
                    f"{ped:.2f} pedestrian factor) with rapid civil deployment."
                ),
            },
        }

        recommendations: List[Dict[str, Any]] = []
        for int_id, spec in INTERVENTION_CATALOG.items():
            suit = suitability_map[int_id]
            s_score = suit["score"]
            if s_score >= 0.70:
                s_level = "High Suitability"
            elif s_score >= 0.52:
                s_level = "Moderate Suitability"
            else:
                s_level = "Conditional / Site-Restricted"

            cp = spec["cost_parameters"]
            unit_capex = float(cp["capex_inr_lakhs_per_km"])
            unit_opex = float(cp["annual_opex_inr_lakhs_per_km"])
            unit_lifecycle_5yr = float(cp["five_year_lifecycle_inr_lakhs_per_km"])

            total_capex = round(unit_capex * length_km, 2)
            total_annual_opex = round(unit_opex * length_km, 2)
            total_five_year_opex = round(unit_opex * 5.0 * length_km, 2)
            total_lifecycle_5yr = round(unit_lifecycle_5yr * length_km, 2)

            recommendations.append(
                {
                    "id": spec["id"],
                    "legacy_id": spec["legacy_id"],
                    "name": spec["name"],
                    "category": spec["category"],
                    "summary": spec["summary"],
                    "suitability_score": s_score,
                    "suitability_level": s_level,
                    "selection_rationale": suit["rationale"],
                    "recommended_species_delhi": spec["recommended_species_delhi"],
                    "cost_breakdown": {
                        "currency": "INR Lakhs",
                        "corridor_length_km": round(length_km, 3),
                        "capex_inr_lakhs_per_km": unit_capex,
                        "annual_opex_inr_lakhs_per_km": unit_opex,
                        "five_year_lifecycle_inr_lakhs_per_km": unit_lifecycle_5yr,
                        "total_capex_inr_lakhs": total_capex,
                        "total_annual_opex_inr_lakhs": total_annual_opex,
                        "total_five_year_opex_inr_lakhs": total_five_year_opex,
                        "total_five_year_lifecycle_inr_lakhs": total_lifecycle_5yr,
                        "mortality_replacement_rate_pct": cp["mortality_replacement_rate_pct"],
                        "expected_service_life_years": cp["expected_service_life_years"],
                        "unit_basis_per_km": cp["unit_basis_per_km"],
                        "rate_schedule_basis": cp["basis"],
                        "capex_line_items_per_km": cp["capex_line_items_inr_lakhs_per_km"],
                        "opex_line_items_per_km": cp["opex_line_items_inr_lakhs_per_km"],
                    },
                    "site_constraints": spec["site_constraints"],
                    "pre_installation_verification": spec["pre_installation_verification"],
                    "evidence_and_confidence_limitations": spec["evidence_and_confidence_limitations"]
                    + [
                        f"Corridor evidence confidence is {confidence_score:.2f} (includes -0.12 deduction for 1,000m native MODIS LST resolution)."
                    ],
                }
            )

        # Sort by suitability_score descending
        recommendations.sort(key=lambda item: -item["suitability_score"])
        for rank_idx, rec in enumerate(recommendations, start=1):
            rec["rank"] = rank_idx

        primary = recommendations[0]
        complementary = recommendations[1] if len(recommendations) > 1 else None

        return {
            "district": district,
            "highway_type": hw,
            "corridor_length_m": round(float(length_m), 1),
            "corridor_length_km": round(length_km, 3),
            "primary_recommendation": primary,
            "complementary_recommendation": complementary,
            "all_interventions": recommendations,
            "cost_methodology_note": (
                "CapEx and OpEx derived from CPWD DSR 2023 and MoHUA Urban Greening Guidelines. "
                "5-Year Lifecycle Cost = CapEx + (5 × Annual OpEx), scaled linearly by corridor length."
            ),
        }


intervention_service = InterventionService()
