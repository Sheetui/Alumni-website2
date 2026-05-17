# Alumni Backend (Python + MySQL)

This backend is a FastAPI REST API with JWT authentication and a MySQL database.

## Setup
1. Install Python 3.10+.
2. Create and activate a virtual environment in `Alumni/backend/`.
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Configure MySQL and environment variables:
   - Copy `.env.example` to `.env`
   - Update `DB_*` and `JWT_SECRET`

## Run
From `Alumni/backend/`:
- `uvicorn main:app --reload --port 8000`

The API base URL is `http://localhost:8000/api`.

## Endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/reset-password`
- `GET /api/alumni?search=...`
- `GET /api/events`
- `POST /api/admin/events`
- `GET /api/jobs`
- `POST /api/admin/jobs`
- `GET /api/me`
- `PUT /api/me/profile`
- `POST /api/feedback`
- Admin:
  - `GET /api/admin/pending?search=...`
  - `POST /api/admin/pending/{user_id}/approve`
  - `POST /api/admin/pending/{user_id}/reject`
  - `GET /api/admin/alumni?search=...`

