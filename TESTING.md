# 🧪 Testing PlantPantry

## Quick Start

### 1. Start Backend Server

```bash
cd server
npm run dev
```

The server will start on **http://localhost:5001**

You should see:
```
✅ Connected to MongoDB
🚀 Server running on port 5001
```

### 2. Start Frontend Client

Open a **new terminal window** and run:

```bash
cd client
npm run dev
```

The frontend will start on **http://localhost:5173**

### 3. Open in Browser

Navigate to: **http://localhost:5173**

---

## 🧪 What to Test

### ✅ Basic Functionality

1. **Home Page**
   - Should show product cards
   - Products should have images, names, brands
   - Should be able to scroll through products

2. **Search**
   - Type in the search bar
   - Should filter products in real-time
   - Try searching for: "chocolate", "milk", "cheese"

3. **Category Filter**
   - Click category buttons
   - Products should filter by category
   - Try: "Food", "Beverages", etc.

4. **Product Detail Page**
   - Click on any product card
   - Should show:
     - Product image
     - Name and brand
     - Categories and tags
     - Nutrition info (if available)
     - Store availability (if you ran `npm run create:availability`)

5. **Shopping List**
   - Click "Add to List" on a product
   - Navigate to Shopping List page
   - Should see the product in your list
   - Can remove items

### 🔍 API Endpoints to Test

You can test these directly in your browser or with curl:

```bash
# Health check
curl http://localhost:5001/api/health

# Get products (first page)
curl http://localhost:5001/api/products

# Search products
curl "http://localhost:5001/api/products?q=chocolate"

# Get product by ID (replace with actual ID)
curl http://localhost:5001/api/products/<product-id>

# Get categories
curl http://localhost:5001/api/products/categories

# Get stores
curl http://localhost:5001/api/stores
```

### 🐛 Common Issues

**Backend won't start:**
- Check MongoDB connection string in `server/.env`
- Make sure MongoDB Atlas IP is whitelisted
- Check if port 5001 is available

**Frontend can't connect to backend:**
- Make sure backend is running on port 5001
- Check `client/vite.config.ts` proxy settings
- Check browser console for CORS errors

**No products showing:**
- Check if products were imported: `curl http://localhost:5001/api/products`
- If empty, products need to be imported via MongoDB Compass or script

**Products show but no images:**
- Images are hosted by Open Food Facts
- Some products might not have images
- Check browser console for image loading errors

---

## 📊 Expected Results

- **Products**: ~25,285 products should be available
- **Categories**: Multiple categories (Food, Beverages, etc.)
- **Search**: Should work instantly
- **Images**: Most products should have images
- **Performance**: Pages should load quickly (< 1 second)

---

## 🎯 Next Steps After Testing

If everything works:
1. ✅ Run `npm run create:availability` to add store data
2. ✅ Test the shopping list feature
3. ✅ Try different search queries
4. ✅ Test on mobile (responsive design)

If something doesn't work:
- Check the browser console (F12)
- Check the backend terminal for errors
- Check MongoDB Atlas dashboard to verify data

