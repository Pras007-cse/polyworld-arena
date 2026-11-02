FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY backend ./backend
COPY frontend ./frontend
RUN cd frontend && npm install && npm run build
RUN cd backend && npm install && npm run build
EXPOSE 4000
ENV PORT=4000
CMD ["node", "backend/dist/backend/src/index.js"]
