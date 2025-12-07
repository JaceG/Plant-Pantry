# Store Chains Feature Plan

## Overview

Add a `StoreChain` concept to group store locations (e.g., all Kroger locations under one "Kroger" chain). This enables better organization in admin, cleaner store selection UX, and supports national/regional chain data at scale.

## Data Model

### New: StoreChain Model

```typescript
interface IStoreChain {
  _id: ObjectId;
  name: string;              // "Kroger", "Whole Foods Market"
  slug: string;              // "kroger", "whole-foods-market" (for URLs/matching)
  logoUrl?: string;          // Chain logo
  websiteUrl?: string;       // Main chain website
  type: 'national' | 'regional' | 'local';
  isActive: boolean;         // For soft-delete/disable
  locationCount: number;     // Denormalized count for quick display
  createdAt: Date;
  updatedAt: Date;
}
```

### Updated: Store Model

Add these fields to existing Store model:

```typescript
// New fields
chainId?: ObjectId;           // References StoreChain (null for independents)
locationIdentifier?: string;  // "#1234", "Downtown", "Main & High St"
```

---

## Phase 1: Database & Admin Foundation ✅

### 1.1 Create StoreChain Model ✅
- [x] Create `server/src/models/StoreChain.ts`
- [x] Export from `server/src/models/index.ts`
- [x] Add indexes for slug, name

### 1.2 Update Store Model ✅
- [x] Add `chainId` field (optional ObjectId ref)
- [x] Add `locationIdentifier` field (optional string)
- [x] Add index on `chainId`

### 1.3 Store Chain Service ✅
- [x] Create `server/src/services/storeChainService.ts`
- [x] CRUD operations for chains
- [x] Update location count when stores added/removed
- [x] Get stores by chain

### 1.4 Update Store Service ✅
- [x] Update `createStore` to accept chainId
- [x] Update `getStores` to populate chain info
- [x] Add `getStoresByChain` method

### 1.5 Admin API Endpoints ✅
- [x] GET `/api/admin/chains` - List all chains
- [x] POST `/api/admin/chains` - Create chain
- [x] PUT `/api/admin/chains/:id` - Update chain
- [x] DELETE `/api/admin/chains/:id` - Delete chain (only if no stores)
- [x] GET `/api/admin/chains/:id/stores` - Get stores in chain
- [x] POST `/api/admin/stores/:id/assign-chain` - Assign store to chain
- [x] POST `/api/admin/stores/bulk-assign-chain` - Bulk assign stores

### 1.6 Admin UI - Store Management ✅
- [x] Add "Chains" tab or section to AdminStores
- [x] Grouped view: chains as collapsible sections with location counts
- [x] Chain management modal (create/edit)
- [x] Assign chain dropdown when editing stores
- [ ] Bulk assign selected stores to chain (future enhancement)

### 1.7 Client Types ✅
- [x] Add `StoreChain` type to `client/src/types/store.ts`
- [x] Update `Store` type with chainId, locationIdentifier
- [x] Add admin API types for chain management

---

## Phase 2: Selection UX (User-Facing) ✅

### 2.1 StoreAvailabilitySelector Updates ✅
- [x] Show chains as grouped options with location counts
- [x] Chain selection opens location picker panel
- [x] Location picker features:
  - [x] Search by city/ZIP
  - [x] List locations grouped by city
  - [ ] "Use my location" (geolocation) - future enhancement
- [x] Independent stores show directly (no chain step)

### 2.2 City Landing Pages ✅
- [x] Group stores by chain on city pages
- [x] Show "Kroger (3 locations)" with expandable list
- [x] Each location shows address, product count
- [x] Updated cityService to include chain data

### 2.3 Product Detail Page ✅
- [x] Group "Where to Buy" by chain
- [x] Show specific location addresses under chain
- [x] Updated productService and userProductService to include chain info

### 2.4 Public Stores API ✅
- [x] Update `/api/stores` to support chain grouping (`/api/stores/grouped`)
- [x] Add `/api/stores/chains` public endpoint
- [x] Add `/api/stores/chains/:id/locations` with location filtering

### 2.5 Migration Script ✅
- [x] Created `createChainsFromStores.ts` to auto-detect chains from existing stores
- [x] Ran script to create 6 chains and assign 20 stores

---

## Phase 3: Smart Features (Future)

- [ ] Geolocation: "Find nearest [Chain]"
- [ ] User preferences: Remember preferred locations
- [ ] "Available at any [Chain]" badges
- [ ] Chain-level product availability aggregation

---

## UI Mockups

### Admin Stores - Grouped View

```
┌─────────────────────────────────────────────────────────────────┐
│ Store Management                           [+ Add Store] [+ Add Chain]
│ 147 stores total (5 chains, 42 independent)
├─────────────────────────────────────────────────────────────────┤
│ View: [Grouped ▼]  Filter: [All Types ▼]  Search: [________]
├─────────────────────────────────────────────────────────────────┤
│
│ 🏬 CHAINS
│ ├─ ▼ Kroger (47 locations)                          [Edit Chain]
│ │    ├─ Kroger #1234 — 123 Main St, Columbus, OH     [Edit] [🗑️]
│ │    ├─ Kroger #5678 — 456 High St, Columbus, OH     [Edit] [🗑️]
│ │    └─ ... (45 more)                                [Show All]
│ │
│ ├─ ▶ Whole Foods Market (12 locations)              [Edit Chain]
│ ├─ ▶ Target (8 locations)                           [Edit Chain]
│ └─ ▶ Trader Joe's (5 locations)                     [Edit Chain]
│
│ 🏪 INDEPENDENT STORES
│ ├─ Clintonville Natural Foods — Columbus, OH         [Edit] [🗑️]
│ ├─ Lucky's Market — Columbus, OH                     [Edit] [🗑️]
│ └─ ... (40 more)
│
└─────────────────────────────────────────────────────────────────┘
```

### Store Selection (Adding Product Availability)

```
Step 1: Select Store or Chain
┌─────────────────────────────────────────┐
│ 🔍 Search stores...                     │
├─────────────────────────────────────────┤
│ 🏬 CHAINS                               │
│   Kroger (47 locations)              →  │
│   Whole Foods (12 locations)         →  │
│   Target (8 locations)               →  │
│                                         │
│ 🏪 STORES                               │
│   Clintonville Natural Foods            │
│   Lucky's Market                        │
│ 🌐 ONLINE                               │
│   Amazon                                │
│   Thrive Market                         │
└─────────────────────────────────────────┘

Step 2: Select Location (after clicking chain)
┌─────────────────────────────────────────┐
│ ← Back                    Kroger        │
├─────────────────────────────────────────┤
│ 📍 Use my location                      │
│ 🔍 Search city or ZIP...                │
├─────────────────────────────────────────┤
│ Columbus, OH (12 locations)             │
│   ○ #1234 — 123 Main St                │
│   ○ #5678 — 456 High St                │
│   ○ Downtown — 789 Broad St            │
│                                         │
│ Dublin, OH (3 locations)                │
│   ○ #2222 — 100 Bridge St              │
└─────────────────────────────────────────┘
```

---

## Migration Strategy

1. **No breaking changes**: chainId is optional, existing stores work as-is
2. **Admin can assign chains**: Manually assign existing stores to chains
3. **Future**: Script to auto-detect and suggest chain assignments based on name patterns

---

## Files to Create/Modify

### Server (Phase 1)
- `server/src/models/StoreChain.ts` (new)
- `server/src/models/Store.ts` (modify)
- `server/src/models/index.ts` (modify)
- `server/src/services/storeChainService.ts` (new)
- `server/src/services/storeService.ts` (modify)
- `server/src/services/adminService.ts` (modify)
- `server/src/routes/admin.ts` (modify)

### Client (Phase 1)
- `client/src/types/store.ts` (modify)
- `client/src/api/adminApi.ts` (modify)
- `client/src/screens/admin/AdminStores.tsx` (modify)
- `client/src/screens/admin/AdminStores.css` (modify)
- `client/src/components/Admin/ChainModal.tsx` (new)

### Client (Phase 2)
- `client/src/components/Products/StoreAvailabilitySelector.tsx` (modify)
- `client/src/components/Products/ChainLocationPicker.tsx` (new)
- `client/src/screens/CityLandingScreen.tsx` (modify)
- `client/src/screens/ProductDetailScreen.tsx` (modify)
