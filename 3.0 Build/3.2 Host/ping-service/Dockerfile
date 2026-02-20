FROM node:22-slim
WORKDIR /app

# Create non-root user first so npm cache is owned by appuser
RUN groupadd -r appuser && useradd -r -g appuser -m appuser

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Pre-install Claude Code CLI binary as appuser so cache is accessible at runtime
USER appuser
RUN npx @anthropic-ai/claude-code --version

COPY --chown=appuser:appuser index.mjs .

EXPOSE 8080
CMD ["node", "index.mjs"]
