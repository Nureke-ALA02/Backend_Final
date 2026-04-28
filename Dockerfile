FROM node:20-alpine

WORKDIR /app

# Install deps first for better Docker layer caching
COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate

COPY src ./src
COPY public ./public

EXPOSE 3000

CMD ["node", "src/server.js"]
