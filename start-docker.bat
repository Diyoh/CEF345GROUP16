@echo off
echo Starting BuildRight Platform with Docker...
docker compose up --build -d
echo.
echo Services started!
echo Frontend: http://localhost:8080
echo Backend: http://localhost:5000
echo.
pause
