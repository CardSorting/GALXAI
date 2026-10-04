# Packaging only: the input is a verified, retained production build.
FROM node@sha256:43aeff40f4afc22e83f7589a2f37e111cff5ca84529571f1c8415bcc5fcc21b2
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --chown=1000:1000 runtime/ /app/
# Next writes regenerated pages alongside its server output. Keep an immutable
# seed and use bounded tmpfs mounts, without changing its cache implementation.
RUN mkdir -p /opt/galx-seed /app/.next/cache && \
    cp -a /app/.next/server/app /opt/galx-seed/app && \
    cp -a /app/.next/server/pages /opt/galx-seed/pages
USER 1000:1000
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD ["node", "/app/healthcheck.cjs"]
CMD ["node", "/app/server.cjs"]
