"""MODULE 4. Bounded knapsack / subset-sum: fill a bulk order with min surplus."""
import pulp

def aggregate(lots, T, eps=0.02, w_farmers=0.0, w_dist=0.0, G=None, M=None, max_share=0.25):
    """lots: list of dict(id, qty, count=1, grade=1, moisture=12.0, km=0.0)
    Returns chosen {id: units}, total, surplus."""
    m = pulp.LpProblem("agg", pulp.LpMinimize)
    x = {l["id"]: pulp.LpVariable(f"x_{l['id']}", lowBound=0, upBound=l.get("count", 1), cat="Integer") for l in lots}
    u = {l["id"]: pulp.LpVariable(f"u_{l['id']}", cat="Binary") for l in lots}
    tot = pulp.lpSum(l["qty"] * x[l["id"]] for l in lots)
    m += (tot - T) + w_farmers * pulp.lpSum(u.values()) + w_dist * pulp.lpSum(l.get("km", 0) * l["qty"] * x[l["id"]] for l in lots)
    m += tot >= T
    m += tot <= T * (1 + eps)
    for l in lots:
        i = l["id"]
        m += x[i] <= l.get("count", 1) * u[i]
        m += l["qty"] * x[i] <= max_share * T * (1 + eps)
        if G is not None and l.get("grade", 1) < G:
            m += x[i] == 0
    if M is not None:
        m += pulp.lpSum(l["qty"] * (l.get("moisture", 12) - M) * x[l["id"]] for l in lots) <= 0
    m.solve(pulp.PULP_CBC_CMD(msg=0, timeLimit=30))
    chosen = {i: int(v.value()) for i, v in x.items() if (v.value() or 0) > 0.5}
    total = sum(next(l["qty"] for l in lots if l["id"] == i) * n for i, n in chosen.items())
    return {"status": pulp.LpStatus[m.status], "chosen": chosen, "total": total, "surplus": total - T}

def dp_min_surplus(quantities, T):
    """Cross-check (0/1 subset-sum, integer qtl): min sum >= T. O(N*S)."""
    cap = T + max(quantities) + 1
    reach = [False] * cap; reach[0] = True
    for a in quantities:
        for s in range(cap - 1, a - 1, -1):
            if reach[s - a]:
                reach[s] = True
    return next((s - T for s in range(T, cap) if reach[s]), None)
