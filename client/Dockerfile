FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/admin-app/package.json ./apps/admin-app/package.json
COPY apps/customer-app/package.json ./apps/customer-app/package.json
COPY apps/restaurant-app/package.json ./apps/restaurant-app/package.json
COPY apps/driver-app/package.json ./apps/driver-app/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/socket/package.json ./packages/socket/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm ci --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=1000 --fetch-retry-maxtimeout=30000

ARG APP_NAME
ARG VITE_API_URL=http://localhost:5000
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_AUTH0_GOOGLE_ENABLED=true
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY
ENV VITE_AUTH0_GOOGLE_ENABLED=$VITE_AUTH0_GOOGLE_ENABLED

COPY . .
RUN npm run build --workspace=$APP_NAME

FROM nginx:1.27-alpine AS runtime

ARG APP_NAME

COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/${APP_NAME}/dist /usr/share/nginx/html

EXPOSE 80
