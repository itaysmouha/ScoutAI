from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import jobs, uploads

app = FastAPI(title="ScoutAI")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])


app.include_router(uploads.router)
app.include_router(jobs.router)

@app.get("/")
def index():
    return {"message": "ScoutAI API is running", "docs": "/docs"}
