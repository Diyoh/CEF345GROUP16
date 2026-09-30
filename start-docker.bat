@echo off
echo Starting BuildRight Platform with Docker...

if not exist .env (
    copy .env.example .env >nul
    echo Created .env from .env.example. Change its passwords before sharing this machine.
)

docker compose up --build -d
if errorlevel 1 (
    echo.
    echo [ERROR] docker compose failed. Is Docker Desktop running?
    pause
    exit /b 1
)

echo.
echo Services started!
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:5001
echo.
echo First run only, create the schema and demo data:
echo   docker compose exec backend npm run db:init
echo   docker compose exec backend npm run migrate
echo   docker compose exec backend npm run seed:entities
echo   docker compose exec backend npm run seed
echo.
pause
