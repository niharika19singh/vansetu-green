# VanSetu — Feature 7: Spatial Institutional Memory Map (YugabyteDB / Meko)

## 1. Overview & Georeferenced Memory Infrastructure

A common failure mode in urban planning is institutional amnesia: field engineers discover a high-voltage underground cable, an archaeological excavation restriction, or an aggressive tree root heave, but that knowledge remains locked in an unread inspection memo. Two years later, another department orders mechanical excavation at the exact same location.

The **Spatial Institutional Memory Map** links YugabyteDB / Meko multi-agent memories directly to geospatial coordinates ($[\text{lat}, \text{lng}]$), municipal wards, corridor codes (e.g. `C-14`), and sub-segments (e.g. `C-14-S2`).

---

## 2. The 5 Institutional Knowledge Categories

Every memory pin is classified into one of 5 functional categories:

| Category | UI Color | Functional Role & Example |
| :--- | :--- | :--- |
| `SITE_CONSTRAINT` | Red (`#ef4444`) | Buried BSES 33kV high-voltage lines preventing deep excavation. |
| `COMMUNITY_FEEDBACK` | Blue (`#3b82f6`) | Street vendors requesting continuous shade canopy near bus stops. |
| `PAST_FAILURE` | Orange (`#f97316`) | 2022 Conocarpus plantation died due to soil compaction and drought. |
| `SUCCESSFUL_PRECEDENT` | Green (`#10b981`) | Native Neem/Karanj saplings survived 2024 heatwave with 92% canopy density. |
| `REGULATORY_RESTRICTION`| Purple (`#8b5cf6`) | Archaeological Survey of India (ASI) 100m monument buffer zone. |

---

## 3. Full Memory Lifecycle Operations

Users and agents can interactively manage memory records through 5 official operations:

1. **APPROVE:** Certified municipal engineers verify an observation (`verification_status = 'VERIFIED_MUNICIPAL'`).
2. **CORRECT:** Reviewers modify observation text to align with verified local ground truth.
3. **PROMOTE:** Graduates a localized memory into cross-agent institutional knowledge (`promoted = 1`).
4. **FORGET / REVOKE:** Soft-deletes inaccurate or invalid observations (`validity_status = 'REVOKED'`).
5. **SUPERSEDE:** Marks older surveys as superseded by newer field inspections.

---

## 4. MEKO ON vs. OFF Decision Impact

The platform demonstrates the concrete difference institutional memory makes:

- **When MEKO is OFF (Generic Satellite Model):**
  - Generates recommendations based purely on satellite greenness deficit and surface heat.
  - Recommends deep-pit Linear Street Trees on Corridor C-14 without knowing about subsurface utilities.
  - **Risk:** High probability of striking buried high-voltage power lines during mechanical excavation.
- **When MEKO is ON (Shared Institutional Memory):**
  - Recalls field memory pin alerting to underground BSES feeder lines.
  - Automatically alters the recommendation to **Architectural Tensile Shade Canopies** or **Shallow-Rooted Karanj with Vertical Root Barriers**.
  - Prevents utility damage and saves municipal CapEx.
