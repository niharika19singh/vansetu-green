# VanSetu — Feature 4: Pedestrian Shade Continuity Analyser

## 1. Overview & Walkability Network Graph

Pedestrian thermal comfort in hot arid climates like Delhi is strongly governed by continuous shade coverage. A walking journey that is 80% shaded can still result in acute heat exhaustion if pedestrians must cross an uninterrupted 400m exposed, unshaded asphalt stretch between transit nodes.

The **Pedestrian Shade Continuity Analyser** models pedestrian paths as a connected network graph:
- **Graph Nodes:** Delhi Metro stations (e.g. Kashmere Gate, Chandni Chowk, Rajiv Chowk), Inter-State Bus Terminals (ISBT), railway interchanges, and road intersections.
- **Graph Edges:** Corridor sub-segments (~150m–200m) with geometric length ($L_s$), 10m Sentinel-2 canopy coverage percentage, and solar exposure classification.

---

## 2. Segment Shade Classification

Each sub-segment is classified based on native 10m Sentinel-2 surface reflectance:
- `WELL_SHADED`: Canopy coverage $\ge 50.0\%$ (Significant solar interception).
- `PARTIALLY_SHADED`: Canopy coverage $28.0\% - 49.9\%$ (Fragmented tree canopy).
- `EXPOSED_GAP`: Canopy coverage $< 28.0\%$ (Severe solar radiation exposure).

Continuous sequences of `EXPOSED_GAP` segments are grouped into **Unbroken Thermal Gaps**. Gaps exceeding 250m are classified as `CRITICAL EXPOSURE`.

---

## 3. The Documented Shade Gap Score

The **Shade Gap Score** ($S_{\text{gap}} \in [0, 100]$) quantifies corridor exposure severity:

$$S_{\text{gap}} = \min\left(100.0, \; \left(\frac{\sum L_{\text{gap}}}{L_{\text{total}}}\right) \times 100 \times \left(1.0 + \min\left(0.3, \; \frac{L_{\text{max\_stretch}}}{1000.0}\right)\right)\right)$$

Where:
- $\sum L_{\text{gap}}$ is the total cumulative unshaded length along the corridor.
- $L_{\text{total}}$ is the total corridor length.
- $L_{\text{max\_stretch}}$ is the longest continuous unshaded pedestrian stretch in meters.

---

## 4. Shade Bridge Interventions

For every critical unbroken thermal gap identified, the system generates a targeted **Shade Bridge** recommendation:
- **Span:** Exact sub-segments to be connected (e.g. `C-14-S2` to `C-14-S4`).
- **Archetype:** Linear Street Trees (spaced at 8m intervals with quick-canopy species such as *Azadirachta indica* or *Cassia fistula*) or Cantilevered Architectural Tensile Canopies.
- **Capital Cost:** Direct investment estimate in INR Lakhs.
- **Connectivity Goal:** Connects high-density pedestrian desire lines directly to nearest transit stations.

---

## 5. Scientific Guardrail

VanSetu strictly **does not fabricate pedestrian footfall numbers**. Priority is derived transparently from spatial proximity to verified Delhi Metro stations, bus terminals, and road network topological hierarchy.
