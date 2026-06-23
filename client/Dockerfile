FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/admin-app/package.json ./apps/admin-app/package.json
COPY apps/customer-app/package.json ./apps/customer-app/package.json
COPY apps/restaurant-app/package.json ./apps/restaurant-app/package.json
COPY apps/driver-app/package.json ./apps/driver-app/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/socket/package.json ./packages/socket/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm ci

COPY . .

EXPOSE 5173 5174 5175 5176

CMD ["npm", "run", "dev:all"]
