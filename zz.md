# Terminal 1 — Frontend
cd web && npm run dev

# Terminal 2 — Worker API
cd "3.0 Build/3.2 Host/worker" && npm run dev

# Terminal 3 — Ping service (Docker)
cd "3.0 Build/3.2 Host/ping-service" && docker build -t pinchpoint-ping . && docker run -p 8080:8080 -e PING_SECRET=test pinchpoint-ping
