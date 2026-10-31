# Meko Product Runtime Datapacks Architecture

## 1. Three Runtime Datapacks

To prevent coding-session build context from contaminating municipal climate planning, all runtime operations use three dedicated datapacks:

| Logical Name | Scope & Purpose | Allowed Runtime Agents |
| :--- | :--- | :--- |
| `vansetu-project-memory` | Stores active planning sessions, extracted planner objectives, candidate site notes (`pending_human_review`), and municipal budget constraints. | `climate_planner_agent`, `corridor_analysis_agent`, `intervention_planning_agent`, `municipal_reviewer` |
| `vansetu-climate-knowledge` | Stores **human-verified, promoted** institutional climate and civil engineering knowledge (`survey-014` subsurface utility conflicts, native heat-mitigation rules). | `climate_planner_agent`, `corridor_analysis_agent`, `intervention_planning_agent`, `municipal_reviewer` |
| `vansetu-planning-decisions` | Stores historical corridor intervention decisions, approved procurement RFPs, and post-deployment lessons learned across planning cycles. | `climate_planner_agent`, `corridor_analysis_agent`, `intervention_planning_agent`, `municipal_reviewer` |

---

## 2. Geospatial Memory Schema

Every runtime memory record stored via Meko `memory_add` carries structured geospatial and governance metadata:

```json
{
  "type": "site_constraint",
  "ward_id": "ward-12",
  "corridor_id": "C-14",
  "corridor_full_id": "delhi_corridor_014",
  "project_id": "proj-delhi-climate-2026",
  "spatial_applicability": "corridor_segment_0m_to_850m",
  "observation_date": "2026-09-14",
  "valid_from": "2026-09-14",
  "validity_status": "active",
  "restricted_interventions": ["linear_street_trees", "roadside_bioswales"],
  "constraint": "Underground utility conflict (66kV BSES power duct & DJB water main at 0.7m depth) prevents deep tree-pit excavation.",
  "evidence_reference": "survey-014",
  "verification_status": "human_verified",
  "source_type": "municipal_gpr_survey"
}
```

---

## 3. Governance & Safety Rules

1. **Human Verification Gate (`memory_promote`):**
   - Candidate memories start with `verification_status="pending_human_review"` in `vansetu-project-memory`.
   - `MekoService.promote_memory()` blocks promotion unless `verification_status == "human_verified"`.
2. **Correction & Forgetting (`memory_update` & `memory_delete`):**
   - Outdated constraints can be updated via `PATCH /api/meko/memories/{id}` (`memory_update`) or forgotten via `DELETE /api/meko/memories/{id}` (`memory_delete`).
3. **Zero Credential / PII Storage:**
   - Regex guards in `MekoService.add_memory()` reject any payload containing API keys (`mko_tkn_`, `AIzaSy`, `sk-`, database URLs) or personal data.
