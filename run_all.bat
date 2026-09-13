@echo off
echo ===================================================
echo Starting Shodh-a-Code Full Platform
echo ===================================================

echo [1/4] Starting AI Service (Port 3002)...
start "AI Service (FastAPI + Groq + GraphRAG)" cmd /k "cd /d %~dp0ai-service && uvicorn main:app --host 0.0.0.0 --port 3002"

echo [2/4] Starting Backend API (Port 3000)...
start "Backend API (NestJS + SQLite)" cmd /k "cd /d %~dp0backend && pnpm run start:prod"

echo [3/4] Starting Judge Worker...
start "Judge Worker (Docker Sandbox)" cmd /k "cd /d %~dp0judge-worker && node index.js"

echo [4/4] Starting Frontend (Port 3001)...
start "Frontend UI (Next.js)" cmd /k "cd /d %~dp0frontend && pnpm dev --port 3001"

echo.
echo ===================================================
echo All services launched!
echo - Frontend:   http://localhost:3001
echo - Contests:   http://localhost:3001/contests
echo - AI Service: http://localhost:3002
echo - Backend:    http://localhost:3000
echo ===================================================
echo To run the automated GraphRAG evaluation:
echo   python evaluate.py
echo ===================================================
pause
