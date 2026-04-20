import os

_APP_DIR = os.path.abspath(os.path.dirname(__file__))

# ─── JWT Settings ───
SECRET_KEY = os.getenv("SECRET_KEY", "sentinel-v3-super-secret-key-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# ─── CheckPoint ThreatMap API ───
THREATMAP_API_URL = "https://threatmap-api.checkpoint.com/ThreatMap/api/feed"

# ─── ML Model Path ───
MODEL_PATH = os.path.join(_APP_DIR, "ml", "rf_model.pkl")

# ─── Dataset Path ───
DATASET_DIR = os.path.join(_APP_DIR, "datasets")
