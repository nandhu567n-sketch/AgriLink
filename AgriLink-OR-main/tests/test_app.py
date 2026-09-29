"""Headless smoke test of the dashboard: runs the real app, asserts every module produced
a decision, and exercises the controls most likely to break a selector path."""
import datetime as dt
import sys
from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
APP = str(Path(__file__).resolve().parents[1] / "app" / "streamlit_app.py")
TIMEOUT = 240


def fresh():
    """A started app. The element tree only exists after the first run."""
    at = AppTest.from_file(APP, default_timeout=TIMEOUT)
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    return at


def set_crop(at, crop):
    at.sidebar.selectbox[0].set_value(crop)
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    return at


def slider_named(at, prefix):
    matches = [s for s in at.sidebar.slider if s.label.startswith(prefix)]
    assert matches, f"no slider labelled {prefix!r}"
    return matches[0]


def test_default_onion_view_loads_all_three_modules():
    at = fresh()
    labels = [m.label for m in at.metric]
    assert any("SELL AT" in l for l in labels)
    assert any("BULK ORDER" in l for l in labels)
    # Onion is one of the two crops with two annual cycles, so hold-vs-sell must be live.
    assert any("HOLD" in l for l in labels), labels


@pytest.mark.parametrize("crop", ["Onion", "Potato", "Tomato", "Wheat", "Rice"])
def test_every_karnataka_crop_runs(crop):
    at = set_crop(fresh(), crop)
    labels = [m.label for m in at.metric]
    assert any("SELL AT" in l for l in labels), labels
    assert any("BULK ORDER" in l for l in labels), labels


@pytest.mark.parametrize("crop", ["Tomato", "Wheat", "Rice"])
def test_single_season_crops_degrade_instead_of_fabricating(crop):
    """These are reported as one partial season, so the annual STL is not estimable.
    The app must say so and leave hold-vs-sell empty rather than fit noise."""
    at = set_crop(fresh(), crop)
    assert any("two full annual cycles" in e.value for e in at.error)
    hold = [m for m in at.metric if "HOLD" in m.label]
    assert hold and hold[0].value == "n/a", hold


def test_potato_keeps_hold_module_live():
    at = set_crop(fresh(), "Potato")
    hold = [m for m in at.metric if "HOLD" in m.label]
    assert hold and hold[0].value != "n/a", hold


def test_volume_and_horizon_flow_through_modules():
    at = set_crop(fresh(), "Onion")
    slider_named(at, "Crop volume").set_value(900)
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    slider_named(at, "Horizon").set_value(240)
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    assert any("HOLD" in m.label for m in at.metric)


def test_cost_assumptions_move_the_answer():
    at = set_crop(fresh(), "Onion")
    slider_named(at, "Diesel").set_value(130.0)
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    assert any("SELL AT" in m.label for m in at.metric)


def test_conservative_toggle_does_not_crash():
    at = set_crop(fresh(), "Onion")
    at.sidebar.checkbox[0].set_value(True)
    at.run()
    assert not at.exception, [e.value for e in at.exception]


def test_farm_moved_far_from_default():
    at = set_crop(fresh(), "Onion")
    slider_named(at, "Farm latitude").set_value(18.4)
    slider_named(at, "Farm longitude").set_value(74.1)
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    assert any("SELL AT" in m.label for m in at.metric)


def test_variety_selection_still_runs():
    at = set_crop(fresh(), "Onion")
    variety = [s for s in at.sidebar.selectbox if s.label.startswith("Variety")][0]
    variety.set_value("Onion")
    at.run()
    assert not at.exception, [e.value for e in at.exception]


def test_as_of_replay_past_date():
    """Moving the as-of cut back must re-evaluate every module on older data, not crash."""
    at = set_crop(fresh(), "Onion")
    at.date_input[0].set_value(dt.date(2024, 8, 1))
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    assert any("SELL AT" in m.label for m in at.metric)
    assert any("HOLD" in m.label for m in at.metric)


def test_as_of_too_early_disables_stl_cleanly():
    """Before 2023-06+105 weeks there is no second annual cycle, so module 1 must say so."""
    at = set_crop(fresh(), "Onion")
    at.date_input[0].set_value(dt.date(2023, 7, 1))
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    assert any("two full annual cycles" in e.value for e in at.error)


def test_wider_quote_window_pulls_in_more_mandis():
    at = set_crop(fresh(), "Onion")
    narrow = _coverage_caption(at)
    assert narrow, [c.value for c in at.caption]
    slider_named(at, "Quote window").set_value(60)
    at.run()
    assert not at.exception, [e.value for e in at.exception]
    wide = _coverage_caption(at)
    if wide:
        assert _count(wide) >= _count(narrow), (narrow, wide)


def _coverage_caption(at):
    hits = [c.value for c in at.caption if "mandis reported a" in c.value]
    return hits[0] if hits else None


def _count(text):
    return int(text.split("**")[1].split("**")[0].split()[0])
