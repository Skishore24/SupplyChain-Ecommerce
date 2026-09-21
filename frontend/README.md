# SHOPERA — Frontend & Full-Stack Guide

This guide details how to set up, launch, and test both the **Frontend** (React + Vite) and the **Backend** (FastAPI + `uv`) of the SHOPERA E-Commerce application.

---

## 🛠️ Prerequisites

Ensure you have the following installed on your system:

* **Node.js** (v18+ recommended) & **npm**
* **Python** (v3.10+) & **[uv](https://github.com/astral-sh/uv)** package manager
* **MySQL Server** running with database `ecommerce_db`

---

## 🚀 Quick Start (Running Both Services)

To run the complete application, you will open **two terminals**: one for the backend and one for the frontend.

### Terminal 1: Backend (FastAPI + `uv`)

1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```

2. Synchronize dependencies using `uv` (creates/syncs `.venv` automatically without `pip`):
   ```powershell
   uv sync
   ```

3. Configure Environment:
   Ensure `backend/.env` exists with your MySQL database credentials (see `backend/.env.example`):
   ```env
   PROJECT_NAME=SHOPERA
   API_V1_STR=/api
   DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/ecommerce_db
   JWT_SECRET_KEY=shopera_super_secure_jwt_secret_key_2026_production_grade_987654321
   JWT_ALGORITHM=HS256
   ```

4. *(Optional / First Time)* Run Database Migrations & Seed Sample Data:
   ```powershell
   # Apply Alembic database migrations
   uv run alembic upgrade head

   # Seed catalog, demo users, orders, and coupons
   uv run python -m app.seed
   ```

5. Start the Backend Server:
   ```powershell
   uv run uvicorn app.main:app --reload
   ```
   * **API Base URL**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
   * **Swagger Interactive Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   * **Health Check**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### Terminal 2: Frontend (React 19 + Vite)

1. Navigate to the frontend directory:
   ```powershell
   cd frontend
   ```

2. Install dependencies (if not already installed):
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   * **Frontend App**: [http://localhost:5173](http://localhost:5173)
   * All API requests to `/api/*` are automatically proxied by Vite to `http://127.0.0.1:8000`.

---

## 🔑 Demo Accounts & Portal URLs

Use these pre-seeded accounts to explore customer storefront and administrative capabilities:

| Role | Portal URL | Email | Password | Access / Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | [http://localhost:5173/admin/login](http://localhost:5173/admin/login) | `admin@shopera.com` | `Admin@Shopera2026!` | Admin Dashboard, Analytics, Inventory, Orders, Categories, Coupons |
| **Customer** | [http://localhost:5173/login](http://localhost:5173/login) | `sarah.jenkins@example.com` | `Customer@1234` | Browse Catalog, Cart, Wishlist, Place Orders, Product Reviews |


---

## 🧪 Testing & Verification

### 1. Backend Automated Tests (`uv run pytest`)

Run the backend test suite covering authentication, RBAC, cart lifecycle, product filtering, and order management:

```powershell
cd backend
uv run pytest -v
```

*Expected result*: `12 passed in ~2s` with 0 failures and 0 warnings.

### 2. Frontend Linting & Build Verification

Validate that the frontend has no syntax/lint errors and compiles cleanly for production:

```powershell
cd frontend

# Run Oxlint
npm run lint

# Verify Production Build
npm run build
```

*Expected result*: Production bundle generated into `dist/` with 0 errors.

### 3. End-to-End Smoke Test Flow

1. Open **[http://localhost:5173](http://localhost:5173)** in your browser.
2. Log in with **Customer** credentials (`sarah.jenkins@example.com`).
3. Add a product to the cart, apply coupon `SHOPERA10`, and proceed through checkout.
4. Log in with **Admin** credentials (`admin@shopera.com`).
5. Open the Admin portal at **[http://localhost:5173/admin](http://localhost:5173/admin)** to review sales charts, update order statuses, or manage stock levels.

---

## 📦 Tech Stack Summary

* **Frontend**: React 19, Vite, TailwindCSS, React Router v7, TanStack Query, Recharts, Lucide Icons, Zod.
* **Backend**: FastAPI, Python 3.10+, `uv`, SQLAlchemy 2.0, Alembic, PyMySQL, Pydantic v2, Pytest, Bcrypt, PyJWT.
