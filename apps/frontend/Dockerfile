FROM node:20-alpine
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY apps/frontend/package.json apps/frontend/package-lock.json* apps/frontend/
RUN npm install

COPY . .

WORKDIR /workspace/apps/frontend

RUN npm run build

CMD ["npm", "run", "start", "--prefix", "/workspace/apps/frontend"]

