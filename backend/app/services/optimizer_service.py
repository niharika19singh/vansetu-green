"""
VanSetu GreenTech — Budget-Constrained Climate Intervention Portfolio Optimizer.

Uses deterministic Mixed-Integer Linear Programming (`scipy.optimize.milp`) to
allocate a fixed municipal budget across candidate urban corridors and the five
GreenTech intervention categories:
1. Linear Street Trees (`linear_street_trees`)
2. Architectural Shade Structures (`architectural_shade_structures`)
3. Roadside Bioswales (`roadside_bioswales`)
4. Living Green Walls (`living_green_walls`)
5. Cool Pavements (`cool_pavements`)

Mathematical Formulation:
Maximize:
    sum_{c, i} x_{c,i} * U_{c,i}
where utility U_{c,i} integrates:
    - Corridor Priority Score P_c
    - Intervention Suitability S_{c,i}
    - Implementation Feasibility F_c
    - Evidence Confidence C_c
    - Socio-Spatial Equity Multiplier E_c (weighted by `equity_weight`)
Subject to:
    1. Budget constraint: sum_{c, i} Cost_{c,i} * x_{c,i} <= Budget
    2. Site constraint exclusions: x_{c,i} = 0 for any (c, i) flagged in `site_restrictions`
    3. Corridor capacity constraint: at most `max_interventions_per_corridor` selected per corridor
    4. Discrete modular deployment units x_{c,i} in {0, 1}
"""
from typing import Dict, Any, List, Optional
import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds

from app.services.corridor_service import corridor_service
from app.services.intervention_service import INTERVENTION_CATALOG
from app.services.scoring_service import DISTRICT_VULNERABILITY_INDEX


class InterventionOptimizerService:
    """
    Deterministic MILP optimization engine for budget-constrained climate action portfolios.
    Never uses an LLM to calculate or invent numerical optimization outputs.
    """

    def optimize_portfolio(
        self,
        *,
        budget_inr_lakhs: float = 25.0,
        budget_mode: str = "capex",  # "capex" or "lifecycle_5yr"
        target_corridor_ids: Optional[List[str]] = None,
        district: Optional[str] = None,
        scenario: str = "baseline",
        equity_weight: float = 0.25,
        site_restrictions: Optional[Dict[str, List[str]]] = None,
        global_restricted_interventions: Optional[List[str]] = None,
        max_interventions_per_corridor: int = 2,
        min_confidence_threshold: float = 0.50,
    ) -> Dict[str, Any]:
        """
        Solve the Mixed-Integer Linear Program (MILP) to select the optimal
        portfolio of corridor interventions under `budget_inr_lakhs`.
        """
        if budget_inr_lakhs <= 0:
            raise ValueError("budget_inr_lakhs must be strictly positive (> 0).")

        corridors_res = corridor_service.get_corridors(district=district, scenario=scenario)
        all_corridors = corridors_res["corridors"]

        # Resolve target corridors if specified (supports id, code like "C-14", or ward_id like "ward-12")
        if target_corridor_ids:
            targets_lower = {str(t).strip().lower() for t in target_corridor_ids}
            candidates_corridors = [
                c
                for c in all_corridors
                if str(c["id"]).lower() in targets_lower
                or str(c.get("code", "")).lower() in targets_lower
                or str(c.get("ward_id", "")).lower() in targets_lower
                or any(t in str(c.get("name", "")).lower() for t in targets_lower)
            ]
            if not candidates_corridors:
                # Fallback to top 10 if filter matched nothing
                candidates_corridors = all_corridors[:10]
        else:
            candidates_corridors = all_corridors[:15]

        single_corridor_mode = len(candidates_corridors) == 1
        site_restrictions = site_restrictions or {}
        global_restricted = set(global_restricted_interventions or [])

        # Build decision variables: each candidate is (corridor, intervention, deployment_km)
        # In single-corridor tight-budget mode (e.g. ₹8L on C-14), allow modular segment sizing
        # (e.g., 0.35 km, 0.50 km, or 1.00 km module) so realistic sub-corridor packages can be formed.
        candidates: List[Dict[str, Any]] = []
        rejected_alternatives: List[Dict[str, Any]] = []

        for corr in candidates_corridors:
            cid = corr["id"]
            ccode = corr.get("code", cid)
            ward_id = corr.get("ward_id", "ward-01")
            corr_len_km = float(corr.get("length_km", 1.0))

            # Check corridor-specific restrictions by id, code, or ward_id
            corr_banned = set(
                site_restrictions.get(cid, [])
                + site_restrictions.get(ccode, [])
                + site_restrictions.get(ward_id, [])
                + site_restrictions.get("*", [])
            ) | global_restricted

            vuln_info = DISTRICT_VULNERABILITY_INDEX.get(
                corr["district"], {"index": 0.65, "density_tier": "Moderate"}
            )
            vuln_idx = float(vuln_info["index"])
            equity_Boost = 1.0 + float(equity_weight) * (vuln_idx - 0.50)

            p_score = float(corr.get("priority_score") or 0.55)
            f_score = float(corr.get("feasibility_score") or 0.75)
            c_score = float(corr.get("confidence_score") or 0.75)

            for int_item in corr.get("intervention_plan", {}).get("all_interventions", []):
                int_id = int_item["id"]
                int_name = int_item["name"]
                suit_score = float(int_item["suitability_score"])
                spec = INTERVENTION_CATALOG[int_id]
                cp = spec["cost_parameters"]

                unit_capex = float(cp["capex_inr_lakhs_per_km"])
                unit_opex = float(cp["annual_opex_inr_lakhs_per_km"])
                unit_life5 = float(cp["five_year_lifecycle_inr_lakhs_per_km"])

                # Determine practical deployment length (km)
                if single_corridor_mode and budget_inr_lakhs <= 12.0:
                    # Standardize modular phase length so options fit municipal ward micro-grants
                    if int_id == "linear_street_trees" and unit_capex * 1.0 <= budget_inr_lakhs:
                        deploy_km = 1.0
                    elif int_id in ("architectural_shade_structures", "cool_pavements"):
                        deploy_km = 0.35
                    else:
                        deploy_km = min(0.50, corr_len_km)
                else:
                    deploy_km = min(max(corr_len_km, 0.35), 1.20)

                capex_cost = round(unit_capex * deploy_km, 2)
                annual_opex_cost = round(unit_opex * deploy_km, 2)
                five_yr_opex_cost = round(unit_opex * 5.0 * deploy_km, 2)
                lifecycle_cost = round(unit_life5 * deploy_km, 2)

                active_cost = lifecycle_cost if budget_mode == "lifecycle_5yr" else capex_cost

                # Check hard disqualifications before MILP
                if int_id in corr_banned:
                    rejected_alternatives.append(
                        {
                            "corridor_id": cid,
                            "corridor_code": ccode,
                            "corridor_name": corr["name"],
                            "ward_id": ward_id,
                            "district": corr["district"],
                            "intervention_id": int_id,
                            "intervention_name": int_name,
                            "deployment_km": round(deploy_km, 2),
                            "capex_inr_lakhs": capex_cost,
                            "five_year_lifecycle_inr_lakhs": lifecycle_cost,
                            "suitability_score": suit_score,
                            "rejection_reason": "site_constraint_conflict",
                            "rejection_detail": (
                                f"Excluded prior to optimization due to verified site restriction on {ccode} ({ward_id}) "
                                f"prohibiting {int_name}."
                            ),
                        }
                    )
                    continue

                if c_score < min_confidence_threshold:
                    rejected_alternatives.append(
                        {
                            "corridor_id": cid,
                            "corridor_code": ccode,
                            "corridor_name": corr["name"],
                            "ward_id": ward_id,
                            "district": corr["district"],
                            "intervention_id": int_id,
                            "intervention_name": int_name,
                            "deployment_km": round(deploy_km, 2),
                            "capex_inr_lakhs": capex_cost,
                            "five_year_lifecycle_inr_lakhs": lifecycle_cost,
                            "suitability_score": suit_score,
                            "rejection_reason": "insufficient_evidence_confidence",
                            "rejection_detail": (
                                f"Corridor evidence confidence ({c_score:.2f}) is below threshold ({min_confidence_threshold:.2f})."
                            ),
                        }
                    )
                    continue

                # Composite objective utility U_{c,i}
                # Rewards high priority, high suitability, high feasibility, confidence, and equity
                utility = round(
                    float(
                        100.0
                        * p_score
                        * (0.55 * suit_score + 0.25 * f_score + 0.20 * c_score)
                        * equity_Boost
                        * (deploy_km ** 0.65)
                    ),
                    4,
                )

                candidates.append(
                    {
                        "corridor_id": cid,
                        "corridor_code": ccode,
                        "corridor_name": corr["name"],
                        "ward_id": ward_id,
                        "district": corr["district"],
                        "highway": corr["highway"],
                        "priority_score": p_score,
                        "feasibility_score": f_score,
                        "confidence_score": c_score,
                        "vulnerability_index": vuln_idx,
                        "equity_multiplier": round(equity_Boost, 4),
                        "intervention_id": int_id,
                        "intervention_name": int_name,
                        "category": int_item["category"],
                        "suitability_score": suit_score,
                        "deployment_km": round(deploy_km, 2),
                        "capex_inr_lakhs": capex_cost,
                        "annual_opex_inr_lakhs": annual_opex_cost,
                        "five_year_opex_inr_lakhs": five_yr_opex_cost,
                        "five_year_lifecycle_inr_lakhs": lifecycle_cost,
                        "active_budget_cost": active_cost,
                        "objective_utility": utility,
                        "utility_per_lakh": round(utility / max(active_cost, 0.1), 4),
                        "selection_rationale": int_item["selection_rationale"],
                        "pre_installation_verification": int_item["pre_installation_verification"],
                    }
                )

        n_vars = len(candidates)
        selected_interventions: List[Dict[str, Any]] = []

        if n_vars > 0:
            # Objective: maximize sum(U * x) -> minimize sum(-U * x)
            c_obj = np.array([-item["objective_utility"] for item in candidates], dtype=float)
            integrality = np.ones(n_vars, dtype=int)  # binary {0, 1}
            bounds = Bounds(lb=np.zeros(n_vars), ub=np.ones(n_vars))

            # Constraint 1: Total active cost <= budget_inr_lakhs
            rows = [np.array([item["active_budget_cost"] for item in candidates], dtype=float)]
            ubs = [float(budget_inr_lakhs)]
            lbs = [-np.inf]

            # Constraint 2: At most `max_interventions_per_corridor` per corridor
            unique_cids = sorted(list({item["corridor_id"] for item in candidates}))
            for u_cid in unique_cids:
                row = np.array(
                    [1.0 if item["corridor_id"] == u_cid else 0.0 for item in candidates],
                    dtype=float,
                )
                rows.append(row)
                ubs.append(float(max_interventions_per_corridor))
                lbs.append(-np.inf)

            A_mat = np.vstack(rows)
            constraints = LinearConstraint(A_mat, lbs, ubs)

            res = milp(c=c_obj, integrality=integrality, bounds=bounds, constraints=constraints)
            sol = np.round(res.x).astype(int) if (res.success and res.x is not None) else np.zeros(n_vars, dtype=int)

            total_selected_cost = sum(
                candidates[i]["active_budget_cost"] for i in range(n_vars) if sol[i] == 1
            )
            remaining = round(float(budget_inr_lakhs) - total_selected_cost, 2)

            for i, item in enumerate(candidates):
                if sol[i] == 1:
                    selected_interventions.append(item)
                else:
                    if item["active_budget_cost"] > budget_inr_lakhs:
                        reason = "exceeds_total_budget"
                        detail = (
                            f"Cost (₹{item['active_budget_cost']}L) exceeds total available budget (₹{budget_inr_lakhs}L)."
                        )
                    elif item["active_budget_cost"] > remaining:
                        reason = "exceeds_remaining_budget"
                        detail = (
                            f"Cost (₹{item['active_budget_cost']}L) exceeds remaining unallocated budget (₹{remaining}L) "
                            f"after higher-utility selections."
                        )
                    else:
                        reason = "dominated_by_higher_utility_package"
                        detail = (
                            f"Lower composite benefit-to-cost ratio ({item['utility_per_lakh']:.2f} utility/₹L) "
                            f"or corridor slot limit reached."
                        )
                    rejected_alternatives.append(
                        {
                            "corridor_id": item["corridor_id"],
                            "corridor_code": item["corridor_code"],
                            "corridor_name": item["corridor_name"],
                            "ward_id": item["ward_id"],
                            "district": item["district"],
                            "intervention_id": item["intervention_id"],
                            "intervention_name": item["intervention_name"],
                            "deployment_km": item["deployment_km"],
                            "capex_inr_lakhs": item["capex_inr_lakhs"],
                            "five_year_lifecycle_inr_lakhs": item["five_year_lifecycle_inr_lakhs"],
                            "suitability_score": item["suitability_score"],
                            "rejection_reason": reason,
                            "rejection_detail": detail,
                        }
                    )

        # Sort selected by utility descending
        selected_interventions.sort(key=lambda x: -x["objective_utility"])

        total_capex = round(sum(x["capex_inr_lakhs"] for x in selected_interventions), 2)
        total_annual_opex = round(sum(x["annual_opex_inr_lakhs"] for x in selected_interventions), 2)
        total_five_yr_opex = round(sum(x["five_year_opex_inr_lakhs"] for x in selected_interventions), 2)
        total_lifecycle = round(sum(x["five_year_lifecycle_inr_lakhs"] for x in selected_interventions), 2)
        used_budget = total_lifecycle if budget_mode == "lifecycle_5yr" else total_capex
        remaining_budget = round(max(0.0, float(budget_inr_lakhs) - used_budget), 2)
        utilization_pct = round((used_budget / float(budget_inr_lakhs)) * 100.0, 1)

        # Equity metrics (Phase 8 — Best Social Innovation)
        high_vuln_capex = round(
            sum(
                x["capex_inr_lakhs"]
                for x in selected_interventions
                if x["vulnerability_index"] >= 0.72
            ),
            2,
        )
        equity_share_pct = round(
            (high_vuln_capex / max(total_capex, 0.01)) * 100.0 if total_capex > 0 else 0.0,
            1,
        )
        total_km_treated = round(sum(x["deployment_km"] for x in selected_interventions), 2)

        site_excluded_count = sum(
            1 for r in rejected_alternatives if r["rejection_reason"] == "site_constraint_conflict"
        )

        tradeoff_summary = (
            f"Deterministic MILP solver (`scipy.optimize.milp`) evaluated {n_vars + site_excluded_count} candidate "
            f"corridor-intervention pairs under a {budget_mode.upper()} ceiling of ₹{budget_inr_lakhs:.2f} Lakhs "
            f"(equity_weight={equity_weight:.2f}). Selected {len(selected_interventions)} intervention(s) covering "
            f"{total_km_treated} km for ₹{total_capex:.2f}L CapEx (₹{total_lifecycle:.2f}L 5-yr lifecycle; "
            f"₹{remaining_budget:.2f}L remaining). "
            f"{site_excluded_count} option(s) were excluded due to verified site constraints."
        )

        return {
            "solver": "scipy.optimize.milp (Branch-and-Cut Mixed-Integer Linear Programming)",
            "deterministic_guarantee": True,
            "parameters": {
                "budget_inr_lakhs": round(float(budget_inr_lakhs), 2),
                "budget_mode": budget_mode,
                "scenario": scenario,
                "district": district or "All Districts",
                "equity_weight": equity_weight,
                "max_interventions_per_corridor": max_interventions_per_corridor,
                "site_restrictions_applied": site_restrictions,
            },
            "financial_summary": {
                "available_budget_inr_lakhs": round(float(budget_inr_lakhs), 2),
                "total_capex_inr_lakhs": total_capex,
                "total_annual_opex_inr_lakhs": total_annual_opex,
                "total_five_year_opex_inr_lakhs": total_five_yr_opex,
                "total_five_year_lifecycle_inr_lakhs": total_lifecycle,
                "remaining_budget_inr_lakhs": remaining_budget,
                "budget_utilization_pct": utilization_pct,
            },
            "equity_and_social_impact": {
                "high_vulnerability_capex_inr_lakhs": high_vuln_capex,
                "high_vulnerability_budget_share_pct": equity_share_pct,
                "total_corridor_km_treated": total_km_treated,
                "corridors_served_count": len({x["corridor_id"] for x in selected_interventions}),
            },
            "recommended_portfolio": selected_interventions,
            "selected_interventions": selected_interventions,
            "rejected_alternatives": rejected_alternatives[:20],
            "rejected_count": len(rejected_alternatives),
            "tradeoff_explanation": tradeoff_summary,
        }


optimizer_service = InterventionOptimizerService()

INTERVENTION_SPECS: Dict[str, Dict[str, Any]] = {
    item["id"]: item for item in INTERVENTION_CATALOG
} if isinstance(INTERVENTION_CATALOG, list) else INTERVENTION_CATALOG


def optimize_corridor_portfolio(
    corridors: List[Dict[str, Any]],
    budget_lakh: float = 8.0,
    climate_priority: str = "heat_resilience",
    site_restrictions: Optional[List[Dict[str, Any]]] = None,
    equity_weight: float = 0.25,
) -> Dict[str, Any]:
    """
    Adapter wrapper around `optimizer_service.optimize_portfolio` supporting list-of-dicts
    `site_restrictions` and providing normalized financial summary keys.
    """
    scenario_map = {
        "heat_resilience": "heat_resilience",
        "heat_first": "heat_resilience",
        "air_quality": "air_quality",
        "air_quality_first": "air_quality",
        "pedestrian_equity": "pedestrian_equity",
        "equity_first": "pedestrian_equity",
        "extreme_vulnerability": "extreme_vulnerability",
        "baseline": "baseline",
    }
    scen = scenario_map.get(climate_priority, "baseline")
    target_ids = [c.get("code") or c.get("id") for c in corridors if c]

    restrictions_map: Dict[str, List[str]] = {}
    for r in site_restrictions or []:
        cid = str(r.get("corridor_id", "*"))
        ex = list(r.get("excluded_interventions", []))
        restrictions_map.setdefault(cid, []).extend(ex)
        # Also map by corridor code if present
        for c in corridors:
            if c.get("id") == cid and c.get("code"):
                restrictions_map.setdefault(str(c["code"]), []).extend(ex)

    res = optimizer_service.optimize_portfolio(
        budget_inr_lakhs=max(0.1, float(budget_lakh)),
        budget_mode="capex",
        target_corridor_ids=target_ids,
        scenario=scen,
        equity_weight=equity_weight,
        site_restrictions=restrictions_map,
    )
    fin = res.get("financial_summary", {})
    selected_norm = []
    for item in res.get("selected_interventions", []):
        s_copy = dict(item)
        s_copy.setdefault("capex_lakh_inr", s_copy.get("capex_inr_lakhs"))
        s_copy.setdefault("annual_opex_lakh_inr", s_copy.get("annual_opex_inr_lakhs"))
        s_copy.setdefault("lifecycle_5yr_lakh_inr", s_copy.get("five_year_lifecycle_inr_lakhs"))
        selected_norm.append(s_copy)

    rejected_norm = []
    for item in res.get("rejected_alternatives", []):
        r_copy = dict(item)
        r_copy.setdefault("rejection_reason", r_copy.get("reason_code", "budget_or_constraint"))
        r_copy.setdefault("explanation", r_copy.get("reason", ""))
        rejected_norm.append(r_copy)

    res["selected_interventions"] = selected_norm
    res["rejected_alternatives"] = rejected_norm
    res["total_capex_lakh_inr"] = fin.get("total_capex_inr_lakhs", 0.0)
    res["annual_opex_lakh_inr"] = fin.get("total_annual_opex_inr_lakhs", 0.0)
    res["lifecycle_5yr_cost_lakh_inr"] = fin.get("total_five_year_lifecycle_inr_lakhs", 0.0)
    res["remaining_budget_lakh_inr"] = fin.get("remaining_budget_inr_lakhs", 0.0)
    return res

