# Use an official Node.js runtime as a parent image
FROM node:20.11.1

# Set the working directory to /app
WORKDIR /app

# Copy the yarn.lock and package.json to the working directory
COPY package.json yarn.lock ./
COPY packages/app/package.json ./packages/app/
COPY packages/common/package.json ./packages/common/

# Install dependencies using Yarn
CMD ["node", "-v"]
RUN yarn

# Copy the entire monorepo to the working directory
COPY . .

# Build the app
#RUN yarn workspace @shrub-lend/app build
CMD ["yarn", "build:app"]

# Set the working directory to the app
WORKDIR /app

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD ["yarn", "app"]

