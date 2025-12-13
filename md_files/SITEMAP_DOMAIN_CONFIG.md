# Sitemap Domain Configuration

## Important: Ensuring Correct Domain in Sitemap

The sitemap **must** use your canonical domain (`www.theveganaisle.com` or `theveganaisle.com`) and **never** use Render URLs. This ensures Google indexes your actual website, not the Render deployment URL.

## How It Works

1. **Backend Sitemap Generator** (`server/src/routes/sitemap.ts`):
   - Uses `CLIENT_URL` environment variable from your backend
   - Has a safety check that prevents Render URLs from being used
   - Defaults to `https://www.theveganaisle.com` if CLIENT_URL is not set or contains Render URL

2. **Frontend Build Script** (`client/scripts/generate-sitemap.js`):
   - Fetches the sitemap from your backend during build
   - The URLs in the sitemap are whatever the backend generates
   - Since backend uses CLIENT_URL, the sitemap will have correct URLs

## Required Configuration

### Backend Environment Variable

Make sure your **backend** has the correct `CLIENT_URL` environment variable set in Render:

**In Render Dashboard → Your Backend Service → Environment:**
- **Key**: `CLIENT_URL`
- **Value**: `https://www.theveganaisle.com` (or `https://theveganaisle.com` if you prefer non-www)

### Verify It's Working

1. **Check the backend sitemap directly:**
   ```bash
   curl https://plant-pantry-be0g.onrender.com/sitemap.xml | head -20
   ```
   
   Look for URLs like:
   - ✅ `https://www.theveganaisle.com/products/...`
   - ❌ NOT `https://plant-pantry-frontend.onrender.com/products/...`

2. **After frontend build, check the static sitemap:**
   ```bash
   curl https://theveganaisle.com/sitemap.xml | head -20
   ```
   
   Should show the same correct URLs.

## Safety Features

The sitemap generator has built-in protection:
- If `CLIENT_URL` contains "onrender.com" or "render.com", it automatically uses `https://www.theveganaisle.com`
- This prevents accidental use of Render URLs in the sitemap

## Choosing www vs non-www

**Recommendation: Use `www.theveganaisle.com`**
- More professional appearance
- Better for email addresses (www@theveganaisle.com)
- Easier to set up cookies for subdomains
- More common convention

If you prefer non-www, set `CLIENT_URL=https://theveganaisle.com` in your backend.

## Important Notes

- The Render frontend URL (`plant-pantry-frontend.onrender.com`) should **never** appear in your sitemap
- Google should only index your canonical domain
- Make sure your domain is properly configured in Render to point to your frontend service
- Set up redirects so both www and non-www work (choose one as canonical)
