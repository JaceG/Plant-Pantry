/**
 * Simple event system for product updates across the app.
 * When a product is created, updated, or deleted, emit an event
 * so other components can refresh their data.
 */

type ProductEventType =
  | "product:created"
  | "product:updated"
  | "product:deleted";

interface ProductEventDetail {
  productId?: string;
  timestamp: number;
}

class ProductEventEmitter {
  private listeners: Map<
    ProductEventType,
    Set<(detail: ProductEventDetail) => void>
  > = new Map();

  emit(type: ProductEventType, productId?: string) {
    const detail: ProductEventDetail = {
      productId,
      timestamp: Date.now(),
    };

    console.log("[ProductEvents] Emitting:", type, productId, detail.timestamp);

    // Notify listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach((callback) => callback(detail));
    }

    // Also emit a generic 'product:changed' for components that want to refresh on any change
    if (type !== "product:updated") {
      const changedListeners = this.listeners.get("product:updated");
      if (changedListeners) {
        changedListeners.forEach((callback) => callback(detail));
      }
    }

    // Store last update time in sessionStorage so new page loads can check
    sessionStorage.setItem("productLastUpdated", detail.timestamp.toString());
  }

  on(type: ProductEventType, callback: (detail: ProductEventDetail) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  // Check if products have been updated since a given timestamp
  hasUpdatedSince(timestamp: number): boolean {
    const lastUpdated = sessionStorage.getItem("productLastUpdated");
    if (!lastUpdated) {
      console.log("[ProductEvents] hasUpdatedSince: no lastUpdated stored");
      return false;
    }
    const result = parseInt(lastUpdated, 10) > timestamp;
    console.log("[ProductEvents] hasUpdatedSince:", {
      timestamp,
      lastUpdated,
      result,
    });
    return result;
  }

  getLastUpdateTime(): number {
    const lastUpdated = sessionStorage.getItem("productLastUpdated");
    return lastUpdated ? parseInt(lastUpdated, 10) : 0;
  }
}

// Singleton instance
export const productEvents = new ProductEventEmitter();
