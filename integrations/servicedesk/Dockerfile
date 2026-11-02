FROM node:22-slim
WORKDIR /app
COPY integrations/servicedesk/package.json integrations/servicedesk/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY src/server/services/servicedesk-contract.js src/server/services/servicedesk-evidence.js ./src/server/services/
COPY integrations/servicedesk ./integrations/servicedesk/
RUN mkdir -p /state /app/uploads
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 CMD node -e "const h=JSON.parse(require('fs').readFileSync('/state/health.json'));process.exit(h.healthy && Date.now()-Date.parse(h.checked_at)<240000?0:1)"
CMD ["node","integrations/servicedesk/main.js"]
