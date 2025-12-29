# Recruitment HRMS Software

A modern, full-stack Recruitment Management System built with **React (Vite)** and **FastAPI**.

## Features
- **Job Management**: Create, edit, and manage job postings.
- **Candidate Tracking**: Kanban board for visual candidate pipeline.
- **Multi-Tenant Support**: Super Admin flow for managing multiple companies.
- **ERP Integration**: Import companies and employees from ERPNext.
- **Role-Based Access**: Granular permissions for HR, Managers, and Interviewers.

## Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS, Lucide Icons
- **Backend**: Python FastAPI
- **Database**: MongoDB (Beanie ODM)
- **Integration**: REST API connection to ERPNext

## Quick Start (Development)

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- MongoDB Atlas URI

### 1. Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env  # (See Configuration section)

# Run Server
python -m uvicorn backend.main:app --reload
```
Server runs on `http://localhost:8000`

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Run Dev Server
npm run dev
```
Client runs on `http://localhost:5173`

## Configuration (.env)
Create a `.env` file in the root directory:
```ini
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/recruitment_db
SECRET_KEY=your_secure_secret_key
ERP_USER=administrator
ERP_PASSWORD=your_erp_password
# Optional: Externalize ERP URL (defaults to hrdemo)
ERP_BASE_URL=https://hrdemo.rajlaxmiworld.in
# Optional: Restrict CORS in production
CORS_ORIGINS=["https://your-frontend-domain.com"]
```

## Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed server setup instructions.

## Development Workflow

To make changes to this project:

1.  **Pull Latest Code**
    ```bash
    git pull origin main
    ```

2.  **Make Changes**
    - Edit files in `src/` (Frontend) or `backend/` (Backend).
    - Test locally using `npm run dev` and `python main.py`.

3.  **Save & Push**
    ```bash
    git add .
    git commit -m "Description of changes"
    git push origin main
    ```