import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { adminApi, AdminBrand, BrandRef } from "../../api/adminApi";
import { AdminLayout } from "./AdminLayout";
import { Button } from "../../components/Common/Button";
import { Toast } from "../../components/Common/Toast";
import "./AdminBrands.css";

const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export function AdminUnassignedBrands() {
  const [unassignedBrands, setUnassignedBrands] = useState<AdminBrand[]>([]);
  const [officialBrandRefs, setOfficialBrandRefs] = useState<BrandRef[]>([]);
  const [letterCounts, setLetterCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string>("A");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const prevSearchQueryRef = useRef<string>("");

  // Selected brands for bulk assignment
  const [selectedBrandIds, setSelectedBrandIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignParentId, setBulkAssignParentId] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

  // Single brand assignment modal
  const [assigningBrand, setAssigningBrand] = useState<AdminBrand | null>(null);
  const [assignParentId, setAssignParentId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Fetch brands
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const [brandsRes, officialRes] = await Promise.all([
        adminApi.getBrands(
          searchQuery.trim()
            ? {} // No letter filter when searching
            : { letter: selectedLetter },
        ),
        adminApi.getOfficialBrands(),
      ]);

      setUnassignedBrands(brandsRes.unassignedBrands || []);
      setLetterCounts(brandsRes.letterCounts || {});
      setOfficialBrandRefs(officialRes.brands);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [selectedLetter, searchQuery]);

  // Refetch when letter changes (only if search is empty)
  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchBrands();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLetter]);

  // Refetch when search transitions between empty and non-empty
  useEffect(() => {
    const searchWasEmpty = !prevSearchQueryRef.current.trim();
    const searchIsEmpty = !searchQuery.trim();
    const searchTransitioned =
      (searchWasEmpty && !searchIsEmpty) || (!searchWasEmpty && searchIsEmpty);

    if (searchTransitioned || prevSearchQueryRef.current === "") {
      fetchBrands();
    }

    prevSearchQueryRef.current = searchQuery;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Filter brands by search query
  const filteredUnassignedBrands = unassignedBrands.filter(
    (brand) =>
      brand.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get unique key for a brand (use id if available, otherwise brandName)
  const getBrandKey = (brand: AdminBrand) => brand.id || brand.brandName;

  // Toggle brand selection
  const toggleBrandSelection = (brand: AdminBrand) => {
    const key = getBrandKey(brand);
    setSelectedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select all unassigned brands on current page
  const selectAllUnassigned = () => {
    setSelectedBrandIds(
      new Set(filteredUnassignedBrands.map((b) => getBrandKey(b))),
    );
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedBrandIds(new Set());
  };

  // Toggle official status (make brand official)
  const handleMakeOfficial = async (brand: AdminBrand) => {
    try {
      await adminApi.setBrandOfficial(
        brand.id,
        true,
        brand.id ? undefined : brand.brandName,
      );
      setToast({
        message: `"${brand.displayName}" is now an official brand`,
        type: "success",
      });
      fetchBrands();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to update brand",
        type: "error",
      });
    }
  };

  // Open assign parent modal
  const openAssignModal = (brand: AdminBrand) => {
    setAssigningBrand(brand);
    setAssignParentId(brand.parentBrand?.id || "");
  };

  // Assign parent brand
  const handleAssignParent = async () => {
    if (!assigningBrand) return;

    setAssignLoading(true);
    try {
      await adminApi.assignBrandParent(
        assigningBrand.id,
        assignParentId || null,
        assigningBrand.id ? undefined : assigningBrand.brandName,
      );
      setToast({
        message: assignParentId
          ? `"${assigningBrand.displayName}" assigned to parent brand`
          : `"${assigningBrand.displayName}" unassigned from parent`,
        type: "success",
      });
      setAssigningBrand(null);
      fetchBrands();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to assign brand",
        type: "error",
      });
    } finally {
      setAssignLoading(false);
    }
  };

  // Bulk assign brands
  const handleBulkAssign = async () => {
    if (!bulkAssignParentId || selectedBrandIds.size === 0) return;

    setBulkAssignLoading(true);
    try {
      const result = await adminApi.bulkAssignBrandChildren(
        bulkAssignParentId,
        Array.from(selectedBrandIds),
      );
      setToast({
        message: result.message,
        type: result.modifiedCount > 0 ? "success" : "info",
      });
      setShowBulkAssignModal(false);
      setSelectedBrandIds(new Set());
      setBulkAssignParentId("");
      fetchBrands();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Failed to assign brands",
        type: "error",
      });
    } finally {
      setBulkAssignLoading(false);
    }
  };

  // Calculate totals
  const totalUnassigned = Object.values(letterCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  if (loading && unassignedBrands.length === 0) {
    return (
      <AdminLayout>
        <div className="admin-loading">
          <div className="loading-spinner" />
          <span>Loading unassigned brands...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-error">
          <h2>Error</h2>
          <p>{error}</p>
          <Button onClick={fetchBrands}>Retry</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-brands">
        <header className="admin-header">
          <div className="header-left">
            <div className="breadcrumb">
              <Link to="/admin/brands" className="breadcrumb-link">
                Brands
              </Link>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">Unassigned Brands</span>
            </div>
            <h1>Unassigned Brands</h1>
            <p className="header-subtitle">
              Assign brand variations to official brands or make them official
            </p>
          </div>
        </header>

        {/* Stats Row */}
        <div className="brands-stats">
          <div className="stat-box warning">
            <span className="stat-value">{totalUnassigned}</span>
            <span className="stat-label">Unassigned</span>
          </div>
        </div>

        {/* Search */}
        <div className="brands-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search unassigned brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Letter Pagination */}
        <div className="letter-pagination">
          {LETTERS.map((letter) => (
            <button
              key={letter}
              className={`letter-tab ${
                selectedLetter === letter ? "active" : ""
              } ${(letterCounts[letter] || 0) === 0 ? "empty" : ""}`}
              onClick={() => {
                setSelectedLetter(letter);
                setSelectedBrandIds(new Set());
              }}
            >
              <span className="letter-char">{letter}</span>
              {(letterCounts[letter] || 0) > 0 && (
                <span className="letter-count">{letterCounts[letter]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk Actions Toolbar */}
        <div className="bulk-actions-toolbar">
          {selectedBrandIds.size > 0 ? (
            <>
              <span className="selection-count">
                {selectedBrandIds.size} selected
              </span>
              <Button variant="secondary" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowBulkAssignModal(true)}
              >
                Assign to Official Brand
              </Button>
            </>
          ) : (
            filteredUnassignedBrands.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={selectAllUnassigned}
              >
                Select All on Page
              </Button>
            )
          )}
        </div>

        {/* Unassigned Brands Section */}
        <section className="brands-section">
          <div className="section-header">
            <h2>
              {searchQuery.trim()
                ? `Results (${filteredUnassignedBrands.length})`
                : `${selectedLetter} (${letterCounts[selectedLetter] || 0})`}
            </h2>
          </div>

          {/* Unassigned Brands List */}
          <div className="brands-list">
            {filteredUnassignedBrands.length === 0 ? (
              <div className="empty-state">
                <p>
                  {searchQuery.trim()
                    ? `No unassigned brands found matching "${searchQuery}"`
                    : `No unassigned brands starting with "${selectedLetter}"`}
                </p>
              </div>
            ) : (
              filteredUnassignedBrands.map((brand) => (
                <div
                  key={getBrandKey(brand)}
                  className={`brand-row ${
                    selectedBrandIds.has(getBrandKey(brand)) ? "selected" : ""
                  }`}
                >
                  <div className="brand-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedBrandIds.has(getBrandKey(brand))}
                      onChange={() => toggleBrandSelection(brand)}
                    />
                  </div>

                  <div className="brand-info">
                    <div className="brand-name-row">
                      <Link
                        to={`/brands/${encodeURIComponent(brand.brandName)}`}
                        className="brand-display-name brand-link"
                      >
                        {brand.displayName}
                      </Link>
                      <span className="product-count">
                        {brand.productCount} product
                        {brand.productCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {brand.brandName !== brand.displayName && (
                      <span className="brand-name-raw">
                        DB: {brand.brandName}
                      </span>
                    )}
                  </div>

                  <div className="brand-actions">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAssignModal(brand)}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleMakeOfficial(brand)}
                    >
                      Make Official
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Assign Parent Modal */}
        {assigningBrand && (
          <div
            className="modal-overlay"
            onClick={() => setAssigningBrand(null)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Assign "{assigningBrand.displayName}" to Official Brand</h3>
              <p className="modal-description">
                Products from this brand will appear on the official brand's
                page.
              </p>

              <select
                value={assignParentId}
                onChange={(e) => setAssignParentId(e.target.value)}
                className="parent-select"
              >
                <option value="">-- No parent (unassign) --</option>
                {officialBrandRefs
                  .filter((ob) => ob.id !== assigningBrand.id)
                  .sort((a, b) => a.displayName.localeCompare(b.displayName))
                  .map((ob) => (
                    <option key={ob.id} value={ob.id}>
                      {ob.displayName}
                    </option>
                  ))}
              </select>

              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => setAssigningBrand(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAssignParent}
                  disabled={assignLoading}
                >
                  {assignLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Assign Modal */}
        {showBulkAssignModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowBulkAssignModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>
                Assign {selectedBrandIds.size} Brand
                {selectedBrandIds.size !== 1 ? "s" : ""} to Official Brand
              </h3>
              <p className="modal-description">
                All selected brands will be linked to the chosen official brand.
                Their products will appear on the official brand's page.
              </p>

              <select
                value={bulkAssignParentId}
                onChange={(e) => setBulkAssignParentId(e.target.value)}
                className="parent-select"
              >
                <option value="">-- Select official brand --</option>
                {[...officialBrandRefs]
                  .sort((a, b) => a.displayName.localeCompare(b.displayName))
                  .map((ob) => (
                    <option key={ob.id} value={ob.id}>
                      {ob.displayName}
                    </option>
                  ))}
              </select>

              <div className="modal-actions">
                <Button
                  variant="secondary"
                  onClick={() => setShowBulkAssignModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleBulkAssign}
                  disabled={bulkAssignLoading || !bulkAssignParentId}
                >
                  {bulkAssignLoading ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
