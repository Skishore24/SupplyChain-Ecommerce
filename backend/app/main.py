from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.routers import (
    auth,
    users,
    categories,
    products,
    cart,
    wishlist,
    orders,
    reviews,
    coupons,
    admin,
    analytics,
    suppliers
)
from app.routers.ai_router import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle events."""
    # ── Startup ─────────────────────────────────────────
    from app.jobs.scheduler import start_scheduler
    start_scheduler()
    yield
    # ── Shutdown ────────────────────────────────────────
    from app.jobs.scheduler import stop_scheduler
    stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "SHOPERA — AI-Native Ecommerce & Supply Chain Intelligence Platform. "
        "Full ecommerce lifecycle + demand forecasting, inventory intelligence, "
        "customer segmentation, anomaly detection, and AI agents."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handlers for Standardized Responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(exc.detail),
            "errors": [str(exc.detail)]
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"])
        errors.append(f"{field}: {err['msg']}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "success": False,
            "message": "Validation error in request payload",
            "errors": errors
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "An unexpected internal server error occurred",
            "errors": [str(exc)]
        }
    )

# Register Routers under /api
api_prefix = settings.API_V1_STR

app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(categories.router, prefix=api_prefix)
app.include_router(products.router, prefix=api_prefix)
app.include_router(cart.router, prefix=api_prefix)
app.include_router(wishlist.router, prefix=api_prefix)
app.include_router(orders.router, prefix=api_prefix)
app.include_router(reviews.router, prefix=api_prefix)
app.include_router(coupons.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(suppliers.router)
app.include_router(ai_router)  # ai_router already includes /api/ai prefix

@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "api": api_prefix
    }

@app.get("/api/health", tags=["Health"])
def health_check():
    from datetime import datetime, timezone
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
    }
