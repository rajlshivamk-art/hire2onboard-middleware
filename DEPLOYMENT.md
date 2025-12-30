# Deployment Guide

## Architecture
The application consists of two parts that can be deployed separately or together:
1.  **Backend API**: Python FastAPI service (Stateless).
2.  **Frontend**: Static React SPA (Single Page Application).

## 1. Backend Deployment (Docker / VPS)
Recommended: Use Docker or a Systemd service.

### Environment Variables
Ensure these are set on the server:
- `MONGODB_URL`: Connection string to MongoDB Atlas.
- `SECRET_KEY`: Random string for JWT signing.
- `ERP_USER` / `ERP_PASSWORD`: Credentials for ERP integration.
- `CORS_ORIGINS`: JSON list of allowed frontend domains, e.g. `["https://hrms.yourcompany.com"]`

### Start Command
```bash
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 2. Frontend Deployment
The frontend is a static site. Build it and serve with Nginx/Apache.

```bash
npm run build
```
This generates a `dist` folder.

### Nginx Config Example
```nginx
server {
    listen 80;
    server_name hrms.yourcompany.com;
    root /var/www/hrms/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Backend
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

## 3. Manual Render Deployment (Recommended)
Since the auto-blueprint can be tricky, here is the manual method. It works 100% of the time.

### Part A: Deploy Backend
1.  Go to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your repository.
4.  **Name**: `recruitment-backend`
5.  **Runtime**: `Python 3`
6.  **Build Command**: `pip install -r requirements.txt`
7.  **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
8.  **Environment Variables** (Add these):
    - `PYTHON_VERSION`: `3.11.0`
    - `MONGODB_URL`: (Your MongoDB Connection String)
    - `SECRET_KEY`: (Any random string)
    - `CORS_ORIGINS`: `["*"]` (For now, to allow all connections)
    - `ERP_USER` / `ERP_PASSWORD`: (Your ERP creds)
9.  Click **Create Web Service**.
10. **Copy the URL** (e.g., `https://recruitment-backend.onrender.com`). You need this for the frontend.

### Part B: Deploy Frontend
1.  Go to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Static Site**.
3.  Connect your repository.
4.  **Name**: `recruitment-frontend`
5.  **Build Command**: `npm install && npm run build`
6.  **Publish Directory**: `build`
7.  **Environment Variables**:
    - `VITE_API_URL`: Paste the Backend URL from Part A (e.g., `https://recruitment-backend.onrender.com`)
8.  Click **Create Static Site**.

## 4. Production Readiness Checks
- [ ] **HTTPS**: Ensure SSL is enabled.
- [ ] **CORS**: Update `CORS_ORIGINS` in Backend to your new Frontend URL.
- [ ] **Database**: Ensure MongoDB IP whitelist includes `0.0.0.0/0` (or Render's IPs).

