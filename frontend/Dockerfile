FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# node:20-alpine's bundled npm mishandles stray optional platform deps in
# this lockfile (EBADPLATFORM instead of skipping them) — same bug CI works
# around by pinning npm; see docs/DECISIONS.md.
RUN npm install -g npm@11.18.0
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
