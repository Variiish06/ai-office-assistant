FROM node:20-slim

WORKDIR /app

# Copy everything
COPY . .

# Install frontend deps and build
RUN cd frontend && npm install && npm run build

# Copy built frontend to backend/public
RUN mkdir -p backend/public && cp -r frontend/dist/. backend/public/

# Install backend deps
RUN cd backend && npm install

# Set working directory to backend
WORKDIR /app/backend

# Expose Hugging Face default port
EXPOSE 7860

# Environment variables (real values set as HF Secrets)
ENV PORT=7860
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]
