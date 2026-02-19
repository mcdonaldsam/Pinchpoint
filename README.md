# PinchPoint

**Start your Claude Pro/Max 5-hour window exactly when you want it.**

Claude Pro and Max give you a 5-hour usage window. Once you use Claude, a timer starts — after 5 hours of heavy usage, you're rate-limited until it resets. If you start using Claude at random times, your window might expire mid-afternoon when you still need it.

PinchPoint sends a tiny ping to Claude at a time you choose (e.g. 8am every weekday), so your window is already running when you sit down to work.

## How it works

### Setup (once)

1. Sign up at [pinchpoint.dev](https://pinchpoint.dev)
2. Run `claude setup-token` in your terminal — this generates a long-lived key
3. Paste the key into the dashboard
4. Pick which days and times you want your window to start

### Every day (automatic)

1. At your scheduled time, our server wakes up
2. It decrypts your stored key and sends a one-word message to Claude — this starts the 5-hour window
3. Claude tells us the exact time the window expires
4. You get a notification and your dashboard updates
5. You sit down, open Claude, and your window is already running

## Architecture

```
Dashboard (React)          Cloudflare Pages
     |
     v
API Worker                 Cloudflare Workers
     |
     v
Durable Object             One per user — stores schedule,
(alarm fires at               token, and ping results
 scheduled time)
     |
     v
Ping Service               Google Cloud Run — runs the
                              Claude Agent SDK
     |
     v
Claude API                 Starts the 5-hour window,
                              returns exact reset time
```

**Why two servers?** The Claude Agent SDK spawns `claude` as a subprocess, which needs a full Node.js runtime. Cloudflare Workers can't do that — so the Worker handles scheduling and the API, while a Cloud Run container handles the actual ping.

**Why Durable Objects?** Each user gets their own tiny database with a built-in alarm clock. When you set "Monday 8am," the alarm fires at exactly that time, triggers the ping, then sets the next alarm. No cron jobs scanning thousands of users — each user is independent.

## Tech stack

- **Cloudflare Workers + Durable Objects + Pages** — API, scheduling, frontend
- **Google Cloud Run** — ping execution via Claude Agent SDK
- **Clerk** — authentication
- **Resend** — email notifications (optional)

## Cost

$5/month (Cloudflare Workers Paid plan for Durable Objects). Everything else fits within free tiers — scales to 10,000+ users at the same price.

## Development

```bash
# Worker
cd "3.0 Build/3.2 Host/worker"
npm install && npm run dev

# Ping service
cd "3.0 Build/3.2 Host/ping-service"
docker build -t pinchpoint-ping .
docker run -p 8080:8080 -e PING_SECRET=test pinchpoint-ping

# Frontend
cd web
npm install && npm run dev
```
