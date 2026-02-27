FROM node:22-slim@sha256:5373f1906319b3a1f291da5d102f4ce5c77ccbe29eb637f072b6c7b70443fc36
WORKDIR /app

# Create non-root user first so npm cache is owned by appuser
RUN groupadd -r appuser && useradd -r -g appuser -m appuser

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Pre-install Claude Code CLI binary as appuser so cache is accessible at runtime
USER appuser
RUN npx @anthropic-ai/claude-code --version

COPY --chown=appuser:appuser index.mjs ping-worker.mjs ./

EXPOSE 8080
CMD ["node", "index.mjs"]
