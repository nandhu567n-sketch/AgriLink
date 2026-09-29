"""Load assumptions from data/ref/params.yaml. UI sliders override these."""
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
PARAMS_PATH = ROOT / "data" / "ref" / "params.yaml"

def load_params(path=PARAMS_PATH) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)
