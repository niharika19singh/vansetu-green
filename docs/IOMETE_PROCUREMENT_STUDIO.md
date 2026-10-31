# IOMETE Sponsored Challenge — "Make Complex Tech Easy to Buy"

## 1. VanSetu Climate Technology Procurement Studio

Municipal engineers and urban planners struggle to procure climate monitoring and cooling hardware because vendor datasheets use opaque jargon (`NETD < 30 mK`, `100 MHz FDR dielectric permittivity`, `ASTM E1980 aged SRI`, `hygroscopic RH correction`).

Implemented in [`procurement_service.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/procurement_service.py) and [`ProcurementStudioView.jsx`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/frontend/src/components/ProcurementStudioView.jsx), the **VanSetu Climate Technology Procurement Studio** translates technical specifications into plain-English buyer cards, lifecycle cost comparisons, and one-click Draft Municipal RFP documents.

---

## 2. Six Supported Climate Technology Categories

1. **Air-Quality Monitoring Devices (`tech-aqi-lcs-pro`):** Tier-1 Solar LoRaWAN/4G PM2.5/PM10/NO2 nodes with humidity correction.
2. **Weather Stations (`tech-wx-microclimate`):** Street-Canyon WBGT & 150mm Black-Globe radiant heat microclimate stations.
3. **Soil-Moisture Sensors (`tech-soil-fdr-probe`):** Multi-depth (15cm/45cm) FDR root-zone volumetric water content & salinity probes.
4. **Smart Irrigation Systems (`tech-irrig-smart-drip`):** Solar latching solenoid drip controllers rated for DJB treated STP effluent.
5. **Environmental Monitoring Equipment (`tech-env-gpr-thermal`):** Dual-frequency (300/800 MHz) Ground-Penetrating Radar (GPR) utility scanner & radiometric thermal camera kit.
6. **Shade & Cooling Infrastructure Technologies (`tech-shade-tensile-cool`):** Surface-bolted galvanized tensile shade pergolas ($\le 350\text{mm}$ footing depth) + high-albedo ($\text{SRI} \ge 82$) cool pavement package.

---

## 3. Buyer-Centric Evaluation Dimensions Per Option

Every catalog item exposes:
- **Plain-Language Use-Case Fit**
- **Technical Specifications**
- **Corridor Compatibility** (e.g., whether deep excavation is required)
- **CapEx, Annual OpEx, and 5-Year Lifecycle Cost** (explicitly labeled as *Illustrative Reference Pricing* based on GeM/CPWD schedule reference bands)
- **Installation & Maintenance Requirements**
- **Warranty & SLA Considerations**
- **Open Telemetry Interoperability** (direct ingestion into Tiger Data `environmental_observations`)
- **Recommended Questions to Ask Vendors Before Buying**

---

## 4. Automated Draft Municipal RFP Generator (`POST /api/procurement/generate-rfp`)

Combines:
1. **Section 1:** Native geospatial & thermal corridor baseline (`C-14`, `ward-12`).
2. **Section 2:** Recalled Meko institutional site constraints (`survey-014`).
3. **Section 3:** Deterministic MILP-optimized Bill of Quantities (`scipy.optimize.milp`).
4. **Section 4:** Companion microclimate verification hardware specifications.
5. **Section 5:** Mandatory vendor compliance checklist.
