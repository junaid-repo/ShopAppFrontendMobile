// src/pages/ProductsPage.js
import React, { useState, useEffect, useRef } from 'react';
import { mockProducts } from '../mockData';
import Modal from '../components/Modal';
import { useConfig } from "./ConfigProvider";
import { MdEdit, MdDelete } from "react-icons/md";

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [costPrice, setCostPrice] = useState(""); // NEW
    const [stock, setStock] = useState("");
    const [tax, setTax] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // Column chooser state with persistence (localStorage)
    const COLUMN_STORAGE_KEY = 'products_visible_columns_v1';
    const defaultVisibleColumns = {
        id: true,
        name: true,
        category: true,
        costPrice: true, // NEW
        price: true,
        tax: true,
        stock: true,
        status: true,
        actions: true
    };

    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...defaultVisibleColumns, ...parsed };
            }
        } catch (err) {
            console.warn("Failed to read saved visible columns:", err);
        }
        return defaultVisibleColumns;
    });

    useEffect(() => {
        try {
            localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
        } catch (err) {
            console.warn("Failed to persist visible columns:", err);
        }
    }, [visibleColumns]);

    const [isColumnsOpen, setIsColumnsOpen] = useState(false);
    const columnsRef = useRef(null);

    // Sorting (for category)
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Added for file upload
    const config = useConfig();
    var apiUrl = "";
    if (config) {
        console.log(config.API_URL);
        apiUrl = config.API_URL;
    }

    const token = localStorage.getItem("jwt_token");

    // export CSV (updated to include costPrice)
    const handleExportCSV = () => {
        if (!products || products.length === 0) {
            alert("No products available to export.");
            return;
        }

        // Ask for confirmation before download
        const confirmDownload = window.confirm("Do you want to export the products CSV?");
        if (!confirmDownload) {
            return;
        }

        const headers = ["selectedProductId", "name", "category", "costPrice", "price", "stock", "tax"];

        const rows = products.map(p => [
            p.id,
            `"${p.name}"`,
            `"${p.category}"`,
            p.costPrice !== undefined && p.costPrice !== null ? p.costPrice : "",
            p.price,
            p.stock,
            p.tax
        ]);

        const csvContent =
            [headers, ...rows]
                .map(row => row.join(","))
                .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Generate timestamp in YYYYMMDD_HHmmss format
        const now = new Date();
        const timestamp = now.getFullYear().toString()
            + String(now.getMonth() + 1).padStart(2, "0")
            + String(now.getDate()).padStart(2, "0")
            + "_"
            + String(now.getHours()).padStart(2, "0")
            + String(now.getMinutes()).padStart(2, "0")
            + String(now.getSeconds()).padStart(2, "0");

        link.setAttribute("download", `Products_Export_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCsvChange = (e) => {
        const file = e.target.files?.[0] || null;
        setUploadError(null);

        if (!file) {
            setCsvFile(null);
            return;
        }

        const isCsv = file.type === 'text/csv' || /\.csv$/i.test(file.name);
        if (!isCsv) {
            setUploadError('Please select a .csv file.');
            setCsvFile(null);
            return;
        }

        const maxBytes = 5 * 1024 * 1024; // 5MB example
        if (file.size > maxBytes) {
            setUploadError('File must be 5 MB or less.');
            setCsvFile(null);
            return;
        }

        setCsvFile(file);
    };

    const handleCsvSubmit = async (e) => {
        e.preventDefault();
        if (!csvFile) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            await uploadProductsCsv(csvFile);
            setIsCsvModalOpen(false);
            setCsvFile(null);
        } catch (err) {
            setUploadError(err?.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    async function uploadProductsCsv(file) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(apiUrl + '/api/shop/bulk-upload', {
            method: 'POST',
            body: formData,
            headers: {
                Authorization: `Bearer ${token}`
            },
        });

        if (!res.ok) {
            let message = `Upload failed (${res.status})`;
            try {
                const error = await res.json();
                if (error?.message) message = error.message;
            } catch {
                const text = await res.text();
                if (text) message = text;
            }
            throw new Error(message);
        }

        return res.json();
    }

    useEffect(() => {
        fetch(apiUrl + "/api/shop/get/productsList", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log("API response:", data);
                setProducts(data);
            })
            .catch((error) => {
                console.error("Error fetching customers:", error);
                alert("Something went wrong while fetching customers.");
            });
    }, [apiUrl, token]);

    // close columns dropdown when clicking outside
    useEffect(() => {
        const onClick = (e) => {
            if (columnsRef.current && !columnsRef.current.contains(e.target)) {
                setIsColumnsOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedProducts = React.useMemo(() => {
        if (!sortConfig.key) return filteredProducts;
        const sorted = [...filteredProducts].sort((a, b) => {
            const aVal = (a[sortConfig.key] || "").toString().toLowerCase();
            const bVal = (b[sortConfig.key] || "").toString().toLowerCase();
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filteredProducts, sortConfig]);

    const toggleSort = (key) => {
        if (sortConfig.key === key) {
            setSortConfig(prev => ({ key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
        } else {
            setSortConfig({ key, direction: 'asc' });
        }
    };

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

    const handleDeleteProduct = async (id) => {
        if (window.confirm("Are you sure you want to delete ")) {
            try {
                const response = await fetch(
                    `${apiUrl}/api/shop/product/delete/${id}`,
                    {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        }
                    }
                );

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                setProducts(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Something went wrong while deleting the product.");
            }
        }
        setIsModalOpen(false);
    }

    const handleAddProduct = async (e) => {
        e.preventDefault();

        try {
            const payload = { name, category, price, costPrice, stock, tax };
            const response = await fetch(apiUrl + "/api/shop/create/product", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (data && data.id) {
                setProducts(prev => [data, ...prev]);
            } else {
                fetch(apiUrl + "/api/shop/get/productsList", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                }).then(r => r.json()).then(setProducts).catch(() => { });
            }

        } catch (error) {
            console.error("Error adding product:", error);
            alert("Something went wrong while adding the product.");
        }

        // reset form
        setName(""); setCategory(""); setPrice(""); setStock(""); setTax(""); setCostPrice("");
        setIsModalOpen(false);
    }

    const handleUpdateProduct = (e) => {
        e.preventDefault();

        const payload = { selectedProductId, name, category, price, costPrice, stock, tax };

        fetch(`${apiUrl}/api/shop/update/product`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, },
            body: JSON.stringify(payload),
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data && data.id) {
                    setProducts(prev => prev.map(p => p.id === data.id ? data : p));
                } else {
                    fetch(apiUrl + "/api/shop/get/productsList", {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        },
                    }).then(r => r.json()).then(setProducts).catch(() => { });
                }
                setIsUpdateModalOpen(false);
                setSelectedProductId(null);
                setName(""); setCategory(""); setPrice(""); setStock(""); setTax(""); setCostPrice("");
            })
            .catch((err) => {
                console.error("Error updating product:", err);
                alert("Failed to update product");
            });
    };

    const toggleColumn = (col) => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
    };

    const selectedColsCount = Object.values(visibleColumns).filter(Boolean).length;
    const columnsButtonLabel = selectedColsCount === Object.keys(visibleColumns).length
        ? 'Columns'
        : `Columns (${selectedColsCount})`;

    // -------------------------
    // RETURN / JSX
    // -------------------------
    return (
        <div className="page-container">
            <h2>Products</h2>

            {/* Search Bar Row */}
            <div
                className="page-header"
                style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}
            >
                <input
                    type="text"
                    placeholder="Search products..."
                    className="search-bar"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Buttons Row: actions on LEFT, Columns button on RIGHT */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                }}
            >
                {/* Left: Action Buttons (explicit type="button" to avoid accidental form submit) */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => setIsModalOpen(true)}
                    >
                        Add Products
                    </button>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => setIsCsvModalOpen(true)}
                    >
                        Upload Multiple
                    </button>
                    <button
                        type="button"
                        className="btn"
                        onClick={handleExportCSV}
                    >
                        Export CSV
                    </button>
                </div>

                {/* Right: Columns Button + Dropdown */}
                <div ref={columnsRef} style={{ position: "relative" }}>
                    <button
                        type="button"
                        onClick={() => setIsColumnsOpen((v) => !v)}
                        aria-expanded={isColumnsOpen}
                        style={{
                            backgroundColor: "#fff",
                            border: "1px solid var(--primary-color)",
                            color: "var(--primary-color)",
                            padding: "4px 10px",
                            fontSize: "13px",
                            borderRadius: "25%", // as requested
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        {columnsButtonLabel} ▾
                    </button>

                    {isColumnsOpen && (
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: "calc(100% + 8px)",
                                background: "#fff",
                                border: "1px solid #e6e6e6",
                                borderRadius: 10,
                                boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                                padding: 10,
                                zIndex: 1000,
                                minWidth: 220,
                                maxWidth: 320
                            }}
                        >
                            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                {Object.keys(visibleColumns).map(col => (
                                    <label
                                        key={col}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '6px 6px',
                                            borderRadius: 6,
                                            cursor: 'pointer',
                                            userSelect: 'none'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns[col]}
                                            onChange={() => toggleColumn(col)}
                                            style={{
                                                width: 16,
                                                height: 16,
                                                margin: 0,
                                                marginRight: 8,
                                                accentColor: 'var(--primary-color)'
                                            }}
                                        />
                                        <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{col.replace(/([A-Z])/g, ' $1')}</span>
                                    </label>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <button
                                    type="button"
                                    onClick={() => setVisibleColumns(defaultVisibleColumns)}
                                    style={{
                                        background: '#f6f6f6',
                                        border: '1px solid #ddd',
                                        padding: '6px 10px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Show All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsColumnsOpen(false)}
                                    style={{
                                        background: 'var(--primary-color)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '6px 10px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ marginTop: 12 }}>
                <table
                    className="data-table"
                    style={{
                        width: "100%",
                        borderCollapse: "collapse" // ensures no extra spacing between cells
                    }}
                >
                    <thead>
                    <tr>
                        {visibleColumns.name && (
                            <th style={{ padding: "6px 8px", textAlign: "left" }}>Name</th>
                        )}
                        {visibleColumns.costPrice && (
                            <th style={{ padding: "6px 8px", textAlign: "left" }}>Cost Price</th>
                        )}
                        {visibleColumns.price && (
                            <th style={{ padding: "6px 8px", textAlign: "left" }}>Price</th>
                        )}
                        {visibleColumns.stock && (
                            <th style={{ padding: "6px 8px", textAlign: "left" }}>Stock</th>
                        )}
                        {visibleColumns.status && (
                            <th style={{ padding: "6px 8px", textAlign: "left" }}>Status</th>
                        )}
                        {visibleColumns.actions && (
                            <th style={{ padding: "6px 8px", textAlign: "left" }}>Update</th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {sortedProducts.map((product) => (
                        <tr key={product.id} style={{ padding: 0 }}>
                            {visibleColumns.name && (
                                <td style={{ padding: "4px 8px" }}>{product.name}</td>
                            )}
                            {visibleColumns.costPrice && (
                                <td style={{ padding: "4px 8px" }}>
                                    {product.costPrice !== undefined && product.costPrice !== null
                                        ? `₹${Number(product.costPrice).toLocaleString()}`
                                        : "-"}
                                </td>
                            )}
                            {visibleColumns.price && (
                                <td style={{ padding: "4px 8px" }}>
                                    ₹{product.price.toLocaleString()}
                                </td>
                            )}
                            {visibleColumns.stock && (
                                <td style={{ padding: "4px 8px" }}>{product.stock}</td>
                            )}
                            {visibleColumns.status && (
                                <td style={{ padding: "4px 8px" }}>
              <span
                  className={
                      product.stock > 0 ? "status-instock" : "status-outofstock"
                  }
              >
                {product.status}
              </span>
                                </td>
                            )}
                            {visibleColumns.actions && (
                                <td style={{ padding: "4px 8px" }}>
              <span
                  onClick={() => handleEditClick(product)}
                  style={{
                      cursor: "pointer",
                      backgroundColor: "#e0f7fa",
                      borderRadius: "6px",
                      padding: "4px",
                      marginRight: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                  }}
                  title="Edit Product"
              >
                <MdEdit size={16} color="#00796b" />
              </span>

                                    <span
                                        onClick={() => handleDeleteProduct(product.id)}
                                        style={{
                                            cursor: "pointer",
                                            backgroundColor: "#ffebee",
                                            borderRadius: "6px",
                                            padding: "4px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                        title="Delete Product"
                                    >
                <MdDelete size={16} color="#d32f2f" />
              </span>
                                </td>
                            )}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>


            {/* Add / Update / CSV Modals (unchanged) */}
            <Modal title="Add New Product" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    <div className="form-group">
                        <label>Product Name</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="">-- Select Category --</option>
                            <option value="Smatphones">Smatphones</option>
                            <option value="Laptops and Computers">Laptops and Computers</option>
                            <option value="Audio">Audio</option>
                            <option value="Videos">Videos</option>
                            <option value="Accessories">Accessories</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Cost Price</label>
                        <input type="number" required value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Price</label>
                        <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Stock Quantity</label>
                        <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <input type="number" required value={tax} onChange={(e) => setTax(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">Add Product</button>
                    </div>
                </form>
            </Modal>

            <Modal title="Update Product" show={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)}>
                <form onSubmit={handleUpdateProduct}>
                    <div className="form-group">
                        <label>Product Name</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Cost Price</label>
                        <input type="number" required value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Price</label>
                        <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Stock Quantity</label>
                        <input type="number" required value={stock} onChange={(e) => setStock(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Tax Percent</label>
                        <input type="number" required value={tax} onChange={(e) => setTax(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">Update Product</button>
                    </div>
                </form>
            </Modal>

            <Modal title="Upload Products via CSV" show={isCsvModalOpen} onClose={() => { setIsCsvModalOpen(false); setCsvFile(null); setUploadError(null); }}>
                <form onSubmit={handleCsvSubmit}>
                    <div className="form-group">
                        <label>CSV file</label>
                        <input type="file" accept=".csv,text/csv" onChange={handleCsvChange} required />
                        {csvFile && (<small>Selected: {csvFile.name} ({Math.round(csvFile.size / 1024)} KB)</small>)}
                        {uploadError && (<div className="error">{uploadError}</div>)}
                        <div className="help-text">Expected columns: name, category, price, costPrice, stock, tax (header row recommended).</div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-link" onClick={() => { setIsCsvModalOpen(false); setCsvFile(null); setUploadError(null); }}>Cancel</button>
                        <button type="submit" className="btn" disabled={!csvFile || isUploading}>{isUploading ? 'Uploading…' : 'Upload'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProductsPage;
