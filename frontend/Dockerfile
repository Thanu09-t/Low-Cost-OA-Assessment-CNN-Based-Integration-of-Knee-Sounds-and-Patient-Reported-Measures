# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine

# Copy built assets to Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx configuration if custom one is needed, otherwise use default
# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
