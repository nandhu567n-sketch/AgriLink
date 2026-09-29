"""MODULE 3a. Carry cost + closed-form/scan break-even. Per quintal, Rs."""
import numpy as np

def carry_cost_per_qtl_day(s: dict, p_ref: float) -> float:
    """c = rent + insurance + P_ref/365 * [LTV*i_loan + (1-LTV)*i_opp]"""
    rent_d = s["rent_per_qtl_month"] / 30.0
    fin = p_ref / 365.0 * (s["loan_ltv"] * s["loan_interest"] + (1 - s["loan_ltv"]) * s["opportunity_cost"])
    return rent_d + s["insurance_fumigation_per_qtl_day"] + fin

def breakeven_rate(p0: float, delta: float, c: float) -> float:
    """Linearised: hold pays iff price gain g (Rs/qtl/day) >= delta*p0 + c"""
    return delta * p0 + c

def value_curve(path: np.ndarray, delta_day: float, c: float, one_time_per_qtl: float = 0.0):
    """V(t) = theta^t * p_t - c*t - one_time (t>0). V(0)=p_0."""
    t = np.arange(len(path)); theta = 1 - delta_day
    v = theta ** t * path - c * t - np.where(t > 0, one_time_per_qtl, 0.0)
    return t, v

def breakeven_day(path, delta_day, c, one_time_per_qtl=0.0):
    t, v = value_curve(np.asarray(path), delta_day, c, one_time_per_qtl)
    ok = np.where((t > 0) & (v >= v[0]))[0]
    return {"breakeven_day": int(ok[0]) if len(ok) else None,
            "best_day": int(v.argmax()), "best_gain_per_qtl": float(v.max() - v[0]),
            "t": t, "v": v}
