// src/pages/CustomersPage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../components/Modal';
import './CustomersPage.css';
import {
    FaEnvelope,
    FaPhone,
    FaMoneyBillWave,
    FaTrash,
    FaThLarge, // Added
    FaList,    // Added
    FaCheckDouble // Added
} from 'react-icons/fa';
import { MdEdit, MdDelete } from "react-icons/md"; // Added
import { useConfig } from "./ConfigProvider";
// import { authFetch } from "../utils/authFetch"; // No longer used, replaced by fetch
import { useSearchKey } from '../context/SearchKeyContext';
import { useNavigate, useLocation } from 'react-router-dom'; // Added
import { getIndianStates } from '../utils/statesUtil'; // Added
import toast, { Toaster } from 'react-hot-toast'; // Added

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

const CustomersPage = ({ setSelectedPage }) => {
    // --- Core State ---
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const config = useConfig();
    const apiUrl = config?.API_URL || "";

    // --- View State ---
    const [viewMode, setViewMode] = useState(
        () => localStorage.getItem('customerViewMode') || 'grid'
    );

    // --- Modal & Form State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [customerState, setCustomerState] = useState("");
    const [gstNumber, setGstNumber] = useState("");
    const [shopState, setShopState] = useState(""); // For defaulting state
    const statesList = getIndianStates();

    // --- Pagination & Loading State ---
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const ITEMS_PER_PAGE = 12;

    // --- Sorting State (needed for fetch) ---
    const [sortConfig, setSortConfig] = useState({ key: 'totalSpent', direction: 'desc' });

    // --- Search & Navigation ---
    const { searchKey, setSearchKey } = useSearchKey();
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const navigate = useNavigate();
    const location = useLocation();

    // --- Multi-Select State ---
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedCustomers, setSelectedCustomers] = useState(new Set());
    const [deletingCustomerId, setDeletingCustomerId] = useState(null);

    // --- Effects ---

    // Set view mode in local storage
    useEffect(() => {
        localStorage.setItem('customerViewMode', viewMode);
    }, [viewMode]);

    // Clear search key on unmount
    useEffect(() => {
        return () => setSearchKey('');
    }, [setSearchKey]);

    const domainToRoute = {
        products: 'products',
        sales: 'sales',
        customers: 'customers',
    };

    // Fetch shop state to set default for new customers
    useEffect(() => {
        const fetchShopDetails = async () => {
            if (!apiUrl) return;
            try {
                // Assuming session handles username, pass null or update as needed
                const detailsRes = await fetch(`${apiUrl}/api/shop/user/get/userprofile/null`, {
                    method: "GET",
                    credentials: 'include',
                    headers: { Accept: "application/json" },
                });
                if (detailsRes.ok) {
                    const data = await detailsRes.json();
                    setShopState(data?.shopState || '');
                    setCustomerState(data?.shopState || ''); // Default new customer state
                }
            } catch (err) {
                console.error("Error fetching shop details:", err);
            }
        };
        fetchShopDetails();
    }, [apiUrl]);

    // Main data fetching function
    const fetchCustomers = useCallback(async (page = 1) => {
        if (!apiUrl) return;

        setIsLoading(true);
        try {
            const url = new URL(`${apiUrl}/api/shop/get/cacheable/customersList`);
            url.searchParams.append('page', page);
            url.searchParams.append('limit', ITEMS_PER_PAGE);
            if (debouncedSearchTerm) url.searchParams.append('search', debouncedSearchTerm);
            url.searchParams.append('sort', sortConfig.key);
            url.searchParams.append('dir', sortConfig.direction);

            const response = await fetch(url, { method: "GET", credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const result = await response.json();
            setCustomers(result.data || []);
            setTotalPages(result.totalPages || 0);
            setCurrentPage(page);
            setTotalCustomers(result.totalCount || 0);
        } catch (error) {
            console.error("Error fetching customers:", error);
            toast.error("Something went wrong while fetching customers.");
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, debouncedSearchTerm, sortConfig]); // Added sortConfig

    // Trigger fetch when dependencies change
    useEffect(() => {
        fetchCustomers(currentPage);
    }, [fetchCustomers, currentPage]);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    // Sync search bar with global/URL search key
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('searchKey');
        if (key) setSearchTerm(key);
    }, [location.search]);

    useEffect(() => {
        if (searchKey && searchKey !== searchTerm) setSearchTerm(searchKey);
    }, [searchKey]);

    // --- Form & CRUD Handlers ---

    const resetForm = () => {
        setSelectedId("");
        setName("");
        setEmail("");
        setPhone("");
        setCity("");
        setCustomerState(shopState); // Reset to default shop state
        setGstNumber("");
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, email, phone, city, customerState, gstNumber };
            const response = await fetch(`${apiUrl}/api/shop/create/customer`, {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            toast.success("Customer added!");
            fetchCustomers(1); // Refetch from page 1
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error adding customer:", error);
            toast.error("Failed to add customer.");
        }
    };

    const handleEditClick = (customer) => {
        setSelectedId(customer.id);
        setName(customer.name);
        setEmail(customer.email);
        setPhone(customer.phone);
        setCity(customer.city || "");
        setCustomerState(customer.customerState || shopState);
        setGstNumber(customer.gstNumber || "");
        setIsUpdateModalOpen(true);
    };

    const handleCloseUpdateModal = () => {
        setIsUpdateModalOpen(false);
        resetForm();
    };

    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
        try {
            const payload = { id: selectedId, name, email, phone, city, customerState, gstNumber };
            const response = await fetch(`${apiUrl}/api/shop/update/customer`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            toast.success("Customer updated.");
            fetchCustomers(currentPage); // Refetch current page
            handleCloseUpdateModal();
        } catch (error) {
            console.error("Error updating customer:", error);
            toast.error("Failed to update customer.");
        }
    };

    const handleDeleteCustomer = async (id, customerName) => {
        if (!window.confirm(`Are you sure you want to delete ${customerName}?`)) return;

        setDeletingCustomerId(id); // Start animation
        try {
            const response = await fetch(`${apiUrl}/api/shop/customer/delete/${id}`, {
                method: "DELETE",
                credentials: 'include',
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            toast.error(`${customerName || 'Customer'} has been deleted.`);
            // Wait for animation before removing from state
            setTimeout(() => {
                setCustomers(prev => prev.filter(c => c.id !== id));
                setTotalCustomers(prev => prev - 1);
                setDeletingCustomerId(null);
            }, 500);
            return { status: 'fulfilled', id };
        } catch (error) {
            console.error(`Error deleting customer ${id}:`, error);
            toast.error(`Failed to delete ${customerName || 'customer'}.`);
            setDeletingCustomerId(null); // Reset animation on failure
            return { status: 'rejected', id, error };
        }
    };

    // --- Multi-Select Handlers ---
    const handleToggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedCustomers(new Set());
    };

    const handleSelectCustomer = (customerId) => {
        const newSelection = new Set(selectedCustomers);
        if (newSelection.has(customerId)) {
            newSelection.delete(customerId);
        } else {
            newSelection.add(customerId);
        }
        setSelectedCustomers(newSelection);
    };

    const handleBulkDelete = async () => {
        if (selectedCustomers.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)?`)) return;

        const deletePromises = Array.from(selectedCustomers).map(id => {
            const customer = customers.find(c => c.id === id);
            return handleDeleteCustomer(id, customer?.name || 'Customer');
        });

        await Promise.allSettled(deletePromises);

        // Refetch after all deletions are processed
        fetchCustomers(1);
        setSelectedCustomers(new Set());
        setIsSelectMode(false);
    };

    // --- Navigation Handler ---
    const handleTakeAction = (customerName) => {
        const route = domainToRoute['sales'];
        if (!route) return;


        setSearchKey(customerName);
        if (setSelectedPage) {
            setSelectedPage(route);
        }
    };

    // --- Pagination Component ---
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

        const paginationItems = getPaginationItems();

        return (
            <div className="pagination">
                <div className="pagination-controls">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                        &laquo; Prev
                    </button>
                    {paginationItems.map((item, index) =>
                        typeof item === 'string' ? (
                            <span key={index} className="pagination-ellipsis">{item}</span>
                        ) : (
                            <button
                                key={index}
                                className={currentPage === item ? 'active' : ''}
                                onClick={() => setCurrentPage(item)}
                            >
                                {item}
                            </button>
                        )
                    )}
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                        Next &raquo;
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="page-container">
            <Toaster position="top-center" />
            <h2>Customers ({totalCustomers})</h2>

            <div className="page-header">
                {isSelectMode ? (
                    <>
                        <button className="btn btn-danger" onClick={handleBulkDelete} disabled={selectedCustomers.size === 0}>
                            <i className="fa-duotone fa-solid fa-trash"></i> Delete ({selectedCustomers.size})
                        </button>
                        <button className="btn btn-outline" onClick={handleToggleSelectMode}>Cancel</button>
                    </>
                ) : (
                    <>
                        <input
                            type="text"
                            placeholder="Search customers..."
                            className="search-bar"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button className="btn" onClick={() => setIsModalOpen(true)}>Add</button>
                    </>
                )}
            </div>

            <div className="view-toggle-buttons">
                <button
                    className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                >
                    <i className="fa-duotone fa-solid fa-grid-2"></i> Grid
                </button>
                <button
                    className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Table View"
                >
                    <i className="fa-duotone fa-solid fa-list"></i> List
                </button>
                <button
                    className={`btn btn-outline toggle-btn ${isSelectMode ? 'active' : ''}`}
                    onClick={handleToggleSelectMode}
                    title="Select Multiple"
                >
                    <FaCheckDouble />
                </button>
            </div>

            {isLoading && <p style={{ textAlign: 'center', padding: '2rem' }}>Loading...</p>}

            {!isLoading && customers.length === 0 && (
                <p style={{ textAlign: 'center', padding: '2rem' }}>No customers found.</p>
            )}

            {!isLoading && customers.length > 0 && viewMode === 'grid' && (
                <div className="glass-card" style={{ padding: "1px", marginTop: "16px" }}>
                    <div
                        className="customer-grid"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: "12px",
                            paddingRight: "20px",
                        }}
                    >
                        {customers.map(customer => {
                            const isSelected = selectedCustomers.has(customer.id);
                            return (
                                <div
                                    key={customer.id}
                                    className={`customer-card ${isSelected ? 'selected' : ''} ${deletingCustomerId === customer.id ? 'deleting' : ''}`}

                                >
                                    {isSelectMode && <input type="checkbox" className="styled-checkbox" checked={isSelected} readOnly />}
                                    <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>{customer.name}</h3>
                                    <p style={{ margin: "2px 0", fontSize: "0.9rem" }}><FaPhone className="icon" /> {customer.phone}</p>
                                    <p style={{ margin: "2px 0", fontSize: "0.9rem" }}><FaMoneyBillWave className="icon" /> ₹{customer.totalSpent?.toLocaleString()}</p>
                                    <div className="card-actions">
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                                        >
                                            <MdEdit />
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id, customer.name); }}
                                        >
                                            <MdDelete />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!isLoading && customers.length > 0 && viewMode === 'table' && (
                <div className="glass-card" style={{ marginTop: "16px", padding: 0 }}>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                            <tr>
                                {isSelectMode && <th style={{width: '20px'}}></th>}
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Spent</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {customers.map(customer => {
                                const isSelected = selectedCustomers.has(customer.id);
                                return (
                                    <tr
                                        key={customer.id}
                                        className={`${isSelected ? 'selected' : ''} ${deletingCustomerId === customer.id ? 'deleting' : ''}`}

                                    >
                                        {isSelectMode &&
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="styled-checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                        }
                                        <td>{customer.name}</td>
                                        <td>{customer.phone}</td>
                                        <td>₹{customer.totalSpent?.toLocaleString('en-IN')}</td>
                                        <td>
                                            <div className="action-icons">
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                                                        className="download-btn"
                                                        title="Edit Customer"
                                                    >
                                                        <i className="fa-duotone fa-solid fa-pen-to-square" style={{fontSize: "15px", color: "var(--text-color)"}}></i>
                                                    </span>
                                                <span
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id, customer.name); }}
                                                    className="download-btn"
                                                    title="Delete Customer"
                                                >
                                                        <i className="fa-duotone fa-solid fa-trash" style={{fontSize: "15px", color: "var(--text-color)"}}></i>
                                                    </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            <Pagination />

            {/* --- ADD CUSTOMER MODAL (UPDATED) --- */}
            <Modal title="Add New Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddCustomer}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            maxLength="10"
                            pattern="[5-9][0-9]{9}"
                            title="Phone number must be 10 digits"
                        />
                    </div>
                    <div className="form-group">
                        <label>GST Number</label>
                        <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>State</label>
                        <select value={customerState} onChange={(e) => setCustomerState(e.target.value)}>
                            <option value="">Select State</option>
                            {statesList.map((state, i) => (
                                <option key={i} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>City</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">Add Customer</button>
                    </div>
                </form>
            </Modal>

            {/* --- EDIT CUSTOMER MODAL (NEW) --- */}
            <Modal title="Edit Customer" show={isUpdateModalOpen} onClose={handleCloseUpdateModal}>
                <form onSubmit={handleUpdateCustomer}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            maxLength="10"
                            pattern="[5-9][0-9]{9}"
                            title="Phone number must be 10 digits"
                        />
                    </div>
                    <div className="form-group">
                        <label>GST Number</label>
                        <input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>State</label>
                        <select value={customerState} onChange={(e) => setCustomerState(e.target.value)}>
                            <option value="">Select State</option>
                            {statesList.map((state, i) => (
                                <option key={i} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>City</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">Update Customer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CustomersPage;