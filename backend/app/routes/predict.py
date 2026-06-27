from fastapi import APIRouter
from pydantic import BaseModel
from app.supabase_client import supabase
from app.ml.predict_model import predict

router = APIRouter()


class ShakeReport(BaseModel):
    movement_amount: int
    loudness: int
    sound_hardness: int


class PredictionRequest(BaseModel):
    weight: float
    collection_id: int | None = None
    shake_reports: dict[str, ShakeReport]


@router.post("/predict")
def predict_smiski(req: PredictionRequest):
    candidates = []

    if req.collection_id is not None:
        smiskis = supabase.table("smiski_names")\
            .select("name, morphology_profiles(*)")\
            .eq("collection_id", req.collection_id)\
            .execute().data

        for s in smiskis:
            if s.get("morphology_profiles"):
                candidates.append({
                    "name": s["name"],
                    "profile": s["morphology_profiles"],
                })

    shake_reports = {k: v.model_dump() for k, v in req.shake_reports.items()}

    results = predict(
        weight=req.weight,
        shake_reports=shake_reports,
        candidates=candidates,
    )

    return {"results": results}