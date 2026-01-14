import { Helmet } from "react-helmet-async";

const BASE_URL = "https://theveganaisle.com";
const DEFAULT_TITLE =
  "The Vegan Aisle - Discover Vegan Groceries & Find Where to Buy Them";
const DEFAULT_DESCRIPTION =
  "Browse thousands of plant-based products and find where to buy them. Discover vegan groceries across brick-and-mortar stores, online retailers, and direct-from-brand sites.";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

interface SEOProps {
  /** Page title - will be appended with " - The Vegan Aisle" unless it's the default */
  title?: string;
  /** Meta description */
  description?: string;
  /** Canonical URL path (e.g., "/products/123" or "/brands/beyond-meat") */
  canonicalPath?: string;
  /** Full canonical URL override (for edge cases) */
  canonicalUrl?: string;
  /** Open Graph image URL */
  image?: string;
  /** Set to true to add noindex meta tag (for error pages, redirecting pages) */
  noindex?: boolean;
  /** Page type for Open Graph */
  type?: "website" | "article" | "product";
  /** Additional structured data (JSON-LD) */
  structuredData?: object;
}

/**
 * SEO component for managing page-level meta tags.
 *
 * Use this component to:
 * - Set dynamic titles and descriptions per page
 * - Set proper canonical URLs (important for avoiding duplicate content)
 * - Add noindex to error pages (prevents soft 404s in Google)
 * - Add structured data for rich snippets
 *
 * @example
 * // Normal page
 * <SEO
 *   title="Beyond Meat Products"
 *   description="Find all Beyond Meat vegan products and where to buy them"
 *   canonicalPath="/brands/beyond-meat"
 * />
 *
 * @example
 * // Error/not found page (prevents Google soft 404)
 * <SEO
 *   title="Product Not Found"
 *   noindex={true}
 * />
 */
export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  canonicalUrl,
  image = DEFAULT_IMAGE,
  noindex = false,
  type = "website",
  structuredData,
}: SEOProps) {
  // Format title: append site name unless it's the default or already includes it
  const formattedTitle = title
    ? title.includes("The Vegan Aisle")
      ? title
      : `${title} - The Vegan Aisle`
    : DEFAULT_TITLE;

  // Determine canonical URL
  const canonical =
    canonicalUrl || (canonicalPath ? `${BASE_URL}${canonicalPath}` : BASE_URL);

  // Ensure image is absolute URL
  const absoluteImage = image.startsWith("http")
    ? image
    : `${BASE_URL}${image}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{formattedTitle}</title>
      <meta name="title" content={formattedTitle} />
      <meta name="description" content={description} />

      {/* Robots directive - noindex for error pages */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical URL - critical for SEO */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={formattedTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={formattedTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
