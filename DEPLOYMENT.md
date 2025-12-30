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

## 3. Render Deployment (Easiest)
This project includes a `render.yaml` blueprint for automatic deployment.

1.  Push your code to a GitHub/GitLab repository.
2.  Log in to [Render](https://render.com/).
3.  Click **New +** and select **Blueprint**.
4.  Connect your repository.
5.  Render will detect `render.yaml` and ask for environment variables:
    - `MONGODB_URL`: Your MongoDB connection string.
    - `SECRET_KEY`: (Auto-generated).
    - `ERP_USER` / `ERP_PASSWORD`: Your ERP credentials.
6.  Click **Apply**. Render will deploy both the backend and frontend.

## 4. Production Readiness Checks
- [ ] **HTTPS**: Ensure SSL is enabled.
- [ ] **CORS**: Set `CORS_ORIGINS` to the actual frontend domain.
- [ ] **Database**: Ensure MongoDB IP whitelist includes the production server IP.
