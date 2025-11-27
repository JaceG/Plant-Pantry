# 🌱 PlantPantry

A vegan-only grocery discovery and planning tool. Browse plant-based products as if they were all on the shelves of a single giant store, then see where they're available across brick-and-mortar stores, online retailers, and direct-from-brand sites.

![PlantPantry Screenshot](https://images.unsplash.com/photo-1540914124281-342587941389?w=1200)

## ✨ Features

- **🔍 Product Discovery** - Browse and search thousands of vegan grocery products
- **🏪 Store Availability** - See where products are available across multiple retailers
- **📝 Shopping Lists** - Build shopping lists that work across multiple stores
- **🏷️ Smart Filtering** - Filter by category, tags, and search terms
- **📱 Responsive Design** - Beautiful experience on desktop and mobile

## 🏗️ Project Structure

```
plant-pantry/
├── client/          # React + TypeScript frontend (Vite)
│   ├── src/
│   │   ├── api/           # API client layer
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── screens/       # Page components
│   │   ├── types/         # TypeScript type definitions
│   │   ├── App.tsx        # Main app with routing
│   │   └── index.css      # Global styles & design system
│   ├── package.json
│   └── vite.config.ts
│
└── server/          # Node.js + Express + TypeScript backend
    ├── src/
    │   ├── config/        # Database configuration
    │   ├── middleware/    # Express middleware
    │   ├── models/        # Mongoose schemas
    │   ├── routes/        # API route handlers
    │   ├── services/      # Business logic layer
    │   ├── scripts/       # Seed scripts
    │   └── server.ts      # Express app entry
    ├── package.json
    └── tsconfig.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB Atlas account (free tier works great)

### 1. MongoDB Atlas Setup

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier M0)
3. Create a database user with username and password
4. Add your IP address to the allowlist (or use `0.0.0.0/0` for development)
5. Get your connection string from "Connect" → "Drivers"

### 2. Server Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env` and add your MongoDB connection string:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/plantpantry?retryWrites=true&w=majority
PORT=5000
CLIENT_URL=http://localhost:5173
```

Seed the database with **real vegan products from Open Food Facts**:
```bash
npm run seed:openfoodfacts
```

Or use the original sample data (faster, no API calls):
```bash
npm run seed
```

Start the development server:
```bash
npm run dev
```

### 3. Client Setup

```bash
cd client
npm install
npm run dev
```

### 4. Open the App

Visit **http://localhost:5173** to start browsing vegan products!

## 📡 API Endpoints

### Health
- `GET /api/health` - Health check with database status

### Products
- `GET /api/products` - List products with pagination & filtering
  - Query params: `q`, `category`, `tag`, `page`, `pageSize`
- `GET /api/products/:id` - Get product details with availability
- `GET /api/products/categories` - Get all available categories

### Stores
- `GET /api/stores` - List all stores

### Shopping Lists
- `POST /api/lists` - Create a new shopping list
- `GET /api/lists` - Get all lists for current user
- `GET /api/lists/default` - Get or create default list
- `GET /api/lists/:id` - Get list with items
- `POST /api/lists/:id/items` - Add item to list
- `DELETE /api/lists/:listId/items/:itemId` - Remove item from list

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **React Router** for navigation
- **Custom Hooks** for data fetching
- **CSS Variables** for theming

### Backend
- **Node.js** with TypeScript
- **Express** web framework
- **MongoDB Atlas** database
- **Mongoose** ODM
- Security: Helmet, CORS, Morgan

### Design
- Custom design system with CSS variables
- Outfit & Plus Jakarta Sans typography
- Organic, nature-inspired color palette
- Smooth animations and transitions

## 📋 Available Scripts

### Server
```bash
npm run dev               # Start development server with hot reload
npm run build             # Build TypeScript to JavaScript
npm start                 # Run production server
npm run seed              # Seed database with sample data
npm run seed:openfoodfacts  # Seed with real data from Open Food Facts API
npm run lint              # Run ESLint
```

### Client
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🎨 Design System

The app uses a cohesive, nature-inspired design:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-forest` | `#344E41` | Primary actions, headers |
| `--color-sage` | `#8BA785` | Secondary elements |
| `--color-mint` | `#E8F0E6` | Backgrounds, highlights |
| `--color-cream` | `#FDFCF7` | Page backgrounds |
| `--color-terracotta` | `#D16B55` | Error states, alerts |

## 📊 Data Sources

Product data can be seeded from:
- **[Open Food Facts](https://world.openfoodfacts.org)** - A free, open database of food products with 3M+ items
  - Licensed under [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/1-0/)
  - Uses `ingredients_analysis_tags=en:vegan` to filter vegan products
  - API Documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/

## 🗺️ Roadmap

- [ ] User authentication (JWT/OAuth)
- [ ] Real-time inventory checks
- [ ] Price comparison features
- [ ] Recipe integration
- [ ] Crowdsourcing & moderation
- [ ] Mobile apps (React Native)
- [ ] B2B API & dashboards

## 📄 License

ISC

---

Built with 🌱 for the vegan community
