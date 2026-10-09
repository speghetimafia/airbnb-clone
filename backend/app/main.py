import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import UPLOAD_DIR, Base, engine
from .routers import bookings, host, listings, users

Base.metadata.create_all(engine)

app = FastAPI(title="Airbnb Clone API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX"),  # e.g. https://.*\.vercel\.app for preview deploys
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (listings.router, bookings.router, host.router, users.router):
    app.include_router(r, prefix="/api")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
def health():
    return {"ok": True}
