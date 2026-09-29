# Run in this order. Each step writes a file the next step reads.
# Every step is idempotent: history/clean re-run from source, geocode caches into
# data/ref/mandis.csv and only fetches rows it does not already have.

setup:    ; pip install -r requirements.txt

# --- build the real Karnataka pipeline from Agriculture_price_dataset.csv ---
history:  ; python -m src.data.load_history    # CSV -> data/raw/agmarknet_history.parquet
clean:    ; python -m src.data.clean           # -> data/raw/clean.parquet (Karnataka only)
geocode:  ; python -m src.geo.geocode_mandis   # -> data/ref/mandis.csv (~2 min, cached)
distmat:  ; python -m src.geo.build_dist_matrix# -> data/ref/dist_matrix.parquet
data:     ; make history clean geocode distmat

# --- optional: live current prices, needs DATA_GOV_KEY in .env (see .env.example) ---
fetch:    ; python -m src.data.fetch_agmarknet

test:     ; pytest -q
app:      ; streamlit run app/streamlit_app.py

# --- backend API: load the data into the database, then serve it ---
# DATABASE_URL decides the target. Default is PostgreSQL; point it at a
# sqlite:///... URL for a zero-setup local run (see RUN.md).
load-db:  ; python -m backend.seed.load_db
reset-db: ; python -m backend.seed.load_db --reset
backend:  ; uvicorn backend.main:app --reload --port 8000
