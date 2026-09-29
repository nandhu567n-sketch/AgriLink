"""AgriLink-OR dashboard. Real data only: Karnataka slice of Agriculture_price_dataset.csv.

Pipeline contract: `make history clean` writes data/raw/clean.parquet, `make geocode
distmat` write data/ref/mandis.csv + dist_matrix.parquet. Every module below is a pure
function over those DataFrames -- this file only wires selectors to them.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from src.common.params import load_params
from src.data.farmers import make_lots, to_frame
from src.geo.build_dist_matrix import DEFAULT_FARM, distances_for
from src.m1_econometrics.stl_bands import (coverage, price_path, seasonal_index,
                                          stl_bands, strengths, weekly_series)
from src.m2_arbitrage.nihr import rank_mandis
from src.m3_milp.breakeven import breakeven_day, carry_cost_per_qtl_day
from src.m3_milp.hold_sell import solve_hold_sell
from src.m4_aggregation.knapsack import aggregate, dp_min_surplus

st.set_page_config(page_title="AgriLink-OR", page_icon="\U0001f33e", layout="wide",
                   initial_sidebar_state="expanded")

P = load_params()
PERIOD = 52             # agricultural price seasonality is annual
MIN_WEEKS = 2 * PERIOD  # statsmodels STL requires two complete cycles

RED = "#D7263D"
RED_DK = "#A4162C"
RED_SOFT = "#FFF3F5"
INK = "#171A21"
LINE = "#E9ECF1"
MUTED = "#7A818E"

AL_CSS = r"""
<style>
:root{
  --red:#D7263D; --red-dk:#A4162C; --red-soft:#FFF3F5; --rose:#FDE7EB;
  --ink:#171A21; --sub:#3C4149; --muted:#7A818E; --line:#E9ECF1;
  --bg:#F7F8FA; --ok:#0E9F6E; --r:16px;
  --sh:0 1px 2px rgba(16,24,40,.05), 0 14px 34px -20px rgba(163,27,44,.35);
}
.stApp, [data-testid="stAppViewContainer"]{
  background:
    radial-gradient(1100px 460px at 12% -6%, #FFF0F2 0%, rgba(255,240,242,0) 60%),
    radial-gradient(900px 420px at 98% -4%, #EEF1F6 0%, rgba(238,241,246,0) 55%),
    var(--bg);
}
.stApp{
  font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,"Helvetica Neue",Arial,sans-serif;
  color:var(--ink);
}
[data-testid="stHeader"]{background:transparent}
.block-container{padding-top:1.6rem; padding-bottom:3rem}
h1,h2,h3,h4{color:var(--ink); letter-spacing:-.012em}
[data-testid="stMarkdownContainer"] p{color:var(--sub)}

@keyframes alFadeUp{from{opacity:0; transform:translateY(18px)} to{opacity:1; transform:none}}
@keyframes alFadeIn{from{opacity:0} to{opacity:1}}
@keyframes alPing{0%{transform:scale(.55); opacity:1} 100%{transform:scale(2.3); opacity:0}}
@keyframes alDot{0%{left:0; opacity:0} 12%{opacity:1} 88%{opacity:1} 100%{left:calc(100% - 8px); opacity:0}}
@keyframes alTicker{from{transform:translateX(0)} to{transform:translateX(-50%)}}
@keyframes alGrow{from{transform:scaleX(0)} to{transform:scaleX(1)}}
@keyframes alShine{0%{background-position:-260% 0} 100%{background-position:260% 0}}
.al-anim{animation:alFadeUp .65s cubic-bezier(.22,.7,.3,1) both}

.al-brand{display:flex; gap:12px; align-items:center; background:linear-gradient(135deg,#fff 0%,var(--red-soft) 120%);
  border:1px solid var(--line); border-left:4px solid var(--red); border-radius:14px;
  padding:12px 14px; margin-bottom:10px; box-shadow:var(--sh)}
.al-brand__mark{font-size:1.6rem; background:#fff; border:1px solid var(--rose);
  width:44px; height:44px; display:grid; place-items:center; border-radius:12px}
.al-brand__name{font-weight:800; font-size:1.12rem; letter-spacing:-.02em; color:var(--ink)}
.al-brand__name span{color:var(--red)}
.al-brand__tag{font-size:.72rem; color:var(--muted); letter-spacing:.04em; text-transform:uppercase; font-weight:600}
.al-steps{display:flex; gap:6px; margin-bottom:14px}
.al-steps span{flex:1; text-align:center; font-size:.68rem; font-weight:800; letter-spacing:.08em;
  padding:6px 4px; border-radius:999px; background:#F3F4F7; color:var(--muted); text-transform:uppercase}
.al-steps span.on{background:var(--red); color:#fff; box-shadow:0 6px 14px -8px rgba(215,38,61,.9)}
.al-side-title{font-size:.72rem; font-weight:800; letter-spacing:.16em; text-transform:uppercase;
  color:var(--red-dk); margin:14px 0 6px}
.al-side-note{font-size:.74rem; color:var(--muted); line-height:1.5; background:#fff;
  border:1px dashed var(--rose); border-radius:10px; padding:8px 10px; margin-top:8px}

[data-testid="stSidebar"]{background:#fff !important; border-right:1px solid var(--line)}
[data-testid="stSidebarContent"]{padding-top:.6rem}
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p{font-size:.88rem}
[data-testid="stSidebar"] .stAlert, [data-testid="stSidebar"] [role="alert"]{font-size:.8rem}
[data-testid="stSidebar"] [data-testid="stSlider"] div[role="slider"]{
  background:#fff; border:2px solid var(--red); box-shadow:0 2px 8px -3px rgba(215,38,61,.55)}
[data-testid="stSidebar"] hr{border-color:var(--line)}

.al-hero{background:linear-gradient(140deg,#ffffff 0%,#fff7f8 55%,#fff 100%);
  border:1px solid var(--line); border-radius:22px; padding:30px 34px 26px;
  box-shadow:var(--sh); position:relative; overflow:hidden; margin-bottom:16px;
  animation:alFadeUp .7s cubic-bezier(.22,.7,.3,1) both}
.al-hero::before{content:""; position:absolute; left:0; top:0; bottom:0; width:6px;
  background:linear-gradient(180deg,var(--red),#F0879A); transform-origin:top;
  animation:alGrow .9s .15s cubic-bezier(.22,.7,.3,1) both}
.al-hero::after{content:""; position:absolute; top:-60px; right:-60px; width:230px; height:230px;
  border-radius:50%; background:radial-gradient(circle,rgba(215,38,61,.10),rgba(215,38,61,0) 70%);
  pointer-events:none}
.al-hero__badge{display:inline-block; font-size:.68rem; font-weight:800; letter-spacing:.16em;
  color:var(--red-dk); background:var(--red-soft); border:1px solid var(--rose);
  border-radius:999px; padding:6px 14px; text-transform:uppercase; animation:alFadeIn .5s .1s both}
.al-hero__title{font-size:2.9rem; font-weight:800; margin:14px 0 2px; letter-spacing:-.03em; line-height:1.05}
.al-hero__title span{color:var(--red)}
.al-hero__lede{font-size:1.02rem; line-height:1.65; color:var(--sub); max-width:78ch; margin:.4rem 0 0;
  animation:alFadeUp .7s .12s cubic-bezier(.22,.7,.3,1) both}
.al-hero__lede b{color:var(--red-dk)}

.al-eq{display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:20px;
  animation:alFadeUp .7s .2s cubic-bezier(.22,.7,.3,1) both}
.al-eq__step{background:#fff; border:1px solid var(--line); border-radius:12px;
  padding:8px 13px; font-size:.8rem; color:var(--muted); display:flex; flex-direction:column;
  min-width:96px; transition:transform .2s ease, box-shadow .2s ease}
.al-eq__step:hover{transform:translateY(-3px); box-shadow:0 10px 22px -14px rgba(163,27,44,.6)}
.al-eq__step b{font-size:1.02rem; color:var(--ink); font-weight:800}
.al-eq__step.minus{background:var(--red-soft); border-color:var(--rose)}
.al-eq__step.minus b{color:var(--red-dk)}
.al-eq__step.result{background:linear-gradient(135deg,var(--red),#E8556A); border-color:var(--red);
  box-shadow:0 12px 26px -14px rgba(215,38,61,.85)}
.al-eq__step.result span, .al-eq__step.result b{color:#fff}
.al-eq__op{font-size:1.25rem; font-weight:800; color:var(--red); animation:alFadeIn .6s .35s both}

.al-qgrid{display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; margin-top:22px}
.al-q{background:#fff; border:1px solid var(--line); border-top:3px solid var(--red);
  border-radius:14px; padding:15px 16px; position:relative; overflow:hidden;
  transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  animation:alFadeUp .6s cubic-bezier(.22,.7,.3,1) both}
.al-q:nth-child(1){animation-delay:.26s}
.al-q:nth-child(2){animation-delay:.36s}
.al-q:nth-child(3){animation-delay:.46s}
.al-q:hover{transform:translateY(-6px); box-shadow:0 18px 36px -20px rgba(163,27,44,.55); border-color:var(--red)}
.al-q__ico{font-size:1.3rem}
.al-q__t{font-size:.94rem; font-weight:800; color:var(--red-dk); letter-spacing:.06em; margin:6px 0 4px}
.al-q__d{font-size:.82rem; color:var(--sub); line-height:1.5}
.al-q__m{position:absolute; top:13px; right:14px; font-size:.62rem; font-weight:800;
  letter-spacing:.1em; color:var(--muted); background:#F3F4F7; border-radius:999px; padding:4px 9px}
.al-q__shine{position:absolute; inset:0; background:linear-gradient(110deg,transparent 30%,rgba(215,38,61,.07) 50%,transparent 70%);
  background-size:260% 100%; animation:alShine 4.5s 1.2s linear infinite; pointer-events:none}

.al-pipe{display:flex; align-items:center; flex-wrap:wrap; gap:0; background:#fff;
  border:1px solid var(--line); border-radius:14px; padding:16px 18px; margin-top:16px;
  box-shadow:var(--sh); animation:alFadeUp .7s .5s cubic-bezier(.22,.7,.3,1) both}
.al-pipe__lab{font-size:.64rem; font-weight:800; letter-spacing:.14em; color:var(--muted);
  text-transform:uppercase; width:100%; margin-bottom:10px}
.al-pipe__node{background:var(--red-soft); border:1px solid var(--rose); border-radius:12px;
  padding:8px 12px; min-width:118px; transition:transform .2s ease, box-shadow .2s ease}
.al-pipe__node:hover{transform:translateY(-3px); box-shadow:0 12px 24px -16px rgba(163,27,44,.7)}
.al-pipe__node b{display:block; font-size:.8rem; color:var(--red-dk)}
.al-pipe__node small{font-size:.68rem; color:var(--muted); line-height:1.35; display:block}
.al-pipe__node.start{background:linear-gradient(135deg,var(--red),#E8556A); border-color:var(--red)}
.al-pipe__node.start b, .al-pipe__node.start small{color:#fff}
.al-pipe__node.end{background:#171A21; border-color:#171A21}
.al-pipe__node.end b, .al-pipe__node.end small{color:#fff}
.al-pipe__link{position:relative; flex:1; min-width:44px; height:3px; margin:0 6px;
  background:linear-gradient(90deg,var(--rose),#F6C6CE); border-radius:3px}
.al-pipe__dot{position:absolute; top:50%; width:8px; height:8px; margin-top:-4px; border-radius:50%;
  background:var(--red); box-shadow:0 0 0 3px rgba(215,38,61,.18);
  animation:alDot 2.3s linear infinite}

.al-ticker{overflow:hidden; background:#fff; border:1px solid var(--line);
  border-left:4px solid var(--red); border-radius:12px; padding:9px 0; margin-top:14px}
.al-ticker__track{display:flex; width:max-content; white-space:nowrap;
  animation:alTicker 46s linear infinite; will-change:transform}
.al-ticker:hover .al-ticker__track{animation-play-state:paused}
.al-ticker__item{padding:0 26px; font-size:.72rem; font-weight:700; letter-spacing:.08em;
  text-transform:uppercase; color:var(--muted)}
.al-ticker__item b{color:var(--red-dk)}

.al-sechead{display:flex; align-items:center; gap:12px; margin:26px 0 4px; animation:alFadeIn .5s both}
.al-sechead__t{font-size:1.35rem; font-weight:800; letter-spacing:-.02em}
.al-pulse{width:10px; height:10px; border-radius:50%; background:var(--red); position:relative; flex:none}
.al-pulse::after{content:""; position:absolute; inset:-4px; border-radius:50%;
  border:2px solid rgba(215,38,61,.55); animation:alPing 1.7s ease-out infinite}
.al-badge{font-size:.64rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase;
  color:var(--red-dk); background:var(--red-soft); border:1px solid var(--rose);
  border-radius:999px; padding:5px 12px}
.al-modbadge{display:inline-block; font-size:.63rem; font-weight:800; letter-spacing:.13em;
  text-transform:uppercase; color:#fff; background:linear-gradient(90deg,var(--red),#E8556A);
  border-radius:8px; padding:5px 11px; margin-bottom:8px;
  animation:alFadeUp .5s cubic-bezier(.22,.7,.3,1) both}
.al-insight{background:linear-gradient(90deg,var(--red-soft),#fff 70%); border:1px solid var(--rose);
  border-left:4px solid var(--red); border-radius:12px; padding:12px 16px; font-size:.86rem;
  color:var(--sub); line-height:1.6; margin:12px 0 2px; animation:alFadeUp .55s .1s both}
.al-insight b{color:var(--red-dk)}
.al-note{background:#fff; border:1px solid var(--line); border-left:4px solid var(--red);
  border-radius:12px; padding:12px 16px; font-size:.85rem; color:var(--sub); line-height:1.6;
  margin:6px 0 14px; animation:alFadeUp .5s both}
.al-note b{color:var(--red-dk)}

[data-testid="stMetric"]{background:#fff; border:1px solid var(--line); border-top:3px solid var(--red);
  border-radius:var(--r); padding:16px 18px 14px; box-shadow:var(--sh);
  transition:transform .25s ease, box-shadow .25s ease; animation:alFadeUp .6s both;
  height:100%}
[data-testid="stMetric"]:nth-of-type(2){animation-delay:.08s}
[data-testid="stMetric"]:hover{transform:translateY(-5px); box-shadow:0 22px 40px -24px rgba(163,27,44,.6)}
[data-testid="stMetricLabel"]{font-size:.68rem !important; font-weight:800 !important;
  letter-spacing:.14em !important; text-transform:uppercase !important; color:var(--muted) !important}
[data-testid="stMetricValue"]{font-size:1.75rem !important; font-weight:800 !important; color:var(--ink) !important}
[data-testid="stMetricDelta"]{font-size:.8rem !important}

[data-baseweb="tab-list"]{gap:8px; background:transparent; border-bottom:1px solid var(--line);
  padding-bottom:8px}
[data-baseweb="tab"]{background:#fff !important; border:1px solid var(--line) !important;
  border-radius:999px !important; padding:8px 18px !important; font-weight:700 !important;
  font-size:.86rem !important; color:var(--muted) !important; transition:all .22s ease !important}
[data-baseweb="tab"]:hover{color:var(--red-dk) !important; border-color:#F4B9C2 !important;
  transform:translateY(-2px)}
[data-baseweb="tab"][aria-selected="true"]{background:linear-gradient(180deg,#fff,var(--red-soft)) !important;
  color:var(--red-dk) !important; border-color:var(--red) !important;
  box-shadow:0 10px 22px -16px rgba(215,38,61,.9) !important}
[data-baseweb="tab-highlight"]{display:none !important}
[data-baseweb="tab-border"]{display:none !important}

.stPlotlyChart{background:#fff; border:1px solid var(--line); border-radius:var(--r);
  box-shadow:var(--sh); overflow:hidden; animation:alFadeUp .6s both}
[data-testid="stDataFrame"], [data-testid="stDataFrameContainer"]{border:1px solid var(--line);
  border-radius:12px; overflow:hidden}
[data-testid="stExpander"]{background:#fff; border:1px solid var(--line); border-radius:var(--r);
  box-shadow:var(--sh); overflow:hidden; margin-bottom:10px}
[data-testid="stExpander"] summary{font-weight:700 !important}
.stAlert{border-radius:12px !important; border-left-width:4px !important}
.stButton>button{border-radius:10px; border:1px solid var(--line); background:#fff;
  font-weight:700; transition:all .2s ease}
.stButton>button:hover{border-color:var(--red); color:var(--red-dk);
  box-shadow:0 10px 22px -14px rgba(215,38,61,.8); transform:translateY(-1px)}
.stButton>button[kind="primary"]{background:var(--red); border-color:var(--red); color:#fff}
.stDownloadButton>button{border-radius:10px; background:var(--red); border-color:var(--red); color:#fff}
.stPlotlyChart [class*="modebar"]{top:6px !important; right:8px !important}

.al-foot{margin-top:34px; border-top:1px solid var(--line); padding-top:14px;
  display:flex; flex-wrap:wrap; gap:14px; align-items:center; animation:alFadeIn .6s both}
.al-foot__brand{font-weight:800; color:var(--ink)}
.al-foot__brand span{color:var(--red)}
.al-foot__t{font-size:.76rem; color:var(--muted)}

@media (prefers-reduced-motion: reduce){
  *{animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important}
}
</style>
"""

st.markdown(AL_CSS, unsafe_allow_html=True)


def _html(s):
    st.markdown(s, unsafe_allow_html=True)


# ---------------------------------------------------------------- data access
@st.cache_data(show_spinner="Loading Karnataka price history...")
def load_clean():
    p = pathlib.Path("data/raw/clean.parquet")
    if not p.exists():
        st.error("data/raw/clean.parquet is missing. Run: `make history clean`")
        st.stop()
    return pd.read_parquet(p)


@st.cache_data(show_spinner="Loading mandi coordinates...")
def load_mandis():
    p = pathlib.Path("data/ref/mandis.csv")
    if not p.exists():
        st.error("data/ref/mandis.csv is missing. Run: `make geocode`")
        st.stop()
    return pd.read_csv(p).dropna(subset=["lat", "lon"])


@st.cache_data
def stl_eligible(df, crop, variety, as_of):
    """Mandis whose weekly grid for this crop/variety spans two full annual cycles, judged
    on data available *up to* `as_of` so the whole app is a point-in-time view.
    `variety=None` judges the pooled series across every variety of the crop.

    Ordered least-interpolated first, so the default reference mandi is the best-observed
    series rather than whatever sorts first alphabetically (Channarayapatna is 67% imputed,
    Davangere 11%).
    """
    sub = view_of(df, crop, variety, as_of=as_of)
    scored = []
    for m, g in sub.groupby("market"):
        c = coverage(g)
        if c["weeks"] >= MIN_WEEKS:
            scored.append((m, c["imputed_frac"]))
    return [m for m, _ in sorted(scored, key=lambda t: (t[1], t[0]))]


@st.cache_data
def latest_prices(df, crop, variety, as_of, window_days=14):
    """Latest board price per mandi, medianed over the `window_days` ending at `as_of`.

    A window rather than a single day, because mandis skip days and taking only `as_of`
    would discard every mandi that did not report that day. `variety=None` pools all
    varieties of the crop.
    """
    sub = view_of(df, crop, variety, as_of=as_of)
    cutoff = pd.Timestamp(as_of) - pd.Timedelta(days=window_days)
    in_win = sub[(sub["date"] >= cutoff) & (sub["date"] <= pd.Timestamp(as_of))]
    return in_win.groupby("market")["modal_price"].median().dropna()


@st.cache_data
def solve_hold_sell_cached(Q, path_tuple, delta_day, c, f_sale, q_min, K, fee):
    """CBC on a 200-odd day horizon is slow enough to cache on the slider tuple."""
    return solve_hold_sell(Q, np.asarray(path_tuple), delta_day, c, f_sale,
                           q_min, K, fee_nwr=fee)


def view_of(df, crop, variety, market=None, as_of=None):
    """Rows in scope for the current selectors. `variety` of None or "All" pools every
    variety of the crop. `as_of` cuts the history so every module sees the same
    point-in-time world."""
    m = df["commodity"] == crop
    if variety is not None and variety != "All":
        m &= df["variety"] == variety
    if market:
        m &= df["market"] == market
    if as_of is not None:
        m &= df["date"] <= pd.Timestamp(as_of)
    return df[m]


# ------------------------------------------------------------------- sections
def render_hero(rank, sel, DF, as_of, Q):
    eq = ""
    if len(rank):
        top = rank.iloc[0]
        s = P["freight"]["transit_shrink_per_km"] * float(top["km"])
        loss = s * float(top["board_price"])
        frt = float(top["freight"]) / Q
        fee = float(top["fees"]) / Q
        hdl = float(top["handling"]) / Q
        eq = f"""<div class="al-eq">
  <div class="al-eq__step"><span>Board price (mandi quote)</span><b>&#8377;{top['board_price']:,.0f}</b></div>
  <div class="al-eq__op">&minus;</div>
  <div class="al-eq__step minus"><span>transit loss</span><b>&#8377;{loss:,.0f}</b></div>
  <div class="al-eq__op">&minus;</div>
  <div class="al-eq__step minus"><span>freight</span><b>&#8377;{frt:,.0f}</b></div>
  <div class="al-eq__op">&minus;</div>
  <div class="al-eq__step minus"><span>cess + handling</span><b>&#8377;{fee + hdl:,.0f}</b></div>
  <div class="al-eq__op">=</div>
  <div class="al-eq__step result"><span>NET IN HAND</span><b>&#8377;{top['net_per_qtl']:,.0f}/qtl</b></div>
</div>"""
    else:
        eq = """<div class="al-eq">
  <div class="al-eq__step"><span>Board price</span><b>&#8377;?</b></div>
  <div class="al-eq__op">&minus;</div>
  <div class="al-eq__step minus"><span>freight + fees</span><b>&#8377;?</b></div>
  <div class="al-eq__op">=</div>
  <div class="al-eq__step result"><span>NET IN HAND</span><b>&#8377;?/qtl</b></div>
</div>"""

    n_mandis = DF["market"].nunique()
    n_crops = DF["commodity"].nunique()
    first, last = DF["date"].min(), DF["date"].max()
    _html(f"""<section class="al-hero">
  <div class="al-hero__badge">Decision support &middot; Farmer Producer Organisations &middot; real Agmarknet data</div>
  <h1 class="al-hero__title">AgriLink<span>-OR</span></h1>
  <p class="al-hero__lede">An FPO asks the same hard question every week &mdash; <b>sell today or hold?</b>
  If we hold, <b>where</b> and <b>when</b>? The number on the mandi board cannot answer that: it ignores
  freight, cess, handling and transit loss, so the highest quoted price is often <i>not</i> the most money
  in hand. AgriLink-OR walks the cash out of the pocket quintal by quintal with four deterministic
  operations-research modules &mdash; <b>no machine learning, every number traceable</b> &mdash; and returns
  three answers from {len(sel):,} live-in-view price rows across {sel['market'].nunique()} mandis.</p>
  {eq}
  <div class="al-qgrid">
    <div class="al-q"><div class="al-q__shine"></div><span class="al-q__m">M2</span><div class="al-q__ico">&#127919;</div>
      <div class="al-q__t">SELL AT</div>
      <div class="al-q__d">Which mandi leaves the most &#8377; in hand after freight, cess, handling and
      transit loss &mdash; not which quotes the highest price.</div></div>
    <div class="al-q"><div class="al-q__shine"></div><span class="al-q__m">M3</span><div class="al-q__ico">&#9203;</div>
      <div class="al-q__t">HOLD?</div>
      <div class="al-q__d">Is storing worth it? On which day does holding beat selling now, once rent,
      financing and spoilage (&#952;<sup>t</sup>) are charged?</div></div>
    <div class="al-q"><div class="al-q__shine"></div><span class="al-q__m">M4</span><div class="al-q__ico">&#128230;</div>
      <div class="al-q__t">BULK ORDER</div>
      <div class="al-q__d">Which farmers' lots fill a buyer's large order with the least surplus and no
      single farm dominating?</div></div>
  </div>
  <div class="al-pipe">
    <div class="al-pipe__lab">The pipeline &mdash; every stage is a pure function, tested, no fitted model</div>
    <div class="al-pipe__node start"><b>&#128202; Data</b><small>Agmarknet dump &rarr; cleaned Karnataka slice</small></div>
    <div class="al-pipe__link"><span class="al-pipe__dot" style="animation-delay:0s"></span></div>
    <div class="al-pipe__node"><b>M1 &middot; STL</b><small>seasonal bands, GLUT/SPIKE flags, price path p(d)</small></div>
    <div class="al-pipe__link"><span class="al-pipe__dot" style="animation-delay:.35s"></span></div>
    <div class="al-pipe__node"><b>M2 &middot; Net in hand</b><small>rank mandis after every cost</small></div>
    <div class="al-pipe__link"><span class="al-pipe__dot" style="animation-delay:.7s"></span></div>
    <div class="al-pipe__node"><b>M3 &middot; Hold vs sell</b><small>break-even day + multi-tranche MILP</small></div>
    <div class="al-pipe__link"><span class="al-pipe__dot" style="animation-delay:1.05s"></span></div>
    <div class="al-pipe__node"><b>M4 &middot; Knapsack</b><small>fill the bulk order, minimise surplus</small></div>
    <div class="al-pipe__link"><span class="al-pipe__dot" style="animation-delay:1.4s"></span></div>
    <div class="al-pipe__node end"><b>&#127919; Decision</b><small>three cards, five drill-down tabs</small></div>
  </div>
</section>""")

    bits = [
        f'<span class="al-ticker__item">Dataset <b>{len(DF):,}</b> rows</span>',
        f'<span class="al-ticker__item"><b>{n_mandis}</b> mandis</span>',
        f'<span class="al-ticker__item"><b>{DF["district"].nunique()}</b> districts</span>',
        f'<span class="al-ticker__item"><b>{n_crops}</b> crops</span>',
        f'<span class="al-ticker__item">Coverage <b>{first:%d %b %Y} &rarr; {last:%d %b %Y}</b></span>',
        f'<span class="al-ticker__item">View as of <b>{pd.Timestamp(as_of):%d %b %Y}</b></span>',
        '<span class="al-ticker__item">Stack <b>STL + MILP + knapsack</b></span>',
        '<span class="al-ticker__item"><b>No ML</b> &middot; deterministic &middot; tested</span>',
        '<span class="al-ticker__item">Every assumption lives in <b>params.yaml</b></span>',
        f'<span class="al-ticker__item">Lot volume <b>{Q} qtl</b></span>',
    ]
    track = "".join(bits * 2)
    _html(f'<div class="al-ticker"><div class="al-ticker__track">{track}</div></div>')


def render_tour():
    with st.expander("New here? Take the 60-second tour of this dashboard"):
        _html("""<div class="al-qgrid">
  <div class="al-q"><span class="al-q__m">Step 1</span><div class="al-q__t">SET THE WORLD</div>
    <div class="al-q__d">Sidebar &rarr; <b>Crop</b>, <b>Variety</b> and <b>Price as of</b> decide what
    data every module sees. The date makes the page point-in-time: move it back and you replay a past
    decision on what was known then.</div></div>
  <div class="al-q"><span class="al-q__m">Step 2</span><div class="al-q__t">READ THREE CARDS</div>
    <div class="al-q__d"><b>SELL AT</b> picks the mandi with the highest net realisation.
    <b>HOLD</b> prices storage against the projected path. <b>BULK ORDER</b> fills the buyer's tonnage.
    Each card names the module behind it.</div></div>
  <div class="al-q"><span class="al-q__m">Step 3</span><div class="al-q__t">DRILL INTO THE TABS</div>
    <div class="al-q__d">Where the path comes from (STL), where the money goes (cost walk + map),
    why holding costs real cash (V(t) curve), and how the order is packed (farmer lots).</div></div>
  <div class="al-q"><span class="al-q__m">Step 4</span><div class="al-q__t">ARGUE WITH IT</div>
    <div class="al-q__d">Every cost is a slider: diesel, rent, shrink, cess, LTV. They override
    <b>data/ref/params.yaml</b> for this session only, so you can test your own contract rates.</div></div>
</div>""")


def render_map(rank, farm_lat, farm_lon):
    try:
        import folium
        from streamlit_folium import st_folium
    except ImportError:
        st.caption("Install folium + streamlit-folium for the map.")
        return
    if rank.empty or rank["lat"].isna().all():
        st.caption("No located mandis to map.")
        return

    def shade(t):
        g = np.array([22, 163, 74])
        r = np.array([215, 38, 61])
        return "#%02x%02x%02x" % tuple((g + (r - g) * t).astype(int))

    f = folium.Map(location=[farm_lat, farm_lon], zoom_start=7, tiles="OpenStreetMap")
    f.get_root().header.add_child(folium.Element("""<style>
      .leaflet-div-icon.al-origin{background:none; border:none}
      .al-origin__pin{position:relative; width:16px; height:16px}
      .al-origin__pin i{position:absolute; inset:0; border-radius:50%; background:#D7263D;
        box-shadow:0 0 0 2.5px #fff, 0 3px 10px rgba(215,38,61,.7)}
      .al-origin__pin i::after{content:""; position:absolute; inset:-5px; border-radius:50%;
        border:2.5px solid rgba(215,38,61,.55); animation:alMapPing 1.7s ease-out infinite}
      .al-origin__pin i.p2::after{animation-delay:.85s}
      @keyframes alMapPing{0%{transform:scale(.5); opacity:1} 100%{transform:scale(2.6); opacity:0}}
      .al-legend{position:absolute; top:10px; right:10px; z-index:9999; background:#fff;
        border:1px solid #E9ECF1; border-left:3px solid #D7263D; border-radius:10px;
        padding:8px 12px; font:700 11px/1.7 "Segoe UI",sans-serif; color:#3C4149;
        box-shadow:0 8px 20px -10px rgba(0,0,0,.35)}
      .al-legend div{display:flex; align-items:center; gap:7px}
      .al-legend b{width:9px; height:9px; border-radius:50%; display:inline-block}
    </style>"""))
    f.get_root().html.add_child(folium.Element(
        '<div class="al-legend">'
        '<div><b style="background:#16a34a"></b> best net realisation</div>'
        '<div><b style="background:#d7263d"></b> worst net realisation</div>'
        '<div><b style="background:#d7263d; box-shadow:0 0 0 2px #fff,0 0 0 4px rgba(215,38,61,.35)"></b> FPO origin</div>'
        '</div>'))
    folium.Marker(
        [farm_lat, farm_lon], tooltip="FPO origin (ship-from point)", popup="FPO origin",
        icon=folium.DivIcon(html='<div class="al-origin__pin"><i></i><i class="p2"></i></div>',
                            icon_size=(16, 16), icon_anchor=(8, 8),
                            class_name="al-origin")).add_to(f)
    lo, hi = rank["net_per_qtl"].min(), rank["net_per_qtl"].max()
    span = max(hi - lo, 1e-6)
    for _, r in rank.dropna(subset=["lat"]).iterrows():
        colour = shade((r["net_per_qtl"] - lo) / span)
        folium.CircleMarker(
            [r["lat"], r["lon"]],
            radius=7, color="#ffffff", weight=2, fill=True, fill_color=colour,
            fill_opacity=0.9,
            tooltip=(f"{r['market']} ({r['district']})<br>"
                     f"net Rs {r['net_per_qtl']:,.0f}/qtl<br>"
                     f"board Rs {r['board_price']:,.0f} \u00b7 {r['km']:.0f} km"),
            popup=(f"<b>{r['market']}</b><br>net Rs {r['net_per_qtl']:,.0f}/qtl<br>"
                   f"board rank #{int(r['rank_board'])}<br>vs nearest Rs "
                   f"{r['arbitrage_vs_nearest']:,.0f}"),
        ).add_to(f)
    st_folium(f, width="stretch", height=460)


def rank_reveal_figure(rank):
    r = rank.sort_values("net_per_qtl", ascending=True)
    cats = r["market"].tolist()
    vals = r["net_per_qtl"].tolist()
    hot, pale = RED, "#F7CFD6"
    base = dict(orientation="h", textposition="outside",
                textfont=dict(size=11, color="#3C4149"),
                cliponaxis=False, hovertemplate="%{y}: Rs %{x:,.0f}/qtl<extra></extra>")
    fig = go.Figure(go.Bar(x=vals, y=cats, marker=dict(color=[hot] * len(vals)),
                           text=[f"{v:,.0f}" for v in vals], name="Net Rs/qtl", **base))
    frames = []
    n = len(cats)
    for k in range(1, n + 1):
        cols = [hot] * k + [pale] * (n - k)
        frames.append(go.Frame(
            name=str(k),
            data=[go.Bar(x=vals, y=cats, marker=dict(color=cols),
                         text=[f"{v:,.0f}" for v in vals], name="Net Rs/qtl", **base)]))
    hi = max(vals) if vals else 1
    fig.update_layout(
        height=max(360, 34 * n + 120), bargap=0.35, showlegend=False,
        xaxis=dict(title="net realisation (Rs/quintal) after every cost",
                   range=[0, hi * 1.16], gridcolor="#F1F3F6"),
        yaxis=dict(title="", automargin=True),
        margin=dict(l=10, r=70, t=34, b=96), plot_bgcolor="#fff",
        font=dict(family="Segoe UI, sans-serif"),
        updatemenus=[dict(type="buttons", direction="left", x=0.004, y=0.006,
                          xanchor="left", yanchor="bottom",
                          bgcolor="#fff", bordercolor=LINE,
                          font=dict(color=RED_DK, size=11),
                          buttons=[
            dict(label="\u25b6  Rank reveal", method="animate",
                 args=[None, dict(frame=dict(duration=110, redraw=True),
                                  transition=dict(duration=260),
                                  fromcurrent=True, mode="immediate")]),
            dict(label="\u23f8  Pause", method="animate",
                 args=[None, dict(frame=dict(duration=0), mode="immediate")]),
            dict(label="\u21ba  Show all", method="animate",
                 args=[[str(n)], dict(frame=dict(duration=0), mode="immediate")]),
        ])])
    fig.frames = frames
    return fig


def projection_scan_figure(m1, path, proj, conservative_note=""):
    xs = list(proj.to_pydatetime())
    fig = go.Figure()
    fig.add_scatter(x=m1.index, y=m1["price"], name="price", line=dict(width=2, color=INK))
    fig.add_scatter(x=m1.index, y=np.exp(m1["trend"]), name="trend",
                    line=dict(dash="dash", color="#8A93A3"))
    fig.add_scatter(x=m1.index, y=np.exp(m1["trend"] + m1["seasonal"]),
                    name="trend + seasonal", line=dict(dash="dot", color="#B9C0CC"))
    fig.add_scatter(x=m1.index, y=m1["upper"], name="upper band",
                    line=dict(width=1, color="rgba(215,38,61,.35)"))
    fig.add_scatter(x=m1.index, y=m1["lower"], name="lower band",
                    line=dict(width=1, color="rgba(215,38,61,.35)"),
                    fill="tonexty", fillcolor="rgba(215,38,61,.07)")
    for flag, colour, sym in (("GLUT", RED, "x"), ("SPIKE", "#0E9F6E", "x")):
        g = m1[m1["flag"] == flag]
        fig.add_scatter(x=g.index, y=g["price"], mode="markers", name=f"{flag} weeks",
                        marker=dict(size=12, color=colour, symbol=sym))
    fig.add_scatter(x=proj, y=path, name="projected p(d)",
                    line=dict(width=2.5, color=RED), fill="tozeroy",
                    fillcolor="rgba(215,38,61,.06)")
    fig.add_scatter(x=[xs[0]], y=[path[0]], mode="markers", showlegend=False,
                    hoverinfo="skip", name="cursor",
                    marker=dict(size=14, color="#fff", line=dict(color=RED, width=3)))
    fig.update_layout(height=540, hovermode="x unified",
                      legend=dict(orientation="h", x=0, xanchor="left", y=1, yanchor="top"),
                      yaxis_title="Rs/quintal", xaxis_title="week ending",
                      margin=dict(l=10, r=20, t=46, b=96), plot_bgcolor="#fff",
                      font=dict(family="Segoe UI, sans-serif"),
                      xaxis=dict(gridcolor="#F1F3F6"), yaxis=dict(gridcolor="#F1F3F6"))
    if len(path) > 3:
        base = [t.to_plotly_json() for t in fig.data]
        step = max(1, len(path) // 30)
        frames = []
        for k in list(range(step, len(path), step)) + [len(path) - 1]:
            data = [dict(b) for b in base[:-1]]
            cur = dict(base[-1])
            cur["x"] = [xs[k]]
            cur["y"] = [float(path[k])]
            data.append(cur)
            frames.append(go.Frame(
                name=str(k), data=[go.Scatter(**d) for d in data],
                layout=dict(shapes=[dict(type="line", x0=xs[k], x1=xs[k],
                                          y0=0, y1=1, yref="paper",
                                          line=dict(color="rgba(215,38,61,.55)", dash="dot"))])))
        fig.frames = frames
        fig.update_layout(
            updatemenus=[dict(type="buttons", direction="left", x=0.004, y=0.006,
                              xanchor="left", yanchor="bottom",
                              bgcolor="#fff", bordercolor=LINE,
                              font=dict(color=RED_DK, size=11),
                              buttons=[
                dict(label="\u25b6  Play projection", method="animate",
                     args=[None, dict(frame=dict(duration=90, redraw=True),
                                      transition=dict(duration=60),
                                      fromcurrent=True, mode="immediate")]),
                dict(label="\u23f8  Pause", method="animate",
                     args=[None, dict(frame=dict(duration=0), mode="immediate")]),
            ])])
    return fig


# ------------------------------------------------------------------- sidebar
sb = st.sidebar
sb.markdown("""<div class="al-brand">
  <div class="al-brand__mark">&#127806;</div>
  <div><div class="al-brand__name">AgriLink<span>-OR</span></div>
  <div class="al-brand__tag">Mandi decisions for FPOs</div></div>
</div>
<div class="al-steps"><span class="on">1 &middot; Pick</span><span>2 &middot; Decide</span><span>3 &middot; Drill</span></div>
<div class="al-side-title">Selection</div>""", unsafe_allow_html=True)

DF = load_clean()
crops = sorted(DF["commodity"].unique())
crop = sb.selectbox("Crop", crops, index=crops.index(P["crop"]) if P["crop"] in crops else 0)
varieties = sorted(DF[DF["commodity"] == crop]["variety"].unique().tolist())
variety = sb.selectbox("Variety", ["All"] + varieties,
                       help="Pools every variety reported at the mandi. Picking one "
                            "variety usually leaves too few weeks for an annual STL.")

as_of = sb.date_input("Price as of", value=DF["date"].max().date(),
                      min_value=DF["date"].min().date(), max_value=DF["date"].max().date(),
                      help="Point-in-time cut. The whole dashboard is evaluated on data "
                           "up to this date, so you can replay a past decision.")
price_window = sb.slider("Quote window (days)", 1, 60, 14,
                         help="Board prices are the median over this many days ending at "
                              "'Price as of'. Mandis skip days, so a single day would drop "
                              "most of them.")
eligible = stl_eligible(DF, crop, None if variety == "All" else variety, as_of)

sb.markdown("""<div class="al-side-title">Decision inputs</div>
<div class="al-side-note">These feed all three modules at once: volume drives freight and
the knapsack, horizon drives hold-vs-sell.</div>""", unsafe_allow_html=True)
Q = sb.slider("Crop volume (qtl)", 10, 1000, 200, 10)
horizon = sb.slider("Horizon (days)", 30, 240, 180, 10)
conservative = sb.checkbox("Conservative (project on lower band)", False)
n_farmers = sb.slider("Farmers in pool", 5, 60, 25, 5)
target_order = sb.slider("Bulk order (qtl)", 50, 1000, 400, 10)

sb.markdown("""<div class="al-side-title">Cost assumptions</div>
<div class="al-side-note">Session overrides of <b>data/ref/params.yaml</b>. Every rate there is an
assumption until its <b>source:</b> line is filled in.</div>""", unsafe_allow_html=True)
P["storage"]["rent_per_qtl_month"] = sb.slider(
    "Warehouse rent (Rs/qtl/month)", 0.0, 20.0, float(P["storage"]["rent_per_qtl_month"]), 0.5)
P["freight"]["diesel_price"] = sb.slider(
    "Diesel (Rs/litre)", 70.0, 130.0, float(P["freight"]["diesel_price"]), 1.0)
P["storage"]["loan_interest"] = sb.slider(
    "Pledge loan interest (%/yr)", 4.0, 16.0, P["storage"]["loan_interest"] * 100, 0.5) / 100
P["storage"]["loan_ltv"] = sb.slider(
    "Loan-to-value (%)", 0, 90, int(P["storage"]["loan_ltv"] * 100)) / 100
P["storage"]["shrink_per_month"] = sb.slider(
    "Shrink (%/month)", 0.0, 5.0, P["storage"]["shrink_per_month"] * 100, 0.1) / 100
market_fees = sb.slider(
    "Cess + commission (%)", 0.0, 5.0,
    (P["market"]["cess_frac"] + P["market"]["commission_frac"]) * 100, 0.1) / 100
P["market"]["cess_frac"] = market_fees
P["market"]["commission_frac"] = 0.0

farm_lat = sb.slider("Farm latitude", 11.5, 18.5, float(DEFAULT_FARM["lat"]), 0.05)
farm_lon = sb.slider("Farm longitude", 74.0, 78.5, float(DEFAULT_FARM["lon"]), 0.05)

sb.markdown("""<div class="al-side-note" style="border-style:solid">
<b>No ML.</b> STL decomposition, net-in-hand arithmetic, a CBC MILP and a bounded knapsack
&mdash; all deterministic, all unit-tested (43 tests).</div>""", unsafe_allow_html=True)


# ------------------------------------------------------------------ module 2
mandis = load_mandis()
sel = view_of(DF, crop, variety, as_of=as_of)
prices = latest_prices(DF, crop, None if variety == "All" else variety,
                       as_of=as_of, window_days=price_window)
crop_mandis = DF[(DF["commodity"] == crop) & (DF["date"] <= pd.Timestamp(as_of))]
n_quoting = len(prices)

dist_km = distances_for(farm_lat, farm_lon, mandis)
rank = rank_mandis(Q, prices, dist_km, P)
rank = rank.merge(mandis[["market", "district", "lat", "lon", "source"]], on="market", how="left")

# ------------------------------------------------------------------- headline
render_hero(rank, sel, DF, as_of, Q)
render_tour()

with st.expander("Data provenance and freshness", expanded=True):
    last = DF["date"].max()
    age = (pd.Timestamp.today().normalize() - last).days
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Karnataka rows", f"{len(DF):,}")
    c2.metric("Coverage", f"{DF['date'].min():%b %Y} → {last:%b %Y}")
    c3.metric("Mandis", f"{DF['market'].nunique()}")
    c4.metric("Data age", f"{age} days")
    st.write(f"In view as of **{pd.Timestamp(as_of):%d %b %Y}**: **{len(sel):,}** rows "
             f"across **{sel['market'].nunique()}** mandis, "
             f"**{sel['district'].nunique()}** districts.")
    if age > 30:
        st.warning(
            f"Latest observation in this dump is **{last:%d %b %Y}**, {age} days before "
            "today. The projection is a seasonal-trend model fitted to that history, not a "
            "live quote. Re-run `make history clean` on a fresh dump before acting.",
            icon="⚠️")
    st.caption("This dump has no arrivals column, so GLUT/SPIKE flags come from the STL "
               "residual z-score, not from arrival volumes.")

if n_quoting < crop_mandis["market"].nunique():
    st.caption(
        f"**{n_quoting} of {crop_mandis['market'].nunique()}** {crop} mandis reported a "
        f"price in the {price_window}-day window ending {pd.Timestamp(as_of):%d %b %Y}; "
        f"the rest last quoted earlier and are excluded. Widen the window to include them, "
        "or move 'Price as of' back to a date when more mandis were active.")

# ------------------------------------------------------------------ module 1
m1 = path = ref_mandi = weekly = cov = None
if eligible:
    ref_mandi = st.selectbox("Reference mandi (price path basis)", eligible,
                             help="The mandi whose weekly series is decomposed into the "
                                  "price path p(d). Defaults to the least-interpolated series.")
    ref_df = view_of(DF, crop, variety, ref_mandi, as_of=as_of)
    cov = coverage(ref_df)
    weekly = weekly_series(ref_df)
    m1 = stl_bands(weekly, period=PERIOD)
    path = price_path(m1, days=horizon, use_lower=conservative)
    if cov["imputed_frac"] > 0.25:
        st.warning(f"{ref_mandi} weekly grid is {cov['imputed_frac']:.0%} interpolated "
                   f"({cov['observed']}/{cov['weeks']} weeks reported). Treat bands as soft.")
else:
    st.error(
        f"**{crop}** has no mandi with two full annual cycles by {pd.Timestamp(as_of):%d %b %Y} "
        f"(needs {MIN_WEEKS} weekly points at {PERIOD}-week seasonality). Tomato, Wheat and "
        "Rice are reported in this dump as a single partial season, so an annual "
        "decomposition is not estimable; hold-vs-sell is disabled rather than fitted to "
        "noise. Onion and Potato do support it.")

# ------------------------------------------------------------------ module 3
be = milp = c_day = None
if path is not None:
    s = P["storage"]
    delta_day = s["shrink_per_month"] / 30
    c_day = carry_cost_per_qtl_day(s, float(path[0]))
    be = breakeven_day(path, delta_day, c_day,
                       (s["enwr_fee_total"] + s["sale_fixed_cost"]) / Q)
    milp = solve_hold_sell_cached(Q, tuple(path.round(4)), delta_day, c_day,
                                  s["sale_fixed_cost"], Q * 0.1, 3, s["enwr_fee_total"])

# ------------------------------------------------------------------ module 4
lots = make_lots(mandis, prices, crop, n_farmers=n_farmers, seed=11)
for l in lots:
    l["km"] = float(dist_km.get(l["market"], np.nan))
lots = [l for l in lots if np.isfinite(l["km"])]
agg = aggregate(lots, target_order, eps=0.03, max_share=0.4) if lots else None
dp_cross = dp_min_surplus([l["qty"] * l["count"] for l in lots], target_order) if lots else None


# ------------------------------------------------------------ decision cards
_html("""<div class="al-sechead"><span class="al-pulse"></span>
<div class="al-sechead__t">Recommendation</div>
<span class="al-badge">3 questions &middot; 3 modules &middot; 1 view</span></div>""")
c1, c2, c3 = st.columns(3)

with c1:
    _html('<div class="al-modbadge">M2 &middot; net-in-hand arbitrage</div>')
    if len(rank):
        top = rank.iloc[0]
        st.metric("SELL AT", str(top["market"]),
                  f"net Rs {top['net_per_qtl']:,.0f}/qtl \u00b7 {top['km']:.0f} km")
        st.caption(f"Board Rs {top['board_price']:,.0f} (rank #{int(top['rank_board'])}), "
                   f"Rs {top['arbitrage_vs_nearest']:,.0f} better than the nearest mandi.")
    else:
        st.metric("SELL AT", "n/a", "no recent quotes in view")

with c2:
    _html('<div class="al-modbadge">M3 &middot; break-even + MILP</div>')
    if be is None:
        st.metric("HOLD?", "n/a", f"no {crop} price path")
    elif be["breakeven_day"] is None:
        st.metric("HOLD?", "SELL NOW", "no break-even inside horizon")
    else:
        st.metric("HOLD", f"{be['best_day']} days",
                  f"break-even d{be['breakeven_day']} · gain Rs "
                  f"{be['best_gain_per_qtl']:,.0f}/qtl")
    if milp and milp["profit"] is not None:
        st.caption(f"Carry Rs {c_day:.2f}/qtl/day · MILP {milp['status']} · "
                   f"objective Rs {milp['profit']:,.0f}")
    elif milp:
        st.caption(f"Carry Rs {c_day:.2f}/qtl/day · MILP {milp['status']} (no solution)")

with c3:
    _html('<div class="al-modbadge">M4 &middot; bounded knapsack</div>')
    if agg and agg["status"] == "Optimal":
        st.metric("BULK ORDER", f"{agg['total']:,} qtl",
                  f"surplus {agg['surplus']} qtl · {len(agg['chosen'])} farmers")
        if dp_cross is not None:
            st.caption(f"DP cross-check surplus {dp_cross} qtl "
                       f"({'agrees' if dp_cross == agg['surplus'] else 'differs'}).")
    elif agg:
        st.metric("BULK ORDER", "n/a",
                  f"{agg['status']}: pool holds "
                  f"{sum(l['qty'] * l['count'] for l in lots):,} qtl")
    else:
        st.metric("BULK ORDER", "n/a", "no farmer pool")

if len(rank):
    top = rank.iloc[0]
    best_board = rank.loc[rank["board_price"].idxmax()]
    if best_board["market"] != top["market"]:
        gap = top["net_per_qtl"] - best_board["net_per_qtl"]
        _html(f"""<div class="al-insight">&#128161; <b>Board price is not money in hand.</b>
The highest quote is <b>{best_board['market']}</b> at Rs {best_board['board_price']:,.0f}/qtl, but after
freight and fees it nets Rs {best_board['net_per_qtl']:,.0f}. Shipping to <b>{top['market']}</b> instead puts
<b>Rs {gap:,.0f}/qtl more</b> in the FPO's pocket &mdash; that gap <i>is</i> the arbitrage this module hunts.</div>""")
    else:
        _html(f"""<div class="al-insight">&#128161; <b>Board price is not money in hand.</b>
Here the highest quote (<b>{top['market']}</b>, Rs {top['board_price']:,.0f}/qtl) also survives every cost and
stays the winner at Rs {top['net_per_qtl']:,.0f}/qtl net. Watch the ranking diverge as diesel or distance moves.</div>""")


# --------------------------------------------------------------------- tabs
t1, t2, t3, t4, t5 = st.tabs(["Market (STL)", "Where to sell", "Hold vs Sell",
                              "Aggregate", "Inputs"])

with t1:
    _html("""<div class="al-note"><b>How the price path is built (M1).</b> Weekly median of the mandi
board &rarr; STL decomposition of log-price with period 52 &rarr; &plusmn;2&sigma; volatility bands on the
residual &rarr; GLUT/SPIKE flags from the z-score &rarr; a deterministic projection that M3 consumes.
The red dashed line is <b>p(d)</b>, not a forecast guarantee.</div>""")
    if m1 is None:
        st.info("No annual decomposition available for this crop and variety selection.")
    else:
        proj = pd.date_range(m1.index.max(), periods=len(path), freq="D")
        fig = projection_scan_figure(m1, path, proj)
        st.plotly_chart(fig, width="stretch")
        a, b = st.columns(2)
        with a:
            s = strengths(m1)
            st.write("**Decomposition strength**")
            st.json({k: round(float(v), 4) for k, v in s.items()})
            st.caption(f"{ref_mandi}: {cov['weeks']} weeks, {cov['observed']} observed, "
                       f"{cov['imputed_frac']:.0%} interpolated.")
            st.write(f"**GLUT weeks {int((m1['flag'] == 'GLUT').sum())} \u00b7 "
                     f"SPIKE weeks {int((m1['flag'] == 'SPIKE').sum())}**")
        with b:
            st.write("**Seasonal index by calendar month**")
            st.bar_chart(seasonal_index(m1).rename("index vs deseasonalised"))
            st.caption("1.0 = average month. Above 1 = seasonally strong.")

with t2:
    _html("""<div class="al-note"><b>Where does the money go (M2)?</b> Each mandi is scored per quintal
after freight (diesel &times; distance, return leg billed), cess/commission, loading/unloading and transit
shrink. Press <b>Rank reveal</b> to watch the field get scored one mandi at a time &mdash; the gap between
the board rank and this net rank is the arbitrage.</div>""")
    if len(rank) > 1:
        st.plotly_chart(rank_reveal_figure(rank), width="stretch")
    cols = [c for c in ["market", "district", "km", "board_price", "freight", "fees",
                        "handling", "net_total", "net_per_qtl", "rank_board",
                        "arbitrage_vs_nearest", "source"] if c in rank.columns]
    st.dataframe(rank[cols].style.format(
        {c: "{:,.0f}" for c in cols if c not in ("market", "district", "source")}),
        width="stretch", hide_index=True)
    st.caption("`km` is haversine \u00d7 1.3 circuity, not road distance. `source` marks "
               "mandis pinned to a district centroid rather than the market itself.")
    render_map(rank, farm_lat, farm_lon)

with t3:
    _html("""<div class="al-note"><b>Why holding costs real cash (M3).</b> V(t) = &theta;<sup>t</sup>&middot;p(t)
&minus; c&middot;t &minus; one-time fees: every day of storage burns rent, pledge-loan interest and spoilage,
and <b>&theta;<sup>t</sup> means you cannot sell what you put in</b>. Break-even is the first day V(t) beats
selling now; the MILP then splits the sale into at most 3 executable tranches.</div>""")
    if be is None:
        st.info(f"Hold-vs-sell needs a {crop} price path, which this crop cannot support "
                "from this dump. Switch the crop to Onion or Potato.")
    else:
        fig = go.Figure()
        fig.add_scatter(x=be["t"], y=be["v"], name="V(t) Rs/qtl",
                        line=dict(color=RED, width=2.5), fill="tozeroy",
                        fillcolor="rgba(215,38,61,.06)")
        fig.add_hline(y=be["v"][0], line_dash="dot", annotation_text="sell now")
        if be["breakeven_day"] is not None:
            fig.add_vline(x=be["breakeven_day"], line_dash="dash",
                          annotation_text=f"break-even d{be['breakeven_day']}")
        fig.add_vline(x=be["best_day"], line_dash="dashdot", line_color="green",
                      annotation_text=f"peak d{be['best_day']}")
        fig.update_layout(height=440, xaxis_title="days from now", yaxis_title="Rs/quintal",
                          plot_bgcolor="#fff", font=dict(family="Segoe UI, sans-serif"),
                          xaxis=dict(gridcolor="#F1F3F6"), yaxis=dict(gridcolor="#F1F3F6"))
        st.plotly_chart(fig, width="stretch")
        a, b = st.columns(2)
        with a:
            st.write("**Break-even scan**")
            st.json({k: v for k, v in be.items() if k not in ("t", "v")})
            st.caption(f"Carry Rs {c_day:.2f}/qtl/day = rent + insurance + financing on "
                       f"P={path[0]:,.0f}. Shrink {P['storage']['shrink_per_month']:.2%}/month.")
        with b:
            st.write(f"**Multi-tranche MILP ({milp['status']})**")
            st.json({k: v for k, v in milp.items() if k != "schedule"})
            sched = pd.DataFrame(milp["schedule"], columns=["day", "qtl_sold"])
            if len(sched):
                sched["price"] = [path[int(d)] for d in sched["day"]]
                sched["gross"] = sched["qtl_sold"] * sched["price"]
            st.dataframe(sched.round(1), width="stretch", hide_index=True)
        st.caption("Tranches are capped at 3 sales with a 10% floor each, so the schedule "
                   "is executable rather than one clairvoyant sale.")

with t4:
    _html("""<div class="al-note"><b>Filling the buyer's order (M4).</b> A bounded knapsack:
fill &ge; T with &le; 3% surplus, no single farm above 40% of the order, lot multiplicity respected.
The 0/1 subset-sum DP re-solves the same question independently &mdash; the UI prints both answers so you
can see they agree.</div>""")
    if not lots:
        st.info("No farmer pool for this crop.")
    else:
        lf = to_frame(lots)
        lf["selected"] = lf["id"].isin(set(agg["chosen"]) if agg else set())
        st.write("**Farmer lots** \u2014 lot sizes simulated and seeded; mandis, distances "
                 "and board prices are real")
        st.dataframe(lf.round(2), width="stretch", hide_index=True)
        if agg:
            st.json({k: v for k, v in agg.items() if k != "chosen"})
            st.caption(f"DP cross-check (0/1 subset-sum) surplus {dp_cross} qtl vs MILP "
                       f"{agg['surplus']} qtl.")

with t5:
    _html("""<div class="al-note"><b>Every number here is an assumption you can challenge.</b>
The sidebar sliders are session-only overrides of <b>data/ref/params.yaml</b>, where each rate carries a
<b>source:</b> field &mdash; filled in means verified, <b>TODO</b> means guessed. Download the exact slice
in view to audit it.</div>""")
    st.json(P)
    st.download_button("Download the Karnataka slice in view",
                       sel.to_csv(index=False).encode(),
                       file_name=f"karnataka_{crop.lower()}_{variety.lower()}.csv",
                       mime="text/csv")

_html("""<div class="al-foot">
  <div class="al-foot__brand">AgriLink<span>-OR</span></div>
  <div class="al-foot__t">Deterministic decision support for FPOs &middot; STL + net-in-hand ranking +
  MILP + knapsack &middot; no machine learning</div>
  <div class="al-foot__t">Karnataka Agmarknet slice &middot; assumptions auditable in
  data/ref/params.yaml &middot; 43 tests</div>
</div>""")
