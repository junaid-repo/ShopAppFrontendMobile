// src/pages/ProductsPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../components/Modal';
import { useConfig } from "./ConfigProvider";
import { MdEdit, MdDelete } from "react-icons/md";

/**
 * Custom hook to debounce a value.
 * @param {any} value The value to debounce.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {any} The debounced value.
 */
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const ProductsPage = () => {
    // --- STATE MANAGEMENT ---

    // Original State
    const [products, setProducts] = useState([]); // Holds data for the CURRENT page only
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [costPrice, setCostPrice] = useState("");
    const [stock, setStock] = useState("");
    const [tax, setTax] = useState("");
    const [selectedProductId, setSelectedProductId] = useState(null);

    // CSV Upload State
    const [csvFile, setCsvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // NEW: Pagination & Caching State
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);
    const productsCache = useRef({}); // In-memory cache: { cacheKey: { data, totalPages, totalCount } }
    const ITEMS_PER_PAGE = 10; // Or make this configurable

    // NEW: Backend-driven Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    // NEW: Debounced search term to reduce API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Column Chooser State (Unchanged)
    const COLUMN_STORAGE_KEY = 'products_visible_columns_v1';
    const columnsRef = useRef(null);
    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const defaultVisibleColumns = { id: true, name: true, category: true, costPrice: true, price: true, tax: true, stock: true, status: true, actions: true };
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
            return saved ? { ...defaultVisibleColumns, ...JSON.parse(saved) } : defaultVisibleColumns;
        } catch (err) {
            return defaultVisibleColumns;
        }
    });

    useEffect(() => {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // Close columns dropdown when clicking outside
    useEffect(() => {
        const onClick = (e) => {
            if (columnsRef.current && !columnsRef.current.contains(e.target)) {
                setIsColumnsOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);


    // --- API & DATA HANDLING ---

    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";

    // NEW: Centralized function to fetch products with caching
    const fetchProducts = useCallback(async () => {
        if (!apiUrl) return;

        const sortKey = sortConfig.key || 'createdAt';
        const sortDir = sortConfig.direction || 'desc';
        const cacheKey = `page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${debouncedSearchTerm}&sort=${sortKey}&dir=${sortDir}`;

        // 1. Check cache first
        if (productsCache.current[cacheKey]) {
            const cached = productsCache.current[cacheKey];
            setProducts(cached.data);
            setTotalPages(cached.totalPages);
            setTotalProducts(cached.totalCount);
            return;
        }

        // 2. Fetch from API if not in cache
        setIsLoading(true);
        try {
            const url = new URL(`${apiUrl}/api/shop/get/withCache/productsList`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', ITEMS_PER_PAGE);
            url.searchParams.append('sort', sortKey);
            url.searchParams.append('dir', sortDir);
            if (debouncedSearchTerm) {
                url.searchParams.append('search', debouncedSearchTerm);
            }

            const response = await fetch(url, { method: "GET", credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // Backend should return: { data: [], totalPages: N, totalCount: N }
            const result = await response.json();

            // 3. Update state and cache
            setProducts(result.data || []);
            setTotalPages(result.totalPages || 0);
            setTotalProducts(result.totalCount || 0);
            productsCache.current[cacheKey] = result;

        } catch (error) {
            console.error("Error fetching products:", error);
            alert("Something went wrong while fetching products.");
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, currentPage, debouncedSearchTerm, sortConfig]);

    // Main effect to trigger fetching data
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Effect to reset page and clear cache when search or sort changes
    useEffect(() => {
        setCurrentPage(1);
        productsCache.current = {};
    }, [debouncedSearchTerm, sortConfig]);

    // Helper to invalidate cache and refetch current page data
    const invalidateCacheAndRefetch = useCallback(() => {
        productsCache.current = {};
        fetchProducts();
    }, [fetchProducts]);

    // --- EVENT HANDLERS ---

    const handleEditClick = (product) => {
        setSelectedProductId(product.id);
        setName(product.name);
        setCategory(product.category);
        setPrice(product.price);
        setCostPrice(product.costPrice || "");
        setStock(product.stock);
        setTax(product.tax);
        setIsUpdateModalOpen(true);
    };

    const resetForm = () => {
        setName("");
        setCategory("");
        setPrice("");
        setStock("");
        setTax("");
        setCostPrice("");
        setSelectedProductId(null);
    };

    // UPDATED: CUD operations now invalidate the cache
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, category, price, costPrice, stock, tax };
            const response = await fetch(`${apiUrl}/api/shop/create/product`, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            invalidateCacheAndRefetch();
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Something went wrong while adding the product.");
        }
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { selectedProductId, name, category, price, costPrice, stock, tax };
            const response = await fetch(`${apiUrl}/api/shop/update/product`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            invalidateCacheAndRefetch();
            setIsUpdateModalOpen(false);
            resetForm();
        } catch (err) {
            console.error("Error updating product:", err);
            alert("Failed to update product");
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                const response = await fetch(`${apiUrl}/api/shop/product/delete/${id}`, {
                    method: "DELETE",
                    credentials: 'include'
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                invalidateCacheAndRefetch();
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Something went wrong while deleting the product.");
            }
        }
    };

    const handleCsvSubmit = async (e) => {
        e.preventDefault();
        if (!csvFile) return;
        setIsUploading(true);
        setUploadError(null);
        try {
            const formData = new FormData();
            formData.append('file', csvFile);
            const res = await fetch(`${apiUrl}/api/shop/bulk-upload`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || `Upload failed (${res.status})`);
            }

            invalidateCacheAndRefetch();
            setIsCsvModalOpen(false);
            setCsvFile(null);
        } catch (err) {
            setUploadError(err?.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    // UPDATED: Export should hit a dedicated backend endpoint for efficiency
    const handleExportCSV = async () => {
        if (totalProducts === 0) {
            alert("No products to export.");
            return;
        }
        if (!window.confirm(`Export all ${totalProducts} filtered products to CSV?`)) return;

        try {
            // This endpoint should be created on your backend to handle CSV generation
            const url = new URL(`${apiUrl}/api/shop/export/products`);
            if (debouncedSearchTerm) url.searchParams.append('search', debouncedSearchTerm);
            if (sortConfig.key) {
                url.searchParams.append('sort', sortConfig.key);
                url.searchParams.append('dir', sortConfig.direction);
            }

            // Use anchor tag to trigger download from the backend response
            const link = document.createElement("a");
            link.href = url.toString();
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
            link.setAttribute("download", `Products_Export_${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Error exporting CSV:", err);
            alert("Failed to export products.");
        }
    };

    const handleCsvChange = (e) => {
        const file = e.target.files?.[0] || null;
        setUploadError(null);
        if (file) {
            const isCsv = file.type === 'text/csv' || /\.csv$/i.test(file.name);
            const maxBytes = 5 * 1024 * 1024; // 5MB
            if (!isCsv) {
                setUploadError('Please select a .csv file.');
            } else if (file.size > maxBytes) {
                setUploadError('File must be 5 MB or less.');
            } else {
                setCsvFile(file);
            }
        } else {
            setCsvFile(null);
        }
    };

    // UPDATED: Sort handler now just updates state
    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: (prev.key === key && prev.direction === 'asc') ? 'desc' : 'asc'
        }));
    };

    const toggleColumn = (col) => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
    };

    // --- RENDER LOGIC & JSX ---

    const selectedColsCount = Object.values(visibleColumns).filter(Boolean).length;
    const columnsButtonLabel = selectedColsCount === Object.keys(visibleColumns).length ? 'Columns' : `Columns (${selectedColsCount})`;

    // NEW: Pagination Component
    const Pagination = () => {
        if (totalPages <= 1) return null;

        const getPaginationItems = () => {
            const items = [];
            if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) items.push(i);
                return items;
            }
            items.push(1);
            if (currentPage > 3) items.push('...');
            if (currentPage > 2) items.push(currentPage - 1);
            if (currentPage !== 1 && currentPage !== totalPages) items.push(currentPage);
            if (currentPage < totalPages - 1) items.push(currentPage + 1);
            if (currentPage < totalPages - 2) items.push('...');
            items.push(totalPages);
            return [...new Set(items)];
        };

        return (
            <div className="pagination">

                <div className="pagination-controls">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                        &laquo; Previous
                    </button>
                    {getPaginationItems().map((page, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? 'active' : ''}
                            disabled={page === '...'}
                        >
                            {page}
                        </button>
                    ))}
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                        Next &raquo;
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <h2>Products</h2>

            <div className="page-header">
                <input
                    type="text"
                    placeholder="Search products..."
                    className="search-bar"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="actions-toolbar">
                <div className="actions-group-left">
                    <button type="button" className="btn" onClick={() => setIsModalOpen(true)}>Add Product</button>
                    <button type="button" className="btn" onClick={() => setIsCsvModalOpen(true)}>Upload CSV</button>
                    <button type="button" className="btn" onClick={handleExportCSV}>Export CSV</button>
                </div>

                <div ref={columnsRef} className="columns-dropdown-container">
                    <button type="button" onClick={() => setIsColumnsOpen(v => !v)} aria-expanded={isColumnsOpen} className="btn btn-outline">
                        {columnsButtonLabel} ▾
                    </button>
                    {isColumnsOpen && (
                        <div className="columns-dropdown-menu">
                            <div className="columns-list">
                                {Object.keys(visibleColumns).map(col => (
                                    <label key={col} className="column-item">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns[col]}
                                            onChange={() => toggleColumn(col)}
                                        />
                                        <span>{col.replace(/([A-Z])/g, ' $1')}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="columns-dropdown-footer">
                                <button type="button" onClick={() => setVisibleColumns(defaultVisibleColumns)}>Show All</button>
                                <button type="button" onClick={() => setIsColumnsOpen(false)}>Done</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card">
                <table className="data-table">
                    <thead>
                    <tr>
                        {visibleColumns.name && <th>Name</th>}

                        {visibleColumns.costPrice && <th>Cost Price</th>}
                        {visibleColumns.price && <th>Price</th>}
                        {visibleColumns.stock && <th>Stock</th>}
                        {visibleColumns.actions && <th>Actions</th>}
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr><td colSpan={selectedColsCount} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                    ) : products.length > 0 ? (
                        products.map(product => (
                            <tr key={product.id}>
                                {visibleColumns.name && <td>{product.name}</td>}

                                {visibleColumns.costPrice && <td>{product.costPrice != null ? `₹${Number(product.costPrice).toLocaleString()}` : '–'}</td>}
                                {visibleColumns.price && <td>₹{product.price.toLocaleString()}</td>}

                                {visibleColumns.stock && <td>{product.stock}</td>}
                                {visibleColumns.actions && (
                                    <td>
                                        <div className="action-icons">
                                                <span onClick={() => handleEditClick(product)} className="action-icon edit" title="Edit Product">
                                                    <MdEdit size={18} />
                                                </span>
                                            <span onClick={() => handleDeleteProduct(product.id)} className="action-icon delete" title="Delete Product">
                                                    <MdDelete size={18} />
                                                </span>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={selectedColsCount} style={{ textAlign: 'center', padding: '20px' }}>No products found.</td></tr>
                    )}
                    </tbody>

                </table>
            </div>

            <Pagination />

            {/* --- MODALS (Largely Unchanged) --- */}
            <Modal title="Add New Product" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    {/* Form groups for name, category, costPrice, price, stock, tax */}
                    <div className="form-group"><label>Product Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>Category</label><select required value={category} onChange={e => setCategory(e.target.value)}><option value="">-- Select --</option><option>Smartphones</option><option>Laptops</option><option>Audio</option><option>Accessories</option><option>Others</option></select></div>
                    <div className="form-group"><label>Cost Price</label><input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Selling Price</label><input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Stock Quantity</label><input type="number" required value={stock} onChange={e => setStock(e.target.value)} /></div>
                    <div className="form-group"><label>Tax Percent</label><input type="number" step="0.1" required value={tax} onChange={e => setTax(e.target.value)} /></div>
                    <div className="form-actions"><button type="submit" className="btn">Add Product</button></div>
                </form>
            </Modal>

            <Modal title="Update Product" show={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)}>
                <form onSubmit={handleUpdateProduct}>
                    {/* Form groups for name, category, costPrice, price, stock, tax */}
                    <div className="form-group"><label>Product Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>Category</label><input type="text" required value={category} onChange={e => setCategory(e.target.value)} /></div>
                    <div className="form-group"><label>Cost Price</label><input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Selling Price</label><input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Stock Quantity</label><input type="number" required value={stock} onChange={e => setStock(e.target.value)} /></div>
                    <div className="form-group"><label>Tax Percent</label><input type="number" step="0.1" required value={tax} onChange={e => setTax(e.target.value)} /></div>
                    <div className="form-actions"><button type="submit" className="btn">Update Product</button></div>
                </form>
            </Modal>

            <Modal title="Upload Products via CSV" show={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)}>
                <form onSubmit={handleCsvSubmit}>
                    <div className="form-group">
                        <label>CSV file</label>
                        <input type="file" accept=".csv,text/csv" onChange={handleCsvChange} required />
                        {csvFile && (<small>Selected: {csvFile.name} ({Math.round(csvFile.size / 1024)} KB)</small>)}
                        {uploadError && (<div className="error">{uploadError}</div>)}
                        <div className="help-text">Header required: name, category, price, costPrice, stock, tax.</div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-link" onClick={() => setIsCsvModalOpen(false)}>Cancel</button>
                        <button type="submit" className="btn" disabled={!csvFile || isUploading}>{isUploading ? 'Uploading…' : 'Upload'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProductsPage;

// Recommended CSS for Pagination and other new elements:


