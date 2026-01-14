import { useState, useCallback } from "react";
import { ShoppingListItem } from "../../types";
import { StockStatus } from "../../types/product";
import { ProductPreviewData } from "../Common";
import { productsApi } from "../../api/productsApi";
import { useAuth } from "../../context/AuthContext";
import "./ShoppingListItemCard.css";

interface ShoppingListItemCardProps {
  item: ShoppingListItem;
  onRemove: (itemId: string) => void;
  isRemoving: boolean;
  onPreview?: (product: ProductPreviewData) => void;
  onAuthRequired?: () => void;
}

export function ShoppingListItemCard({
  item,
  onRemove,
  isRemoving,
  onPreview,
  onAuthRequired,
}: ShoppingListItemCardProps) {
  const { productSummary, quantity, note, availabilityHints } = item;
  const { isAuthenticated } = useAuth();

  // Track local stock status updates
  const [stockStatuses, setStockStatuses] = useState<
    Record<string, StockStatus>
  >(() => {
    const initial: Record<string, StockStatus> = {};
    availabilityHints.forEach((hint) => {
      if (hint.storeId && hint.stockStatus) {
        initial[hint.storeId] = hint.stockStatus;
      }
    });
    return initial;
  });

  const [reportingStoreId, setReportingStoreId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    storeId: string;
    text: string;
  } | null>(null);

  const handleReportStatus = useCallback(
    async (
      e: React.MouseEvent,
      storeId: string,
      status: "in_stock" | "out_of_stock",
    ) => {
      e.stopPropagation();

      if (!isAuthenticated) {
        onAuthRequired?.();
        return;
      }

      setReportingStoreId(storeId);

      try {
        const response = await productsApi.reportStockStatus(
          item.productId,
          storeId,
          status,
        );

        // Update local state
        setStockStatuses((prev) => ({
          ...prev,
          [storeId]: response.stockStatus,
        }));

        setMessage({ storeId, text: response.message });

        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } catch (error: any) {
        setMessage({
          storeId,
          text: error?.message || "Failed to report",
        });
      } finally {
        setReportingStoreId(null);
      }
    },
    [item.productId, isAuthenticated, onAuthRequired],
  );

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest(".list-item-remove") ||
      target.closest(".stock-action-btn")
    ) {
      return;
    }
    onPreview?.({
      id: item.productId,
      name: productSummary.name,
      brand: productSummary.brand,
      sizeOrVariant: productSummary.sizeOrVariant,
      imageUrl: productSummary.imageUrl,
    });
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStockStatusBadge = (status?: StockStatus) => {
    switch (status) {
      case "in_stock":
        return <span className="stock-badge stock-in">✅</span>;
      case "out_of_stock":
        return <span className="stock-badge stock-out">❌</span>;
      default:
        return <span className="stock-badge stock-unknown">❓</span>;
    }
  };

  return (
    <div
      className={`list-item-card ${isRemoving ? "removing" : ""}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPreview?.({
            id: item.productId,
            name: productSummary.name,
            brand: productSummary.brand,
            sizeOrVariant: productSummary.sizeOrVariant,
            imageUrl: productSummary.imageUrl,
          });
        }
      }}
    >
      <div className="list-item-image-container">
        {productSummary.imageUrl ? (
          <img
            src={productSummary.imageUrl}
            alt={productSummary.name}
            className="list-item-image"
          />
        ) : (
          <div className="list-item-image-placeholder">🌿</div>
        )}
      </div>

      <div className="list-item-content">
        <div className="list-item-header">
          <span className="list-item-brand">{productSummary.brand}</span>
          <span className="list-item-quantity">×{quantity}</span>
        </div>

        <h4 className="list-item-name">{productSummary.name}</h4>
        <span className="list-item-size">{productSummary.sizeOrVariant}</span>

        {note && <p className="list-item-note">{note}</p>}

        {availabilityHints.length > 0 && (
          <div className="list-item-availability">
            <span className="availability-label">Check availability:</span>
            <div className="availability-stores-list">
              {availabilityHints.slice(0, 3).map((hint, idx) => {
                const currentStatus =
                  stockStatuses[hint.storeId] || hint.stockStatus;
                const isReporting = reportingStoreId === hint.storeId;
                const storeMessage =
                  message?.storeId === hint.storeId ? message.text : null;

                return (
                  <div key={idx} className="availability-store-row">
                    <div className="store-info">
                      {getStockStatusBadge(currentStatus)}
                      <span className="store-name">{hint.storeName}</span>
                      {hint.lastStockReportAt && (
                        <span className="last-report">
                          {formatTimeAgo(hint.lastStockReportAt)}
                        </span>
                      )}
                    </div>
                    <div className="stock-actions">
                      {storeMessage ? (
                        <span className="stock-message">{storeMessage}</span>
                      ) : (
                        <>
                          <button
                            className="stock-action-btn in-stock"
                            onClick={(e) =>
                              handleReportStatus(e, hint.storeId, "in_stock")
                            }
                            disabled={isReporting}
                            title="Report: In stock now"
                          >
                            ✅
                          </button>
                          <button
                            className="stock-action-btn out-of-stock"
                            onClick={(e) =>
                              handleReportStatus(
                                e,
                                hint.storeId,
                                "out_of_stock",
                              )
                            }
                            disabled={isReporting}
                            title="Report: Out of stock"
                          >
                            ❌
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {availabilityHints.length > 3 && (
                <span className="availability-more">
                  +{availabilityHints.length - 3} more stores
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        className="list-item-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.itemId);
        }}
        disabled={isRemoving}
        aria-label="Remove item"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}
