// src/pages/ProductsPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../components/Modal';
import { useConfig } from "./ConfigProvider";
import { MdEdit, MdDelete } from "react-icons/md";
// --- NEW IMPORTS ---
import toast, { Toaster } from 'react-hot-toast';
import { FaCheckDouble, FaTimes } from 'react-icons/fa';

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
    const [products, setProducts] = useState([]);
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
    const [hsn, setHsn] = useState(""); // --- ADDED from desktop

    // CSV Upload State
    const [csvFile, setCsvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // Pagination & Caching State
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);
    const productsCache = useRef({});
    const ITEMS_PER_PAGE = 12;

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    // --- NEW: Multi-select State ---
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(new Set());

    // Debounced search
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // Column Chooser State
    const COLUMN_STORAGE_KEY = 'products_visible_columns_v1';
    const columnsRef = useRef(null);
    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    // Note: Kept mobile columns here as requested
    const defaultVisibleColumns = { name: true, costPrice: true, price: true, stock: true, actions: true };
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
            // Ensure only valid mobile columns are loaded
            const parsed = saved ? JSON.parse(saved) : {};
            const validSaved = Object.keys(defaultVisibleColumns).reduce((acc, key) => {
                acc[key] = parsed[key] ?? defaultVisibleColumns[key];
                return acc;
            }, {});
            return validSaved;
        } catch (err) {
            return defaultVisibleColumns;
        }
    });

    useEffect(() => {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // Close columns dropdown
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

    const fetchProducts = useCallback(async () => {
        if (!apiUrl) return;

        const sortKey = sortConfig.key || 'createdAt';
        const sortDir = sortConfig.direction || 'desc';
        const cacheKey = `page=${currentPage}&limit=${ITEMS_PER_PAGE}&search=${debouncedSearchTerm}&sort=${sortKey}&dir=${sortDir}`;

        if (productsCache.current[cacheKey]) {
            const cached = productsCache.current[cacheKey];
            setProducts(cached.data);
            setTotalPages(cached.totalPages);
            setTotalProducts(cached.totalCount);
            return;
        }

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

            const result = await response.json();

            setProducts(result.data || []);
            setTotalPages(result.totalPages || 0);
            setTotalProducts(result.totalCount || 0);
            productsCache.current[cacheKey] = result;

        } catch (error) {
            console.error("Error fetching products:", error);
            toast.error("Something went wrong while fetching products.");
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, currentPage, debouncedSearchTerm, sortConfig]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        setCurrentPage(1);
        productsCache.current = {};
    }, [debouncedSearchTerm, sortConfig]);

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
        setHsn(product.hsn || ""); // --- ADDED
        setIsUpdateModalOpen(true);
    };

    const resetForm = () => {
        setName("");
        setCategory("");
        setPrice("");
        setStock("");
        setTax("");
        setCostPrice("");
        setHsn(""); // --- ADDED
        setSelectedProductId(null);
    };

    const handleCloseUpdateModal = () => {
        setIsUpdateModalOpen(false);
        resetForm();
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, category, price, costPrice, stock, tax, hsn }; // --- ADDED hsn
            const response = await fetch(`${apiUrl}/api/shop/create/product`, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            toast.success('Product added successfully!'); // --- ADDED toast
            invalidateCacheAndRefetch();
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error adding product:", error);
            toast.error("Something went wrong while adding the product."); // --- ADDED toast
        }
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { selectedProductId, name, category, price, costPrice, stock, tax, hsn }; // --- ADDED hsn
            const response = await fetch(`${apiUrl}/api/shop/update/product`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            toast.success('Product updated successfully!'); // --- ADDED toast
            invalidateCacheAndRefetch();
            setIsUpdateModalOpen(false);
            resetForm();
        } catch (err) {
            console.error("Error updating product:", err);
            toast.error("Failed to update product"); // --- ADDED toast
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

                toast.error('Product deleted successfully!'); // --- ADDED toast
                invalidateCacheAndRefetch();
            } catch (error) {
                console.error("Error deleting product:", error);
                toast.error("Something went wrong while deleting the product."); // --- ADDED toast
            }
        }
    };

    // --- NEW: Multi-select Handlers ---
    const handleDeleteProductBulk = async (id) => {
        try {
            const response = await fetch(`${apiUrl}/api/shop/product/delete/${id}`, {
                method: "DELETE",
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`Failed to delete product ID ${id}`);
            }
            return { success: true, id };
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error(`Failed to delete product ID ${id}.`);
            return { success: false, id };
        }
    };

    const handleToggleSelectionMode = () => {
        setIsSelectionMode(prev => !prev);
        setSelectedProducts(new Set()); // Clear selections when toggling
    };

    const handleSelectProduct = (productId) => {
        setSelectedProducts(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(productId)) {
                newSelected.delete(productId);
            } else {
                newSelected.add(productId);
            }
            return newSelected;
        });
    };

    const handleBulkDelete = async () => {
        const numSelected = selectedProducts.size;
        if (numSelected === 0) return;

        if (window.confirm(`Are you sure you want to delete ${numSelected} selected product(s)?`)) {
            const deletePromises = Array.from(selectedProducts).map(id => handleDeleteProductBulk(id));
            const results = await Promise.all(deletePromises);
            const successfulDeletes = results.filter(r => r.success).length;

            if (successfulDeletes > 0) {
                toast.success(`${successfulDeletes} product(s) deleted successfully!`);
                invalidateCacheAndRefetch();
            }
            setIsSelectionMode(false);
            setSelectedProducts(new Set());
        }
    };
    // --- End Multi-select Handlers ---


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

            toast.success('Products added/updated successfully!'); // --- ADDED toast
            invalidateCacheAndRefetch();
            setIsCsvModalOpen(false);
            setCsvFile(null);
        } catch (err) {
            setUploadError(err?.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleExportCSV = async () => {
        if (totalProducts === 0) {
            toast.error("No products to export."); // --- UPDATED
            return;
        }
        if (!window.confirm(`Export all ${totalProducts} filtered products to CSV?`)) return;

        try {
            const url = new URL(`${apiUrl}/api/shop/export/products`);
            if (debouncedSearchTerm) url.searchParams.append('search', debouncedSearchTerm);
            if (sortConfig.key) {
                url.searchParams.append('sort', sortConfig.key);
                url.searchParams.append('dir', sortConfig.direction);
            }

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
            toast.error("Failed to export products."); // --- UPDATED
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
            <Toaster position="top-center" /> {/* --- ADDED Toaster --- */}
            <h2>Products</h2>

            <div className="page-header">
                <input
                    type="text"
                    placeholder="Search products..."
                    className="search-bar"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {/* --- NEW: Multi-select Buttons --- */}
                <button
                    type="button"
                    className={`btn ${isSelectionMode ? 'btn-active' : 'btn-outline'}`}
                    onClick={handleToggleSelectionMode}
                    title={isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
                    style={{ padding: '0.5rem 0.75rem' }}
                >
                    {isSelectionMode ? <FaTimes size={16} /> : <FaCheckDouble size={16} />}
                </button>
                {isSelectionMode && selectedProducts.size > 0 && (
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleBulkDelete}
                    >
                        Delete ({selectedProducts.size})
                    </button>
                )}
                {/* --- End Multi-select Buttons --- */}
            </div>

            <div className="actions-toolbar">
                <div className="actions-group-left">
                    <button type="button" className="btn" onClick={() => setIsModalOpen(true)}><i class="fa-duotone fa-solid fa-grid-2-plus" style={{marginRight: "3px"}}></i>Add Product</button>
                    <button type="button" className="btn" onClick={() => setIsCsvModalOpen(true)}><i class="fa-duotone fa-solid fa-arrow-up-from-square" style={{marginRight: "5px"}}></i>Upload CSV</button>
                    <button type="button" className="btn" onClick={handleExportCSV}><i class="fa-duotone fa-solid fa-file-export" style={{marginRight: "0px"}}></i>Export CSV</button>


                </div>

                {/*<div ref={columnsRef} className="columns-dropdown-container">
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
                </div>*/}
            </div>

            <div className="glass-card">
                <table className="data-table">
                    <thead>
                    <tr>
                        {/* --- NEW: Conditional checkbox header --- */}
                        {isSelectionMode && <th style={{ width: "30px" }}></th>}

                        {visibleColumns.name && <th>Name</th>}
                        {visibleColumns.costPrice && <th>Cost Price</th>}
                        {visibleColumns.price && <th>Price</th>}
                        {visibleColumns.stock && <th>Stock</th>}
                        {visibleColumns.actions && <th>Actions</th>}
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr><td colSpan={selectedColsCount + (isSelectionMode ? 1 : 0)} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                    ) : products.length > 0 ? (
                        products.map(product => (
                            <tr
                                key={product.id}
                                // --- NEW: Selection logic ---
                                onClick={isSelectionMode ? () => handleSelectProduct(product.id) : undefined}
                                style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
                                className={isSelectionMode && selectedProducts.has(product.id) ? 'row-selected' : ''}
                            >
                                {isSelectionMode && (
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.has(product.id)}
                                            onChange={() => handleSelectProduct(product.id)}
                                            onClick={(e) => e.stopPropagation()} // Prevent row click
                                        />
                                    </td>
                                )}
                                {/* --- End Selection logic --- */}

                                {visibleColumns.name && <td>{product.name}</td>}
                                {visibleColumns.costPrice && <td>{product.costPrice != null ? `₹${Number(product.costPrice).toLocaleString()}` : '–'}</td>}
                                {visibleColumns.price && <td>₹{product.price.toLocaleString()}</td>}
                                {visibleColumns.stock && <td>{product.stock}</td>}
                                {visibleColumns.actions && (
                                    <td>
                                        <div className="action-icons">
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent row click
                                                    handleEditClick(product);
                                                }}
                                                className="download-btn"
                                                title="Edit Product"
                                            >
                                                <i className="fa-duotone fa-solid fa-pen-to-square" style={{fontSize: "15px", color: "var(--text-color)"}}></i>
                                            </span>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent row click
                                                    handleDeleteProduct(product.id);
                                                }}
                                                className="download-btn"
                                                title="Delete Product"
                                            >
                                                <i className="fa-duotone fa-solid fa-trash" style={{fontSize: "15px", color: "var(--text-color)"}}></i>
                                            </span>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={selectedColsCount + (isSelectionMode ? 1 : 0)} style={{ textAlign: 'center', padding: '20px' }}>No products found.</td></tr>
                    )}
                    </tbody>

                </table>
            </div>

            <Pagination />

            {/* --- MODALS (UPDATED) --- */}
            <Modal title="Add New Product" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    <div className="form-group"><label>Product Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>HSN</label><input type="text" value={hsn} onChange={e => setHsn(e.target.value)} /></div>
                    {/* --- UPDATED Category Dropdown --- */}
                    <div className="form-group"><label>Category</label>
                        <select required value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="">-- Select --</option>
                            <option>Product</option>
                            <option>Services</option>
                            <option>Others</option>
                        </select>
                    </div>
                    <div className="form-group"><label>Cost Price</label><input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Selling Price</label><input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
                    <div className="form-group"><label>Stock Quantity</label><input type="number" required value={stock} onChange={e => setStock(e.target.value)} /></div>
                    <div className="form-group"><label>Tax Percent</label><input type="number" step="0.1" required value={tax} onChange={e => setTax(e.target.value)} /></div>
                    <div className="form-actions"><button type="submit" className="btn">Add Product</button></div>
                </form>
            </Modal>

            <Modal title="Update Product" show={isUpdateModalOpen} onClose={handleCloseUpdateModal}>
                <form onSubmit={handleUpdateProduct}>
                    <div className="form-group"><label>Product Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>HSN</label><input type="text" value={hsn} onChange={e => setHsn(e.target.value)} /></div>
                    {/* --- UPDATED Category Dropdown --- */}
                    <div className="form-group"><label>Category</label>
                        <select required value={category} onChange={e => setCategory(e.target.value)}>
                            <option value="">-- Select --</option>
                            <option>Product</option>
                            <option>Services</option>
                            <option>Others</option>
                        </select>
                    </div>
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
                        {/* --- UPDATED help text --- */}
                        <div className="help-text">Header required: name, hsn, category, price, costPrice, stock, tax.</div>
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