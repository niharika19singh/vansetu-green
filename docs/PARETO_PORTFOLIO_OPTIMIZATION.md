# VanSetu — Feature 3: Pareto Portfolio Lab (Multi-Objective MILP Decision System)

## 1. Overview & Mathematical Formulation

Municipal climate planning inherently involves competing policy objectives. Prioritizing only the highest heat areas may concentrate investments exclusively in wealthy, tree-lined districts while neglecting unshaded, high-density pedestrian corridors in vulnerable wards. Conversely, optimizing only for lowest upfront capital cost often burdens urban local bodies with crippling long-term maintenance costs.

The **Pareto Portfolio Lab** uses deterministic Mixed-Integer Linear Programming (`scipy.optimize.milp` with the HiGHS branch-and-cut solver) to solve the multi-objective portfolio optimization problem across 3 distinct municipal objectives:

### Objective 1: Maximize Total Climate Priority
$$\max Z_1 = \sum_{c, i} x_{c,i} \cdot P_c$$
Where $P_c$ is the composite Tri-Vector Priority Score of corridor $c$.

### Objective 2: Maximize Social Equity Share
$$\max Z_2 = \frac{\sum_{(c \in V), i} x_{c,i} \cdot \text{CapEx}_{c,i}}{\sum_{c, i} x_{c,i} \cdot \text{CapEx}_{c,i}} \times 100$$
Where $V$ represents corridors situated in designated socio-spatially vulnerable districts (North East Delhi, East Delhi, Shahdara, Central Delhi).

### Objective 3: Minimize 5-Year Lifecycle Maintenance Burden
$$\min Z_3 = \sum_{c, i} x_{c,i} \cdot \left(\text{CapEx}_{c,i} + \sum_{y=1}^{5} \text{OpEx}_{c,i}^{(y)}\right)$$

### Constraints:
1. **Budget Envelopes:** $\sum_{c, i} x_{c,i} \cdot \text{Cost}_{c,i} \le B$ (e.g. ₹20 Lakhs, ₹50 Lakhs, ₹100 Lakhs).
2. **Binary Decision Variables:** $x_{c,i} \in \{0, 1\}$.
3. **Corridor Capacity Limits:** $\sum_{i} x_{c,i} \le 2$ (at most 2 archetypes per corridor).
4. **Site Feasibility Exclusions:** $x_{c,i} = 0$ for any $(c, i)$ flagged as `NOT_FEASIBLE`.

---

## 2. True Pareto Dominance Check

A candidate solution $\mathbf{x}$ is defined as Pareto-dominated by another solution $\mathbf{y}$ if and only if:
1. $Z_k(\mathbf{y}) \ge Z_k(\mathbf{x})$ for all objectives to maximize ($Z_1, Z_2$).
2. $Z_3(\mathbf{y}) \le Z_3(\mathbf{x})$ for the objective to minimize.
3. At least one inequality is strict.

The Pareto Frontier returned by the engine consists strictly of non-dominated solutions, allowing planners to visualize the exact marginal trade-off:
> *"Switching from Scenario A to Scenario C increases Social Equity funding by +24.5% while sacrificing only 6.2% in total climate priority points."*

---

## 3. Mathematical Rationale for Excluded Alternatives

Rather than leaving rejected corridors unexplained, the engine computes the **Marginal Efficiency Ratio** for every candidate corridor:
$$\eta_c = \frac{P_c}{\text{Estimated CapEx}_c} \quad [\text{points per ₹ Lakh}]$$

If a corridor is omitted, the engine provides exact mathematical justification:
> *"Corridor C-22 was excluded because its estimated CapEx (₹14.2 Lakhs) exceeded the remaining budget envelope (₹6.5 Lakhs), and its marginal efficiency (0.041 pts/₹L) was lower than included alternative C-08 (0.072 pts/₹L)."*

---

## 4. Scientific Guardrail

VanSetu strictly refuses to compute or claim direct temperature reductions in degrees Celsius (no *"will reduce air temperature by 2.4°C"* claims). Output metrics reflect empirical vulnerability points reduced, green canopy coverage generated ($m^2$), and native trees planted.
