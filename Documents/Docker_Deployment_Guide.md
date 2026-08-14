# Docker Deployment Guide - BuildRight Platform

## Overview

This guide explains how to containerize and deploy the BuildRight Platform using Docker and Docker Compose.

## Prerequisites

- **Docker Desktop** installed (Windows/Mac) or Docker Engine (Linux)
- **Docker Compose** (usually included with Docker Desktop)
- At least 4GB of free disk space

## Project Structure

```
CEF345GROUP16/
├── Backend/
│   ├── Dockerfile          # Backend container definition
│   └── .dockerignore       # Files to exclude from backend image
├── Frontend/
│   ├── Dockerfile          # Frontend container definition
│   └── .dockerignore       # Files to exclude from frontend image
├── Database/
│   └── medaccess_final.sql # Database initialization script
└── docker-compose.yml      # Orchestration configuration
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Docker Host                       │
│                                                      │
│  ┌────────────┐   ┌──────────────┐   ┌───────────┐ │
│  │  Frontend  │   │   Backend    │   │  Database │ │
│  │  (Nginx)   │──▶│  (Node.js)   │──▶│  (MySQL)  │ │
│  │  Port: 80  │   │  Port: 5000  │   │ Port:3306 │ │
│  └────────────┘   └──────────────┘   └───────────┘ │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## How to Deploy

### 1. Build and Start All Services

```bash
# Navigate to project root
cd "d:\EDUCATION\ENGINEERING\CEF345 Software dev tools\CEF345GROUP16"

# Build and start all containers
docker-compose up -d

# View logs
docker-compose logs -f
```

### 2. Verify Services Are Running

```bash
# Check container status
docker-compose ps

# Expected output:
# buildright-db        running   0.0.0.0:3306->3306/tcp
# buildright-backend   running   0.0.0.0:5000->5000/tcp
# buildright-frontend  running   0.0.0.0:80->80/tcp
```

### 3. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000
- **Database**: localhost:3306 (for MySQL clients)

## Docker Commands Cheat Sheet

### Managing Containers

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart a specific service
docker-compose restart backend

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop and remove everything (including volumes)
docker-compose down -v
```

### Rebuilding After Code Changes

```bash
# Rebuild a specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build
```

### Debugging

```bash
# Execute commands inside a container
docker-compose exec backend sh
docker-compose exec db mysql -u root -p

# View container resource usage
docker stats
```

## Understanding the Dockerfiles

### Backend Dockerfile

```dockerfile
FROM node:18-alpine          # Use lightweight Node.js image
WORKDIR /app                 # Set working directory
COPY package*.json ./        # Copy dependency files
RUN npm ci --only=production # Install production dependencies
COPY . .                     # Copy application code
EXPOSE 5000                  # Expose port
CMD ["node", "index.js"]     # Start server
```

**Key Points**:

- Uses Alpine Linux for smaller image size (~150MB vs ~900MB)
- `npm ci` ensures reproducible builds
- Only production dependencies to reduce size

### Frontend Dockerfile (Multi-stage Build)

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build            # Build production files

# Stage 2: Serve
FROM nginx:alpine            # Use Nginx to serve static files
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Key Points**:

- **Multi-stage build** reduces final image size (build tools not included)
- Final image only contains built static files + Nginx (~20MB)
- Nginx serves files much faster than `vite preview`

## Docker Compose Explained

### Services

1. **db**: MySQL 8.0 database
   - Automatically initializes with `medaccess_final.sql`
   - Data persists in named volume `db_data`
   - Healthcheck ensures it's ready before backend starts

2. **backend**: Node.js API server
   - Waits for database to be healthy
   - Environment variables configured for Docker network
   - Connected to `buildright-network`

3. **frontend**: Nginx serving React app
   - Depends on backend
   - Accessible on port 80

### Networking

All services are on the same Docker network (`buildright-network`), allowing them to communicate using service names (e.g., `backend` can connect to `db`).

### Volumes

- **db_data**: Persists MySQL data even if container is removed
- **./Backend/public**: Mounts uploads directory for persistence

## Environment Variables

The `docker-compose.yml` sets these for the backend:

```yaml
DB_HOST: db # Service name, not localhost
DB_USER: buildright_user
DB_PASSWORD: buildright_pass
DB_NAME: buildright_db1
JWT_SECRET: your_secure_jwt_secret_change_in_production
```

**Important**: Change `JWT_SECRET` to a strong random value in production!

## Troubleshooting

### Issue: Frontend can't connect to backend

**Solution**: Update `Frontend/src/api.js` to use correct backend URL:

```javascript
const API_BASE_URL = import.meta.env.PROD
  ? "http://localhost:5000/api/v1" // Production (Docker)
  : "http://localhost:5000/api/v1"; // Development
```

### Issue: Database connection fails

```bash
# Check if database is healthy
docker-compose ps db

# View database logs
docker-compose logs db

# Manually connect to verify
docker-compose exec db mysql -u buildright_user -p
```

### Issue: Port already in use

```bash
# Check what's using the port
# Windows:
netstat -ano | findstr :80
netstat -ano | findstr :5000

# Stop the conflicting service or change ports in docker-compose.yml
```

## Production Considerations

### Security Improvements

1. Use `.env` file for sensitive data instead of hardcoding
2. Change default passwords
3. Use Docker secrets for production
4. Enable HTTPS with SSL certificates

### Performance Optimization

1. Use multi-stage builds (already implemented)
2. Minimize image layers
3. Use specific image tags (not `latest`)
4. Enable Docker BuildKit for faster builds

### Cloud Deployment Options

- **AWS**: Elastic Container Service (ECS) or Elastic Kubernetes Service (EKS)
- **Google Cloud**: Cloud Run or Google Kubernetes Engine (GKE)
- **Azure**: Container Instances or Azure Kubernetes Service (AKS)
- **DigitalOcean**: App Platform or Kubernetes
- **Heroku**: Container Registry

## Benefits of Docker

1. **Consistency**: "Works on my machine" → "Works everywhere"
2. **Isolation**: Each service runs in its own container
3. **Portability**: Deploy anywhere Docker runs
4. **Scalability**: Easy to scale services independently
5. **Version Control**: Dockerfiles are code, track changes in Git
6. **Fast Deployment**: Pre-built images deploy in seconds

## Next Steps for Presentation

### What to Demonstrate

1. Show `docker-compose.yml` and explain orchestration
2. Run `docker-compose up -d` and show all services starting
3. Access the application at http://localhost
4. Show `docker-compose ps` to prove containers are running
5. Show multi-stage build efficiency (compare image sizes)

### Key Points to Mention

- Docker solves dependency and environment issues
- All team members can run the app with one command
- Same containers run in development, testing, and production
- Easy to deploy to any cloud provider

## Conclusion

Docker containerization makes your application:

- ✅ Portable across different environments
- ✅ Easy to deploy and scale
- ✅ Consistent for all developers
- ✅ Production-ready

For questions or issues, refer to [Docker Documentation](https://docs.docker.com/).
