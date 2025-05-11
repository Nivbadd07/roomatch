# Use Node.js 18 base image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app files
COPY . .

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Start the app
CMD [ "node", "server.js" ]


