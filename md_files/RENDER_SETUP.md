# Render Deployment Setup for Sitemap

## Sitemap Configuration

The sitemap is automatically generated during the build process. The build script fetches the sitemap from your backend and includes it as a static file.

### Automatic Setup (Recommended)

The build script is already configured with your backend URL (`https://plant-pantry-be0g.onrender.com`) as the default. No additional configuration needed!

The sitemap will be:
1. Fetched from your backend during build
2. Saved as `client/public/sitemap.xml`
3. Included in your build output
4. Accessible at `https://theveganaisle.com/sitemap.xml`

### Optional: Environment Variable

If you want to override the backend URL, add this environment variable in your Render dashboard:

- **Key**: `BACKEND_URL`
- **Value**: `https://plant-pantry-be0g.onrender.com`

### Build Process

The build runs these steps automatically:
1. `prebuild` - Generates sitemap.xml from backend
2. `build` - Builds your React app (includes the generated sitemap)

### Verifying It Works

After deployment, test the sitemap:
```bash
curl https://theveganaisle.com/sitemap.xml
```

Or visit `https://theveganaisle.com/sitemap.xml` in your browser.

## Troubleshooting

**If sitemap is not found:**
- Check that the build completed successfully
- Verify the backend is accessible during build time
- Check build logs for sitemap generation messages

**If backend is not accessible during build:**
- The script will create a fallback sitemap with just the homepage
- Check your backend URL is correct
- Ensure your backend allows requests from Render's build servers
