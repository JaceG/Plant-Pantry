/**
 * Google Places API Service
 * 
 * Integrates with Google Places API for location search and autocomplete
 */

// Read API key from environment - ensure dotenv is loaded before this module
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

// Debug: Log if API key is loaded (without exposing the key)
if (!GOOGLE_API_KEY) {
  console.warn('⚠️  GOOGLE_API_KEY is not set in environment variables');
  console.warn('   Make sure .env file exists and contains GOOGLE_API_KEY=your_key');
} else {
  console.log('✅ Google Places API key loaded successfully');
}

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  website?: string;
  formatted_phone_number?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface PlaceAutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export const googlePlacesService = {
  /**
   * Search for places using Google Places Autocomplete API
   * 
   * Documentation: https://developers.google.com/maps/documentation/places/web-service/autocomplete
   */
  async autocompletePlaces(
    input: string,
    types?: string[],
    location?: { lat: number; lng: number },
    radius?: number
  ): Promise<PlaceAutocompletePrediction[]> {
    if (!GOOGLE_API_KEY) {
      console.warn('GOOGLE_API_KEY not configured, skipping Google Places API call');
      return [];
    }

    if (!input || input.trim().length < 2) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        input: input.trim(),
        key: GOOGLE_API_KEY,
      });

      // Add types parameter if provided (use 'establishment' as default for stores)
      if (types && types.length > 0) {
        params.set('types', types.join('|'));
      } else {
        params.set('types', 'establishment'); // Default to establishments (stores, businesses)
      }

      // Add location bias if provided
      if (location && radius) {
        params.set('location', `${location.lat},${location.lng}`);
        params.set('radius', radius.toString());
      }

      const url = `${GOOGLE_PLACES_API_BASE}/autocomplete/json?${params.toString()}`;
      console.log('Calling Google Places Autocomplete:', url.replace(GOOGLE_API_KEY, 'HIDDEN'));

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Places API HTTP error: ${response.status}`, errorText);
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json() as {
        status: string;
        error_message?: string;
        predictions?: Array<{
          place_id: string;
          description: string;
          structured_formatting?: {
            main_text: string;
            secondary_text: string;
          };
        }>;
      };

      // Handle different response statuses
      if (data.status === 'ZERO_RESULTS') {
        return [];
      }

      if (data.status !== 'OK') {
        console.error('Google Places API error:', data.status, data.error_message || 'Unknown error');
        // Return empty array for non-critical errors
        if (data.status === 'REQUEST_DENIED') {
          console.error('API key may be invalid or missing required permissions');
        }
        return [];
      }

      // Map predictions to our format
      const predictions: PlaceAutocompletePrediction[] = (data.predictions || []).map((pred) => ({
        place_id: pred.place_id,
        description: pred.description,
        structured_formatting: {
          main_text: pred.structured_formatting?.main_text || pred.description.split(',')[0],
          secondary_text: pred.structured_formatting?.secondary_text || pred.description.split(',').slice(1).join(',').trim(),
        },
      }));

      return predictions;
    } catch (error) {
      console.error('Error calling Google Places Autocomplete API:', error);
      return [];
    }
  },

  /**
   * Get place details by place_id
   * 
   * Documentation: https://developers.google.com/maps/documentation/places/web-service/details
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlaceResult | null> {
    if (!GOOGLE_API_KEY) {
      console.warn('GOOGLE_API_KEY not configured, skipping Google Places API call');
      return null;
    }

    if (!placeId || placeId.trim().length === 0) {
      console.error('Invalid place_id provided');
      return null;
    }

    try {
      // Fields parameter must be comma-separated (no spaces)
      const fields = [
        'place_id',
        'name',
        'formatted_address',
        'geometry',
        'website',
        'formatted_phone_number',
        'address_components',
      ].join(',');

      const params = new URLSearchParams({
        place_id: placeId.trim(),
        key: GOOGLE_API_KEY,
        fields: fields,
      });

      const url = `${GOOGLE_PLACES_API_BASE}/details/json?${params.toString()}`;
      console.log('Calling Google Places Details:', url.replace(GOOGLE_API_KEY, 'HIDDEN'));

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Places API HTTP error: ${response.status}`, errorText);
        throw new Error(`Google Places API error: ${response.status}`);
      }

      const data = await response.json() as {
        status: string;
        error_message?: string;
        result?: GooglePlaceResult;
      };

      if (data.status !== 'OK') {
        console.error('Google Places API error:', data.status, data.error_message || 'Unknown error');
        if (data.status === 'REQUEST_DENIED') {
          console.error('API key may be invalid or missing required permissions');
        } else if (data.status === 'INVALID_REQUEST') {
          console.error('Invalid place_id or request format');
        }
        return null;
      }

      return data.result || null;
    } catch (error) {
      console.error('Error calling Google Places Details API:', error);
      return null;
    }
  },

  /**
   * Parse address components from Google Places result
   */
  parseAddressComponents(components: GooglePlaceResult['address_components']): {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  } {
    if (!components) {
      return {};
    }

    const result: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    } = {};

    for (const component of components) {
      // Handle street address (combine street_number and route)
      if (component.types.includes('street_number')) {
        result.street = component.long_name;
      }
      if (component.types.includes('route')) {
        result.street = result.street
          ? `${result.street} ${component.long_name}`
          : component.long_name;
      }
      // Handle city
      if (component.types.includes('locality')) {
        result.city = component.long_name;
      }
      // Handle state/province
      if (component.types.includes('administrative_area_level_1')) {
        result.state = component.short_name;
      }
      // Handle postal code
      if (component.types.includes('postal_code')) {
        result.zipCode = component.long_name;
      }
      // Handle country
      if (component.types.includes('country')) {
        result.country = component.short_name;
      }
    }

    return result;
  },
};

