"""MODULE 3b. Multi-tranche Hold-vs-Sell MILP (PuLP/CBC)."""
import pulp

def solve_hold_sell(Q0, path, delta_day, c, f_sale, q_min, K, R_min=0.0, fee_nwr=0.0,
                    block=30, cash_need=0.0, cash_day=None, absorb=None):
    T = len(path) - 1; theta = 1 - delta_day
    m = pulp.LpProblem("hold_sell", pulp.LpMaximize)
    q = pulp.LpVariable.dicts("q", range(T + 1), lowBound=0)
    I = pulp.LpVariable.dicts("I", range(T + 1), lowBound=0)
    z = pulp.LpVariable.dicts("z", range(T + 1), cat="Binary")
    nb = T // block + 1
    b = pulp.LpVariable.dicts("b", range(nb + 1), cat="Binary")
    w = pulp.LpVariable("w_nwr", cat="Binary")
    m += (pulp.lpSum(path[t] * q[t] for t in range(T + 1))
          - c * pulp.lpSum(I[t] for t in range(0, T))   # stock carried INTO day t+1 pays carry cost
          - f_sale * pulp.lpSum(z.values())
          - R_min * pulp.lpSum(b.values())
          - fee_nwr * w)
    m += I[0] == Q0 - q[0]
    for t in range(1, T + 1):
        m += I[t] == theta * I[t - 1] - q[t]
        m += w >= z[t]
    for t in range(T + 1):
        m += I[t] <= Q0 * b[t // block]           # rent block active if any stock held
        m += q[t] <= Q0 * z[t]
        m += q[t] >= q_min * z[t]
        if absorb is not None:
            m += q[t] <= absorb[t]
    m += pulp.lpSum(z.values()) <= K
    m += I[T] == 0
    if cash_day is not None and cash_need > 0:
        m += pulp.lpSum(path[s] * q[s] for s in range(cash_day + 1)) >= cash_need
    m.solve(pulp.PULP_CBC_CMD(msg=0, timeLimit=30))
    sched = [(t, q[t].value()) for t in range(T + 1) if (q[t].value() or 0) > 1e-6]
    return {"status": pulp.LpStatus[m.status], "profit": pulp.value(m.objective), "schedule": sched}
