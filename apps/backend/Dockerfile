FROM node:20-alpine
WORKDIR /workspace

# Install dependencies via root workspace manifest so the backend benefits from shared modules.
COPY package.json package-lock.json* ./
COPY apps/backend/package.json apps/backend/package-lock.json* apps/backend/
COPY packages/shared/package.json packages/shared/package-lock.json* packages/shared/
RUN npm install

COPY . .

WORKDIR /workspace/apps/backend

RUN npm run build

CMD ["npm", "run", "start", "--prefix", "/workspace/apps/backend"]

