# Best Social Innovation — Equity-Aware Urban Climate Action

## 1. Human-Centered Mission

Urban extreme heat in NCT Delhi disproportionately harms residents who cannot retreat into air-conditioned vehicles or buildings:
1. **Outdoor Workers & Street Vendors (`outdoor_workers`):** Cycle-rickshaw operators, delivery workers, sanitation staff, and street vendors exposed to $40^\circ\text{C}+$ asphalt radiant heat during 12:00–16:00 IST.
2. **Public Transit Commuters (`transit_commuters`):** Bus queue and last-mile metro feeder pedestrians walking along unshaded corridors.
3. **Schoolchildren (`schoolchildren`):** Afternoon municipal school dispersal routes lacking canopy or pergola shade.
4. **Elderly Residents (`elderly_residents`):** Vulnerable pedestrians navigating between residential wards and municipal dispensaries.
5. **Dense Low-Income Neighborhoods (`dense_low_income_neighborhoods`):** High-thermal-mass settlements with high socio-spatial vulnerability and severe green deficit.

---

## 2. Equity Integration in Scoring & MILP Budget Optimization

1. **Socio-Spatial Vulnerability in Tri-Vector Scoring:**
   - Integrates district vulnerability indices and pedestrian exposure into the Priority Need vector, with dedicated `pedestrian_equity` and `extreme_vulnerability` policy scenarios.
2. **Equity Multiplier in Deterministic MILP Optimizer (`scipy.optimize.milp`):**
   - In [`InterventionOptimizerService.optimize_portfolio`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/optimizer_service.py#L108-L113), the objective utility of candidate corridor-intervention pairs is weighted by `equity_Boost = 1.0 + equity_weight * (vuln_idx - 0.50)`, directing scarce municipal budgets toward high-vulnerability wards and tracking `high_vulnerability_budget_share_pct`.

---

## 3. Anonymized Community Observations with Human Verification Gate

Implemented in [`social_equity_service.py`](file:///Users/user/Documents/TeleSol-mac-release/vansetu-green/backend/app/services/social_equity_service.py) (`GET/POST /api/equity/observations`):
- Community groups, ASHA health workers, and commuter unions can submit anonymized observations across 4 categories (`heat_exposure`, `shade_accessibility`, `pedestrian_infrastructure`, `drinking_water_cooling_access`).
- **Zero PII Collection:** Only anonymized reporter roles and public corridor landmarks are stored.
- **Strict Human Verification Gate:** Every submission enters `verification_status="pending_review"` and requires explicit planner verification (`POST /api/equity/observations/{id}/verify`) before influencing formal corridor equity boosts or Meko institutional memory.
