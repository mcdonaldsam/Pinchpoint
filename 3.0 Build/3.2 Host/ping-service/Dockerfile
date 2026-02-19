FROM node:22-slim
WORKDIR /app
COPY package.json .
RUN npm install
# Pre-install Claude Code CLI binary so it's cached in the image
RUN npx @anthropic-ai/claude-code --version || true
COPY index.mjs .
EXPOSE 8080
CMD ["node", "index.mjs"]
