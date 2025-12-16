# Sitemap Domain Configuration

## Important: Ensuring Correct Domain in Sitemap

The sitemap **must** use your canonical domain (`theveganaisle.com` - without www) and **never** use Render URLs. This ensures Google indexes your actual website, not the Render deployment URL.

**Note:** Your hosting is configured to redirect `www.theveganaisle.com` → `theveganaisle.com`, so the sitemap must use non-www URLs to avoid redirect issues with Google.

## How It Works

1. **Backend Sitemap Generator** (`server/src/routes/sitemap.ts`):
   - Uses `CANONICAL_URL` or `CLIENT_URL` environment variable from your backend
   - Has a safety check that prevents Render URLs from being used
   - Defaults to `https://theveganaisle.com` if not set or contains Render URL

2. **Frontend Build Script** (`client/scripts/generate-sitemap.js`):
   - Fetches the sitemap from your backend during build
   - The URLs in the sitemap are whatever the backend generates
   - Since backend uses the canonical domain, the sitemap will have correct URLs

## Required Configuration

### Backend Environment Variable

Make sure your **backend** has the correct environment variable set in Render:

**In Render Dashboard → Your Backend Service → Environment:**
- **Key**: `CANONICAL_URL` (or `CLIENT_URL`)
- **Value**: `https://theveganaisle.com` (no www - matches your redirect configuration)

### Verify It's Working

1. **Check the backend sitemap directly:**
   ```bash
   curl https://plant-pantry-be0g.onrender.com/sitemap.xml | head -20
   ```
   
   Look for URLs like:
   - ✅ `https://theveganaisle.com/products/...`
   - ❌ NOT `https://www.theveganaisle.com/products/...` (would cause redirect issues)
   - ❌ NOT `https://plant-pantry-frontend.onrender.com/products/...`

2. **After frontend build, check the static sitemap:**
   ```bash
   curl https://theveganaisle.com/sitemap.xml | head -20
   ```
   
   Should show the same correct URLs.

## Safety Features

The sitemap generator has built-in protection:
- If `CLIENT_URL` contains "onrender.com" or "render.com", it automatically uses `https://theveganaisle.com`
- This prevents accidental use of Render URLs in the sitemap

## Why Non-www?

Your hosting is configured to redirect www → non-www. This means:
- `theveganaisle.com` = canonical (indexed by Google)
- `www.theveganaisle.com` = redirects to non-www (won't be indexed directly)

**The sitemap must match the canonical URL** to avoid "Page with redirect" issues in Google Search Console.

## Important Notes

- The Render frontend URL (`plant-pantry-frontend.onrender.com`) should **never** appear in your sitemap
- Google should only index your canonical domain (`theveganaisle.com`)
- Make sure your domain is properly configured in Render to point to your frontend service
- The www redirect is handled at the hosting/DNS level
