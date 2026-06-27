from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.supabase_client import supabase
from app.routes.predict import router as predict_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)

@app.get("/")
def root():
    return {"message": "Backend running"}

@app.get("/collections")
def get_collections():
    response = supabase.table("collections").select("id, name").order("name").execute()
    return response.data
    