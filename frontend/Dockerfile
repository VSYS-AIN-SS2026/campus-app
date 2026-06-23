# syntax=docker/dockerfile:1

# ── Stage 1: build the Vite/Vue SPA ──
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached unless the lockfile changes
COPY package.json package-lock.json ./
RUN npm ci

# Vite inlines VITE_* into the bundle at BUILD time, so they must be present here.
# Values come from the CI build-args (see .github/workflows/docker-publish.yml).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_MAGIC_LINK_REDIRECT_URL
ARG VITE_STATUS_PAGE_SLUG
ARG VITE_STATUS_PAGE_URL
ARG VITE_STATUS_API_BASE
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_MAGIC_LINK_REDIRECT_URL=$VITE_MAGIC_LINK_REDIRECT_URL \
    VITE_STATUS_PAGE_SLUG=$VITE_STATUS_PAGE_SLUG \
    VITE_STATUS_PAGE_URL=$VITE_STATUS_PAGE_URL \
    VITE_STATUS_API_BASE=$VITE_STATUS_API_BASE

COPY . .
RUN npm run build

# ── Stage 2: serve the static files with nginx ──
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
