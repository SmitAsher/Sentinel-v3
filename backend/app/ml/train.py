"""
Random Forest Training Script
================================
Trains a lightweight Random Forest classifier on the Kaggle
"Cyber Security Attacks" dataset (or any compatible CSV).

Usage:
    python -m app.ml.train

Features used  : Protocol, Packet Length, Source Port, Destination Port,
                  Payload Content Frequency, TTL
Output labels  : Malware, DDoS, Intrusion, Benign

References:
  [1] Farnaaz & Jabbar (2016) — Random Forest Modeling for NIDS
      https://doi.org/10.1016/j.procs.2016.06.047
  [2] Resende & Drummond (2018) — Survey of RF for IDS
      https://doi.org/10.1145/3178582
  [3] Ahmad et al. (2021) — Systematic Study of ML/DL for NIDS
      https://doi.org/10.1002/ett.4150
"""

import os
import pickle

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder

# ─── Paths ───
DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "datasets")
MODEL_OUTPUT = os.path.join(os.path.dirname(__file__), "rf_model.pkl")

# ─── Feature columns expected in the CSV ───
FEATURE_COLS = [
    "Protocol",
    "Packet Length",
    "Source Port",
    "Destination Port",
]

LABEL_COL = "Attack Type"  # Target column in the Kaggle dataset


def train():
    # 1. Load dataset
    csv_files = [f for f in os.listdir(DATASET_DIR) if f.endswith(".csv")]
    if not csv_files:
        print("❌  No CSV files found in", DATASET_DIR)
        return

    df = pd.read_csv(os.path.join(DATASET_DIR, csv_files[0]))
    print(f"✅  Loaded {len(df)} rows from {csv_files[0]}")
    print(f"   Columns: {list(df.columns)}")

    # 2. Encode categorical features (e.g., Protocol: TCP→0, UDP→1)
    label_encoders = {}
    for col in FEATURE_COLS:
        if col in df.columns and df[col].dtype == "object":
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le

    # Ensure target column exists
    if LABEL_COL not in df.columns:
        print(f"⚠️  Target column '{LABEL_COL}' not found. Available: {list(df.columns)}")
        print("   Attempting to use the last column as the label...")
        LABEL_COL_ACTUAL = df.columns[-1]
    else:
        LABEL_COL_ACTUAL = LABEL_COL

    # Encode target
    le_target = LabelEncoder()
    df[LABEL_COL_ACTUAL] = le_target.fit_transform(df[LABEL_COL_ACTUAL].astype(str))

    # 3. Select available features
    available = [c for c in FEATURE_COLS if c in df.columns]
    if not available:
        print("❌  None of the expected feature columns found.")
        return

    X = df[available].fillna(0)
    y = df[LABEL_COL_ACTUAL]

    print(f"   Using features: {available}")
    print(f"   Labels ({len(le_target.classes_)}): {list(le_target.classes_)}")

    # 4. Train / test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 5. Train Random Forest (lightweight: 50 trees, max_depth=12)
    clf = RandomForestClassifier(
        n_estimators=50,
        max_depth=12,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # 6. Evaluate
    y_pred = clf.predict(X_test)
    print("\n📊  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=[str(c) for c in le_target.classes_]))

    # 7. Save model
    with open(MODEL_OUTPUT, "wb") as f:
        pickle.dump(clf, f)
    print(f"\n💾  Model saved to {MODEL_OUTPUT}")


if __name__ == "__main__":
    train()
