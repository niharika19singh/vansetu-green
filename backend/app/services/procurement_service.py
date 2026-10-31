"""
IOMETE Sponsored Challenge — "Make Complex Tech Easy to Buy" (Phase 7).
VanSetu Climate Technology Procurement Studio.

Responsibilities:
1. Translates complex urban climate hardware, IoT sensing, and cooling infrastructure
   into clear, plain-language buyer comparisons and municipal tender documents.
2. Covers all 6 required technology categories:
   - Air-quality monitoring devices
   - Weather stations
   - Soil-moisture sensors
   - Smart irrigation systems
   - Environmental monitoring equipment
   - Shade and cooling infrastructure technologies
3. Provides side-by-side comparison matrices (technical specs, use-case fit, compatibility,
   CapEx, annual OpEx, 5-year lifecycle cost, installation, maintenance, warranty/SLA,
   interoperability, and vendor evaluation questions).
4. Generates a structured Procurement-Ready Comparison and Draft Municipal RFP Specification
   linked directly to corridor site constraints (such as Meko recalled utility conflicts)
   and deterministic budget optimizer portfolios.
5. Explicitly labels all equipment costs as Illustrative Reference Pricing (CPWD/GeM municipal
   reference bands) for data integrity.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.corridor_service import get_corridor_by_id
from app.services.optimizer_service import optimize_corridor_portfolio

PROCUREMENT_CATEGORIES: List[Dict[str, str]] = [
    {
        "id": "aqi_monitors",
        "name": "Air-Quality Monitoring Devices",
        "summary": "CAAQMS-grade and Low-Cost Sensor (LCS) ambient PM2.5/PM10/NO2 nodes for corridor pollution tracking.",
    },
    {
        "id": "weather_stations",
        "name": "Automatic Urban Weather Stations",
        "summary": "Street-canyon microclimate stations measuring ambient temperature, black-globe radiant heat, RH, and wind.",
    },
    {
        "id": "soil_moisture_sensors",
        "name": "Soil-Moisture & Root-Zone Sensors",
        "summary": "FDR/TDR dielectric soil-moisture and salinity probes for street trees and roadside bioswales.",
    },
    {
        "id": "smart_irrigation_systems",
        "name": "Smart Automated Irrigation Systems",
        "summary": "LoRaWAN/NB-IoT solenoid drip controllers triggered by soil moisture and IMD weather forecasts.",
    },
    {
        "id": "environmental_monitoring_equipment",
        "name": "Thermal & Subsurface Environmental Equipment",
        "summary": "Handheld thermal radiometers and Ground-Penetrating Radar (GPR) utility scanners for pre-excavation safety.",
    },
    {
        "id": "shade_and_cooling_technologies",
        "name": "Shade & Cooling Infrastructure Technologies",
        "summary": "Modular tensile shade pergolas, SRI >= 78 cool pavement coatings, and modular vertical bio-facades.",
    },
]

CLIMATE_TECH_CATALOG: List[Dict[str, Any]] = [
    {
        "sku_id": "tech-aqi-lcs-pro",
        "category": "aqi_monitors",
        "category_label": "Air-Quality Monitoring Devices",
        "product_tier": "Tier-1 Municipal Solar LoRaWAN/4G AQI Node (PM2.5, PM10, NO2, CO)",
        "plain_english_summary": "Pole-mounted solar air quality sensor box with automatic humidity correction—ideal for tracking traffic pollution reductions along green corridors without trenching power cables.",
        "technical_specifications": {
            "particulate_sensing": "Laser nephelometer PM2.5 & PM10 (0-1000 ug/m3, +/-10% co-located accuracy)",
            "gas_electrochemical": "NO2 (0-20 ppm) + CO (0-500 ppm) with temperature compensation",
            "enclosure_rating": "IP66 weatherproof polycarbonate with solar radiation shield",
            "power_supply": "15W monocrystalline solar panel + 12.8V LiFePO4 battery (7-day autonomy)",
        },
        "use_case_fit": "Corridor-level before/after air filtration validation along high-traffic bus & school routes.",
        "compatibility": "Mounts on existing 4m-6m municipal lighting poles; compatible with non-invasive corridor plans.",
        "capex_inr": 145000,
        "annual_opex_inr": 18000,
        "lifecycle_5yr_inr": 235000,
        "pricing_basis": "Illustrative Reference Pricing (GeM / CPCB LCS Reference Band)",
        "installation_requirements": "Pole clamp mounting at 3.5m breathing/canopy height; zero road excavation required.",
        "maintenance_requirements": "Bi-annual optical chamber air-purge and 12-month co-location calibration against DPCC reference station.",
        "warranty_support": "3-year comprehensive hardware warranty + replacement sensor cartridge SLA within 72 hours.",
        "interoperability": "Open MQTT / REST JSON API, OGC SensorThings API, direct ingestion into VanSetu Tiger Data (`environmental_observations`).",
        "vendor_questions": [
            "Does the device apply real-time relative humidity (RH > 75%) hygroscopic growth correction for Delhi winter fog?",
            "Can you provide a 30-day co-location certificate R^2 >= 0.85 against a CPCB CAAQMS reference station?",
            "Are raw uncalibrated voltages and calibration equations accessible via API without recurring SaaS lock-in?",
        ],
    },
    {
        "sku_id": "tech-wx-microclimate",
        "category": "weather_stations",
        "category_label": "Automatic Urban Weather Stations",
        "product_tier": "Street-Canyon WBGT & Black-Globe Microclimate Station",
        "plain_english_summary": "All-in-one ultrasonic weather and radiant heat station that measures what pedestrians actually feel in the sun vs. under shade structures.",
        "technical_specifications": {
            "parameters": "Air Temp (-20 to +60°C), 150mm Black Globe Radiant Temp, RH, Ultrasonic 2D Wind, Solar Irradiance (W/m2)",
            "derived_indices": "Wet-Bulb Globe Temperature (WBGT) & Universal Thermal Climate Index (UTCI)",
            "sampling_interval": "1-minute raw sampling, 15-minute telemetry aggregation",
            "ingress_protection": "IP67 solid-state (no moving anemometer cups)",
        },
        "use_case_fit": "Measuring true pedestrian thermal comfort and shade-structure cooling efficacy where 1,000m MODIS satellite pixels are too coarse.",
        "compatibility": "Compatible with all 5 VanSetu intervention classes; essential for validating shade pergola and cool pavement pilots.",
        "capex_inr": 185000,
        "annual_opex_inr": 14000,
        "lifecycle_5yr_inr": 255000,
        "pricing_basis": "Illustrative Reference Pricing (Municipal Smart City Reference Band)",
        "installation_requirements": "Cantilever arm on streetlight pole or pergola frame at 2.5m pedestrian head-height.",
        "maintenance_requirements": "Annual pyranometer dome wipe and NIST-traceable thermistor drift check.",
        "warranty_support": "3-year OEM warranty with local Delhi NCR field service engineer support.",
        "interoperability": "Modbus RTU / RS-485 + 4G LTE JSON webhook to Tiger Data hypertable.",
        "vendor_questions": [
            "Is the black-globe thermometer standard 150mm copper or a 40mm miniature globe, and how is mean radiant temperature (Tmrt) normalized?",
            "Does the ultrasonic anemometer maintain accuracy at low street-canyon wind speeds (< 0.5 m/s)?",
        ],
    },
    {
        "sku_id": "tech-soil-fdr-probe",
        "category": "soil_moisture_sensors",
        "category_label": "Soil-Moisture & Root-Zone Sensors",
        "product_tier": "Multi-DepthFDR Root-Zone Moisture, Temperature & EC Probe",
        "plain_english_summary": "Buried root-zone sensor that prevents sapling die-off during May-June heatwaves and checks whether roadside bioswales are draining properly.",
        "technical_specifications": {
            "measurement_principle": "100 MHz Frequency Domain Reflectometry (FDR)",
            "depths_monitored": "15 cm (surface mulch) and 45 cm (active sapling root ball)",
            "parameters": "Volumetric Water Content (0-100% VWC, +/-2%), Soil Temp, Bulk Electrical Conductivity (EC)",
            "battery_life": "5-year potted IP68 LoRaWAN node",
        },
        "use_case_fit": "Survival monitoring for newly planted linear street trees and infiltration tracking in roadside bioswales.",
        "compatibility": "Requires tree pits or bioswale soil media; NOT required if corridor uses only non-vegetative shade structures.",
        "capex_inr": 38000,
        "annual_opex_inr": 4500,
        "lifecycle_5yr_inr": 60500,
        "pricing_basis": "Illustrative Reference Pricing (Horticulture IoT Reference Band)",
        "installation_requirements": "Auger insertion into root zone during sapling planting or bioswale media backfilling.",
        "maintenance_requirements": "Zero moving parts; annual gateway battery health check.",
        "warranty_support": "5-year potted probe replacement guarantee.",
        "interoperability": "LoRaWAN 865-867 MHz (India IN865 band) -> ChirpStack / TheThingsNetwork -> VanSetu API.",
        "vendor_questions": [
            "Is the probe calibrated for sandy-loam alluvial soils typical of Delhi NCR and engineered bioswale media?",
            "How does road de-icing or monsoon runoff salinity (high EC) affect VWC reading stability?",
        ],
    },
    {
        "sku_id": "tech-irrig-smart-drip",
        "category": "smart_irrigation_systems",
        "category_label": "Smart Automated Irrigation Systems",
        "product_tier": "Solar Latching Solenoid Drip Controller with Treated-Effluent Filter",
        "plain_english_summary": "Automated water-saving drip irrigation valve that waters street trees and green walls at night using non-potable DJB treated water only when the soil is dry.",
        "technical_specifications": {
            "valves": "2-inch DC latching solenoid valves with vandals-proof cast-iron valve box",
            "filtration": "120-mesh disc filter rated for tertiary treated STP recycled water",
            "flow_metering": "Integrated ultrasonic pulse flow meter with pipe-burst auto-shutoff",
            "water_savings": "35-50% reduction vs. manual municipal tanker flooding",
        },
        "use_case_fit": "Automated night-time irrigation for Linear Street Trees and Living Green Walls.",
        "compatibility": "Requires connection to municipal non-potable water line or overhead corridor storage tank.",
        "capex_inr": 115000,
        "annual_opex_inr": 16000,
        "lifecycle_5yr_inr": 195000,
        "pricing_basis": "Illustrative Reference Pricing (CPWD Horticulture Automation Reference Band)",
        "installation_requirements": "Inline connection to 50mm HDPE sub-surface drip line along corridor median/verge.",
        "maintenance_requirements": "Monthly disc-filter flushing to prevent biofilm clogging from treated STP water.",
        "warranty_support": "2-year valve and controller warranty; 5-year pressure-compensated dripper line warranty.",
        "interoperability": "Closed-loop trigger integration with Soil-Moisture Probes and IMD rainfall forecast API.",
        "vendor_questions": [
            "Are the pressure-compensated drippers anti-siphon and root-intrusion resistant for subsurface installation?",
            "Does the controller automatically lock out irrigation when local soil moisture exceeds 32% VWC?",
        ],
    },
    {
        "sku_id": "tech-env-gpr-thermal",
        "category": "environmental_monitoring_equipment",
        "category_label": "Thermal & Subsurface Environmental Equipment",
        "product_tier": "Dual-Frequency Utility GPR Scanner & Radiometric Thermal Camera Kit",
        "plain_english_summary": "Pre-construction safety and audit kit: scans underground pipes/cables before digging tree pits (preventing utility strikes like Corridor C-14) and captures high-res thermal street images.",
        "technical_specifications": {
            "gpr_frequencies": "300 MHz / 800 MHz dual-frequency antenna detecting utilities up to 4.0m depth",
            "thermal_imager": "640x512 radiometric uncooled microbolometer (+/-2°C accuracy, <30 mK NETD)",
            "gnss_tagging": "RTK-GNSS centimeter-level geotagging of subsurface utility anomalies",
        },
        "use_case_fit": "Mandatory pre-installation verification for corridors with suspected shallow water/gas/telecom lines, plus street-level thermal auditing.",
        "compatibility": "Universal ward-level engineering asset; feeds directly into Meko `vansetu-project-memory` (`evidence_reference`).",
        "capex_inr": 420000,
        "annual_opex_inr": 28000,
        "lifecycle_5yr_inr": 560000,
        "pricing_basis": "Illustrative Reference Pricing (Municipal Engineering Survey Kit Reference Band)",
        "installation_requirements": "Wheeled cart / handheld field kit operated by 2-person municipal engineering survey crew.",
        "maintenance_requirements": "Annual radiometric blackbody calibration and wheel-encoder check.",
        "warranty_support": "3-year ruggedized field warranty + 2-day operator certification for PWD/MCD engineers.",
        "interoperability": "Exports GeoJSON utility conflict footprints and radiometric GeoTIFF strips into VanSetu.",
        "vendor_questions": [
            "Can the GPR distinguish non-metallic PVC/HDPE water mains from fiber-optic ducts in moist clay soils?",
            "Does the thermal camera export full per-pixel temperature matrices (radiometric JPEG/TIFF) rather than false-color RGB?",
        ],
    },
    {
        "sku_id": "tech-shade-tensile-cool",
        "category_label": "Shade & Cooling Infrastructure Technologies",
        "category": "shade_and_cooling_technologies",
        "product_tier": "Modular Galvanized Tensile Shade Pergola + High-Albedo (SRI >= 82) Cool Pavement System",
        "plain_english_summary": "Surface-bolted shade canopy and solar-reflective footpath coating—delivers immediate 2.5-3.2°C pedestrian cooling in utility-congested corridors where deep tree excavation is prohibited.",
        "technical_specifications": {
            "structural_frame": "Hot-dip galvanized IS:2062 steel portals with shallow anchor-bolt pedestal footings (< 0.35m depth)",
            "canopy_fabric": "PVDF-coated architectural PTFE/HDPE mesh (UV block >= 92%, wind load rated to 160 km/h)",
            "cool_pavement_coating": "Elastomeric acrylic-quartz traffic coating with Solar Reflectance Index (SRI) >= 82 and wet Pendulum Test Value (PTV) >= 55",
        },
        "use_case_fit": "Primary heat-mitigation solution for corridors like Ward 12 / Corridor C-14 where underground utilities block deep tree pits or bioswale trenching.",
        "compatibility": "100% compatible with shallow underground utilities (< 1.2m depth) and narrow pedestrian footpaths.",
        "capex_inr": 777000,
        "annual_opex_inr": 58500,
        "lifecycle_5yr_inr": 1069500,
        "pricing_basis": "Illustrative Reference Pricing (150m Modular Pergola + 1,400 sqm Cool Pavement Reference Package)",
        "installation_requirements": "Surface anchor-bolting on kerb pedestals + weekend night-shift high-pressure pavement wash and 2-coat squeegee application.",
        "maintenance_requirements": "Quarterly high-pressure water wash of cool pavement to preserve albedo; annual tension bolt inspection.",
        "warranty_support": "10-year structural frame & fabric UV warranty; 5-year anti-delamination coating warranty.",
        "interoperability": "Pre-provisioned mounting brackets for VanSetu Solar AQI Nodes and Microclimate Weather Stations.",
        "vendor_questions": [
            "Can you provide third-party ASTM E1980 Solar Reflectance Index (SRI) aged 3-year test reports?",
            "What is the wet slip-resistance Pendulum Test Value (PTV) during monsoon rainfall?",
            "Do the pergola baseplates require any excavation deeper than 350mm below finished footpath level?",
        ],
    },
]


class ProcurementService:
    """IOMETE Climate Technology Procurement Studio service."""

    def get_catalog(self, category: Optional[str] = None) -> Dict[str, Any]:
        items = CLIMATE_TECH_CATALOG
        if category:
            items = [item for item in CLIMATE_TECH_CATALOG if item["category"] == category]
        return {
            "studio_name": "VanSetu Climate Technology Procurement Studio",
            "challenge_alignment": "IOMETE — Make Complex Tech Easy to Buy",
            "pricing_disclaimer": (
                "All hardware and infrastructure costs are marked as Illustrative Reference Pricing "
                "derived from Indian municipal GeM/CPWD schedule reference bands for transparent comparison."
            ),
            "categories": PROCUREMENT_CATEGORIES,
            "item_count": len(items),
            "items": items,
        }

    def compare_equipment(
        self,
        sku_ids: Optional[List[str]] = None,
        corridor_id: str = "C-14",
        budget_lakh: float = 8.0,
    ) -> Dict[str, Any]:
        """Generate a side-by-side Procurement-Ready Comparison tailored to a corridor."""
        corr = get_corridor_by_id(corridor_id) or get_corridor_by_id("C-14")
        selected_items = (
            [item for item in CLIMATE_TECH_CATALOG if item["sku_id"] in sku_ids]
            if sku_ids
            else CLIMATE_TECH_CATALOG
        )
        if not selected_items:
            selected_items = CLIMATE_TECH_CATALOG

        total_capex = sum(item["capex_inr"] for item in selected_items)
        total_annual_opex = sum(item["annual_opex_inr"] for item in selected_items)
        total_lifecycle_5yr = sum(item["lifecycle_5yr_inr"] for item in selected_items)

        return {
            "comparison_title": f"Procurement-Ready Climate Technology Comparison — {corr.get('code', 'C-14')} ({corr.get('name', 'Corridor')})",
            "corridor_context": {
                "corridor_id": corr["id"],
                "corridor_code": corr.get("code"),
                "corridor_name": corr.get("name"),
                "ward_id": corr.get("ward_id"),
                "lst_celsius": corr.get("lst"),
                "ndvi": corr.get("ndvi"),
                "aqi": corr.get("aqi"),
            },
            "budget_ceiling_inr": int(budget_lakh * 100000),
            "compared_count": len(selected_items),
            "aggregate_summary": {
                "combined_capex_inr": total_capex,
                "combined_annual_opex_inr": total_annual_opex,
                "combined_5yr_lifecycle_inr": total_lifecycle_5yr,
                "pricing_classification": "Illustrative Reference Pricing",
            },
            "comparison_matrix": selected_items,
            "buyer_decision_guide": [
                {
                    "scenario": "Corridor has shallow underground utilities (< 1.2m depth, e.g., Ward 12 / C-14)",
                    "recommended_bundle": [
                        "tech-shade-tensile-cool",
                        "tech-wx-microclimate",
                        "tech-aqi-lcs-pro",
                    ],
                    "rationale": "Avoids deep trenching via surface-bolted tensile shade pergolas + cool pavement, paired with pole-mounted WBGT weather and AQI verification sensors.",
                },
                {
                    "scenario": "Corridor has wide unencumbered soil verges suitable for vegetative canopy",
                    "recommended_bundle": [
                        "tech-soil-fdr-probe",
                        "tech-irrig-smart-drip",
                        "tech-aqi-lcs-pro",
                    ],
                    "rationale": "Automates sapling survival during summer heatwaves with root-zone FDR moisture probes and STP recycled-water drip valves.",
                },
            ],
        }

    def generate_rfp_specification(
        self,
        corridor_id: str = "C-14",
        budget_lakh: float = 8.0,
        meko_enabled: bool = True,
        include_monitoring_kit: bool = True,
    ) -> Dict[str, Any]:
        """
        Generate a complete Draft Municipal RFP Specification combining deterministic
        MILP intervention optimization, Meko recalled site constraints, and IOMETE
        equipment specifications.
        """
        corr = get_corridor_by_id(corridor_id) or get_corridor_by_id("C-14")
        cid = corr["id"]

        site_restrictions = []
        recalled_evidence = []
        if meko_enabled and corr.get("code") == "C-14":
            site_restrictions = [
                {
                    "corridor_id": cid,
                    "excluded_interventions": ["linear_street_trees", "roadside_bioswales"],
                    "reason": "Recalled Meko memory (survey-014): Shallow DJB water main & IGL gas line at 0.9m depth prohibit deep tree pits (>1.2m) and bioswale trenching.",
                    "evidence_reference": "survey-014",
                }
            ]
            recalled_evidence.append(
                "survey-014 (Ward 12 Municipal GPR Subsurface Utility Audit — verified by planner_niharika)"
            )

        opt_result = optimize_corridor_portfolio(
            corridors=[corr],
            budget_lakh=budget_lakh,
            climate_priority="heat_resilience",
            site_restrictions=site_restrictions,
        )

        recommended_monitoring_skus = [
            item
            for item in CLIMATE_TECH_CATALOG
            if item["sku_id"] in ("tech-wx-microclimate", "tech-aqi-lcs-pro")
        ] if include_monitoring_kit else []

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        rfp_ref = f"MCD-CLIMATE-RFP-{corr.get('code', 'C14')}-2026"

        return {
            "rfp_reference_number": rfp_ref,
            "generated_date": now_str,
            "issuing_authority": "Municipal Climate Resilience & Green Infrastructure Cell (NCT of Delhi)",
            "project_title": f"Turnkey Heat-Mitigation & Microclimate Telemetry Deployment for {corr.get('name')} ({corr.get('code')}, {corr.get('ward_id')})",
            "pricing_classification": "Illustrative Reference Pricing (Subject to GeM / CPWD Schedule Discovery)",
            "section_1_environmental_baseline": {
                "corridor_id": cid,
                "corridor_code": corr.get("code"),
                "corridor_name": corr.get("name"),
                "ward_id": corr.get("ward_id"),
                "district": corr.get("district"),
                "observed_lst_celsius": corr.get("lst"),
                "observed_ndvi": corr.get("ndvi"),
                "observed_aqi": corr.get("aqi"),
                "tri_vector_priority_score": corr.get("ugs"),
            },
            "section_2_institutional_memory_constraints": {
                "meko_memory_applied": meko_enabled,
                "recalled_evidence_references": recalled_evidence,
                "mandatory_engineering_exclusions": [
                    r["reason"] for r in site_restrictions
                ] or ["No subsurface exclusions recalled; standard pre-excavation GPR scan required."],
            },
            "section_3_selected_intervention_bill_of_quantities": {
                "optimization_solver": opt_result["solver"],
                "municipal_budget_ceiling_lakh_inr": budget_lakh,
                "selected_interventions": opt_result["selected_interventions"],
                "rejected_alternatives": opt_result["rejected_alternatives"],
                "total_capex_lakh_inr": opt_result["total_capex_lakh_inr"],
                "annual_opex_lakh_inr": opt_result["annual_opex_lakh_inr"],
                "lifecycle_5yr_cost_lakh_inr": opt_result["lifecycle_5yr_cost_lakh_inr"],
                "remaining_budget_lakh_inr": opt_result["remaining_budget_lakh_inr"],
            },
            "section_4_companion_monitoring_hardware_specs": recommended_monitoring_skus,
            "section_5_mandatory_vendor_compliance_questions": [
                "Confirm that all structural footings for shade pergolas require <= 350mm excavation depth in compliance with GPR survey-014.",
                "Provide third-party ASTM E1980 Solar Reflectance Index (SRI >= 78) and wet Pendulum Test Value (PTV >= 55) lab certificates.",
                "Confirm open MQTT/JSON telemetry integration with VanSetu Tiger Data (`environmental_observations` hypertable) with zero proprietary API lock-in.",
                "Submit 5-year comprehensive Operation & Maintenance (O&M) SLA including quarterly high-albedo pavement washing.",
            ],
        }


_PROCUREMENT_SERVICE: Optional[ProcurementService] = None


def get_procurement_service() -> ProcurementService:
    global _PROCUREMENT_SERVICE
    if _PROCUREMENT_SERVICE is None:
        _PROCUREMENT_SERVICE = ProcurementService()
    return _PROCUREMENT_SERVICE
