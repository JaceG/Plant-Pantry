import { useState, useCallback } from "react";
import { productsApi } from "../../api/productsApi";
import { useAuth } from "../../context/AuthContext";
import { StockStatus } from "../../types/product";
import "./StockStatusButton.css";

interface StockStatusButtonProps {
  productId: string;
  storeId: string;
  storeName: string;
  currentStatus?: StockStatus;
  lastReportAt?: string;
  recentInStockCount?: number;
  recentOutOfStockCount?: number;
  compact?: boolean;
  onReportSuccess?: (newStatus: StockStatus) => void;
  onAuthRequired?: () => void;
}

export function StockStatusButton({
  productId,
  storeId,
  storeName,
  currentStatus = "unknown",
  lastReportAt,
  recentInStockCount = 0,
  recentOutOfStockCount = 0,
  compact = false,
  onReportSuccess,
  onAuthRequired,
}: StockStatusButtonProps) {
  const { isAuthenticated } = useAuth();
  const [isReporting, setIsReporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    "in_stock" | "out_of_stock" | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleReport = useCallback(
    async (status: "in_stock" | "out_of_stock") => {
      if (!isAuthenticated) {
        onAuthRequired?.();
        return;
      }

      setIsReporting(true);
      setMessage(null);

      try {
        const response = await productsApi.reportStockStatus(
          productId,
          storeId,
          status,
        );
        setMessage(response.message);
        onReportSuccess?.(response.stockStatus);

        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage(null);
          setShowConfirm(false);
          setPendingStatus(null);
        }, 3000);
      } catch (error: any) {
        setMessage(error?.message || "Failed to report status");
      } finally {
        setIsReporting(false);
      }
    },
    [productId, storeId, isAuthenticated, onReportSuccess, onAuthRequired],
  );

  const initiateReport = (status: "in_stock" | "out_of_stock") => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }
    setPendingStatus(status);
    setShowConfirm(true);
  };

  const confirmReport = () => {
    if (pendingStatus) {
      handleReport(pendingStatus);
    }
  };

  const cancelReport = () => {
    setShowConfirm(false);
    setPendingStatus(null);
  };

  // Format last report time
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

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "in_stock":
        return (
          <span className="status-badge status-in-stock">✅ In Stock</span>
        );
      case "out_of_stock":
        return (
          <span className="status-badge status-out-of-stock">
            ❌ Out of Stock
          </span>
        );
      default:
        return <span className="status-badge status-unknown">❓ Unknown</span>;
    }
  };

  const totalReports = recentInStockCount + recentOutOfStockCount;

  if (compact) {
    return (
      <div className="stock-status-compact">
        {getStatusBadge()}
        {lastReportAt && (
          <span className="last-report-time">
            {formatTimeAgo(lastReportAt)}
          </span>
        )}
        <div className="compact-actions">
          <button
            className="compact-btn in-stock"
            onClick={() => initiateReport("in_stock")}
            disabled={isReporting}
            title="Report: In stock now"
          >
            ✅
          </button>
          <button
            className="compact-btn out-of-stock"
            onClick={() => initiateReport("out_of_stock")}
            disabled={isReporting}
            title="Report: Out of stock"
          >
            ❌
          </button>
        </div>

        {showConfirm && (
          <div className="confirm-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-popup">
              <p>
                Report as{" "}
                <strong>
                  {pendingStatus === "in_stock" ? "In Stock" : "Out of Stock"}
                </strong>{" "}
                at {storeName}?
              </p>
              <div className="confirm-actions">
                <button onClick={cancelReport} className="cancel-btn">
                  Cancel
                </button>
                <button
                  onClick={confirmReport}
                  className="confirm-btn"
                  disabled={isReporting}
                >
                  {isReporting ? "Reporting..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {message && <div className="status-message">{message}</div>}
      </div>
    );
  }

  return (
    <div className="stock-status-button">
      <div className="status-header">
        <div className="current-status">
          {getStatusBadge()}
          {lastReportAt && (
            <span className="last-report">
              Reported {formatTimeAgo(lastReportAt)}
            </span>
          )}
        </div>
        {totalReports > 1 && (
          <div className="report-summary">
            <span className="report-activity">
              {totalReports} reports this week
            </span>
          </div>
        )}
      </div>

      {message ? (
        <div className="status-message success">{message}</div>
      ) : showConfirm ? (
        <div className="confirm-section">
          <p className="confirm-text">
            Report{" "}
            <strong>
              {pendingStatus === "in_stock" ? "In Stock" : "Out of Stock"}
            </strong>{" "}
            at <strong>{storeName}</strong>?
          </p>
          <div className="confirm-actions">
            <button onClick={cancelReport} className="cancel-btn">
              Cancel
            </button>
            <button
              onClick={confirmReport}
              className={`confirm-btn ${
                pendingStatus === "in_stock" ? "in-stock" : "out-of-stock"
              }`}
              disabled={isReporting}
            >
              {isReporting ? "Reporting..." : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
        <div className="action-buttons">
          <button
            className="report-btn in-stock"
            onClick={() => initiateReport("in_stock")}
            disabled={isReporting}
          >
            <span className="btn-icon">✅</span>
            <span className="btn-text">In stock now</span>
          </button>
          <button
            className="report-btn out-of-stock"
            onClick={() => initiateReport("out_of_stock")}
            disabled={isReporting}
          >
            <span className="btn-icon">❌</span>
            <span className="btn-text">Out of stock</span>
          </button>
        </div>
      )}
    </div>
  );
}
