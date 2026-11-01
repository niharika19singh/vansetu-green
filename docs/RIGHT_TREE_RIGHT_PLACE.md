# VanSetu — Feature 2: Right Tree, Right Place (Segment-Level Site Suitability & Native Species Catalog)

## 1. Overview & Mathematical Formulation

Urban corridors are not uniform linear monoliths. A 2.5 km corridor may have wide boulevards at one end, congested footpaths with overhead 11kV electrical cables in the middle, and heavy buried water mains near transit junctions. Treating an entire corridor with a single generic intervention leads to implementation failure.

The **Right Tree, Right Place** engine divides the 44 NCT Delhi corridors into stable sub-segments of ~100m to 250m length ($S_1, S_2, \dots, S_n$) and evaluates 5 intervention archetypes for each segment:
1. `Linear Street Trees`
2. `Roadside Bioswales`
3. `Living Green Walls`
4. `Architectural Shade Structures`
5. `High-Albedo Cool Pavements`

---

## 2. Explicit Feasibility States

Every archetype evaluation yields one of 4 unambiguous states:

1. `FEASIBLE_ESTIMATE`: Meets geometry, available sidewalk width $\ge 1.8\text{m}$, adequate overhead clearance, and low suspected utility risk based on desk analysis.
2. `FIELD_VERIFICATION_REQUIRED`: Borderline conditions (e.g. sidewalk width 1.8m–2.2m, high suspected buried utility cluster, or soil compaction uncertainty) requiring physical GPR or core tests.
3. `CONSTRAINT_IDENTIFIED`: Specific localized physical constraint identified (e.g., overhead high-voltage transmission lines $<5.0\text{m}$, or storm drain clash). The system provides a constraint-driven alternative.
4. `NOT_FEASIBLE`: Hard physical violation. For example, sidewalk width $< 1.80\text{m}$ violates **Indian Road Congress (IRC:103)** guidelines; excavating tree pits would force pedestrians into motorized vehicular traffic.

---

## 3. Constraint-Driven Fallback Architecture

When a primary recommendation is constrained, the engine selects the appropriate alternative:

```
[Candidate Segment Evaluation]
           │
           ├── Sidewalk < 1.8m? ──► NOT_FEASIBLE for Trees ──► Fallback: Living Green Walls / Cool Pavement
           │
           ├── Overhead Wire < 5m? ──► CONSTRAINT_IDENTIFIED ──► Fallback: Compact Species (Amla/Lasora) or Tensile Canopy
           │
           ├── Underground Utility Cluster? ──► FIELD_VERIFICATION ──► Fallback: Shallow Root Karanj / Planter Boxes
           │
           └── Feasible Geometry? ──► FEASIBLE_ESTIMATE ──► Primary: High-Canopy Native Trees (Neem/Amaltas)
```

---

## 4. NCT Delhi Native Tree Species Catalog

The platform provides a scientific catalog of 12 native and naturalized species adapted to Delhi's semi-arid, alluvial, hot summer climate:

| ID | Botanical Name | Common / Hindi | Mature Height | Canopy Spread | Min. Sidewalk Width | Root Architecture | PM2.5 Filtration |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `tree_neem` | *Azadirachta indica* | Neem / नीम | 15.0m | 12.0m | 2.5m | Deep taproot, pavement safe | Very High |
| `tree_karanj` | *Pongamia pinnata* | Karanj / करंज | 12.0m | 10.0m | 2.2m | Dense lateral, nitrogen-fixing | High |
| `tree_pilkhan` | *Ficus virens* | Pilkhan / पिलखन | 18.0m | 16.0m | 3.8m | Massive spreading (verges only) | Excellent |
| `tree_amaltas` | *Cassia fistula* | Amaltas / अमलतास | 10.0m | 7.0m | 2.0m | Non-invasive compact root ball | Moderate |
| `tree_jamun` | *Syzygium cumini* | Jamun / जामुन | 16.0m | 12.0m | 3.0m | Deep moisture-seeking root | Very High |
| `tree_palash` | *Butea monosperma* | Palash / पलाश | 9.0m | 6.5m | 2.0m | Deep lateral taproot, drought hardy | Moderate |
| `tree_chilbil` | *Holoptelea integrifolia*| Chilbil / चिलबिल | 15.0m | 11.0m | 2.8m | Deep penetrating Aravalli native | High |
| `tree_saptaparni`| *Alstonia scholaris* | Saptaparni / सप्तपर्णी | 14.0m | 8.0m | 2.2m | Whorled tiered evergreen | High |
| `tree_shisham` | *Dalbergia sissoo* | Shisham / शीशम | 15.0m | 9.0m | 2.6m | Deep taproot + surface suckers | Moderate |
| `tree_lasora` | *Cordia dichotoma* | Lasora / लसोड़ा | 8.5m | 6.0m | 1.9m | Compact, fits low wire envelopes | Very High |
| `tree_amla` | *Phyllanthus emblica* | Amla / आंवला | 7.5m | 5.0m | 1.8m | Fibrous compact, fits tight paths | Moderate |
| `tree_arjun` | *Terminalia arjuna* | Arjun / अर्जुन | 18.0m | 14.0m | 3.5m | Massive buttress roots, riverine | Excellent |

---

## 5. API Endpoints

- `GET /api/suitability/corridor/{corridor_id}/segments`: Subdivides corridor into micro-segments with 5-archetype feasibility states.
- `GET /api/suitability/segment/{segment_id}`: Deep dive into a specific segment's physical envelope and constraint alternatives.
- `GET /api/suitability/species-catalog`: Filterable catalog of native NCT Delhi species.
