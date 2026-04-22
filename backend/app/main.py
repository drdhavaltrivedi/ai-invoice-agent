from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
import os
import traceback
import sys

from app.core.config import settings
from app.api import invoices, exceptions, erp, gmail, notifications


try:
    scheduler = AsyncIOScheduler()
except Exception as e:
    print(f"Warning: Could not initialize scheduler: {e}", file=sys.stderr)
    scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    if scheduler and not os.environ.get("VERCEL"):
        from app.services.gmail_poller import poll_gmail_for_invoices
        scheduler.add_job(poll_gmail_for_invoices, "interval", minutes=5, id="gmail_poll")
        scheduler.start()
        print("Scheduler started")
    else:
        print("Running on Vercel: Scheduler disabled")
    yield
    if scheduler and scheduler.running:
        scheduler.shutdown()


try:
    print(f"Supabase URL: {settings.supabase_url[:10]}...")
    print(f"Supabase Anon Key: {settings.supabase_anon_key[:10]}...")
    print(f"Gemini API Key: {settings.gemini_api_key[:10]}...")
except Exception as e:
    print(f"Error printing settings: {e}")

app = FastAPI(title="Invoice Processing Agent API", version="1.0.0", lifespan=lifespan)

from fastapi.responses import JSONResponse

@app.middleware("http")
async def log_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal Server Error",
                "message": str(e),
                "type": e.__class__.__name__
            }
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(invoices.router)
app.include_router(exceptions.router)
app.include_router(erp.router)
app.include_router(gmail.router)
app.include_router(notifications.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
