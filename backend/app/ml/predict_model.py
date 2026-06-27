import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.metrics.pairwise import euclidean_distances

MODEL_PATH = Path(__file__).parent / "smiski_model.joblib"

bundle = joblib.load(MODEL_PATH)
model = bundle["model"]
feature_cols = bundle["feature_cols"]
target_cols = bundle["target_cols"]
encoders = bundle["encoders"]
bool_cols = bundle["bool_cols"]


def build_features(weight: float, shake_reports: dict) -> pd.DataFrame:
    rotation_positions = ["base_rotation", "rotated_1", "rotated_2", "up_down"]
    metrics = ["movement_amount", "loudness", "sound_hardness"]

    row = {"weight": weight}

    for metric in metrics:
        vals = [shake_reports[pos][metric] for pos in rotation_positions]
        vals_series = pd.Series(vals, dtype=float)
        row[f"mean_{metric}"] = vals_series.mean()
        row[f"variance_{metric}"] = vals_series.var()
        row[f"range_{metric}"] = vals_series.max() - vals_series.min()
        rotation_mean = pd.Series([shake_reports[pos][metric] for pos in rotation_positions[:3]], dtype=float).mean()
        row[f"updown_vs_rotation_{metric}"] = shake_reports["up_down"][metric] - rotation_mean

    df = pd.DataFrame([row])[feature_cols]
    df = df.fillna(df.median())
    return df


def encode_candidate_profile(profile: dict) -> dict:
    row = {}
    for col in target_cols:
        val = profile.get(col)
        if col in encoders:
            try:
                val = encoders[col].transform([str(val)])[0]
            except:
                val = 0
        elif col in bool_cols:
            val = int(bool(val)) if val is not None else 0
        elif col == "largest_prop_size":
            val = -1 if val is None else val
        else:
            val = val if val is not None else 0
        row[col] = val
    return row


def decode_profile(raw: dict) -> dict:
    decoded = {}
    for attr, val in raw.items():
        if attr in encoders:
            decoded[attr] = encoders[attr].inverse_transform([int(val)])[0]
        elif attr in bool_cols:
            decoded[attr] = bool(val)
        else:
            decoded[attr] = val

    if decoded.get("total_prop_number") == 0:
        decoded["largest_prop_size"] = None
    else:
        decoded["largest_prop_size"] = int(decoded["largest_prop_size"]) if decoded.get("largest_prop_size") is not None else None

    return decoded


def predict(weight: float, shake_reports: dict, candidates: list[dict]) -> list[dict]:
    """
    weight: float
    shake_reports: dict keyed by position, each with movement_amount, loudness, sound_hardness
    candidates: list of dicts, each with "name" and "profile" (morphology profile dict)

    returns: ranked list of {name, distance, profile}
    """
    X = build_features(weight, shake_reports)
    raw_prediction = dict(zip(target_cols, model.predict(X)[0]))

    if not candidates:
        return [{"name": None, "distance": None, "profile": decode_profile(raw_prediction)}]

    candidate_rows = []
    candidate_names = []
    for c in candidates:
        candidate_rows.append(encode_candidate_profile(c["profile"]))
        candidate_names.append(c["name"])

    candidate_matrix = pd.DataFrame(candidate_rows, columns=target_cols).values
    predicted_vector = pd.DataFrame([raw_prediction])[target_cols].values

    distances = euclidean_distances(predicted_vector, candidate_matrix)[0]

    results = sorted([
        {
            "name": candidate_names[i],
            "distance": round(float(distances[i]), 3),
            "profile": decode_profile(raw_prediction),
        }
        for i in range(len(candidates))
    ], key=lambda x: x["distance"])

    return results