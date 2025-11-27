# 🌱 Plant Pantry

A full-stack plant management application built with React, TypeScript, Node.js, and MongoDB Atlas.

## Project Structure

```
plant-pantry/
├── client/          # React + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
└── server/          # Node.js + Express + TypeScript backend
    ├── src/
    │   ├── server.ts
    │   ├── config/
    │   ├── models/
    │   ├── routes/
    │   └── controllers/
    ├── package.json
    └── tsconfig.json
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account

## Setup Instructions

### 1. MongoDB Atlas Setup

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user with username and password
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string

### 2. Server Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` file and add your MongoDB Atlas connection string:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/plant-pantry?retryWrites=true&w=majority
```

### 3. Client Setup

```bash
cd client
npm install
```

## Running the Application

### Development Mode

**Terminal 1 - Start the server:**
```bash
cd server
npm run dev
```
Server will run on `http://localhost:5000`

**Terminal 2 - Start the client:**
```bash
cd client
npm run dev
```
Client will run on `http://localhost:5173`

### Production Build

**Server:**
```bash
cd server
npm run build
npm start
```

**Client:**
```bash
cd client
npm run build
npm run preview
```

## API Endpoints

- `GET /api/health` - Health check endpoint

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Axios

### Backend
- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- CORS, Helmet, Morgan

## Available Scripts

### Server
- `npm run dev` - Run development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server
- `npm run lint` - Lint TypeScript files

### Client
- `npm run dev` - Run development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint TypeScript files

## License

ISC
