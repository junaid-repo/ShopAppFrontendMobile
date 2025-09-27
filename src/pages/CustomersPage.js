import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import Modal from '../components/Modal';
import './CustomersPage.css';
import { FaEnvelope, FaPhone, FaMoneyBillWave, FaTrash } from 'react-icons/fa';
import { useConfig } from "./ConfigProvider";
import { authFetch } from "../utils/authFetch";
import { useSearchKey } from '../context/SearchKeyContext';

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

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const config = useConfig();
    var apiUrl =  "";

    // NEW: Pagination & Caching State
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const productsCache = useRef({}); // In-memory cache: { cacheKey: { data, totalPages, totalCount } }
    const ITEMS_PER_PAGE = 12; // Or make this configurable
    const { searchKey, setSearchKey } = useSearchKey();
    // NEW: Debounced search term to reduce API calls
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    useEffect(() => {
        return () => {
            setSearchKey('');
        };
    }, [setSearchKey]);


    if(config){
        console.log(config.API_URL);
        apiUrl=config.API_URL;
    }

    const fetchCustomers = useCallback(async () => {
        if (!apiUrl) return;




        // 2. Fetch from API if not in cache
        // setIsLoading(true);
        try {
            const url = new URL(`${apiUrl}/api/shop/get/cacheable/customersList`);
            url.searchParams.append('page', currentPage);
            url.searchParams.append('limit', ITEMS_PER_PAGE);
            console.log("Fetching customers with URL:", url.toString());
            if (debouncedSearchTerm) {
                url.searchParams.append('search', debouncedSearchTerm);
            }

            const response = await fetch(url, { method: "GET", credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // Backend should return: { data: [], totalPages: N, totalCount: N }
            const result = await response.json();

            // 3. Update state and cache
            setCustomers(result.data || []);
            setTotalPages(result.totalPages || 0);
            setTotalCustomers(result.totalCount || 0);


        } catch (error) {
            console.error("Error fetching customers:", error);
            alert("Something went wrong while fetching customers.");
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, currentPage, debouncedSearchTerm]);

    // Fetch customers on load
    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    // Sync search bar with global search key
    useEffect(() => {
        if (searchKey && searchKey !== searchTerm) {
            setSearchTerm(searchKey);
        }
    }, [searchKey]);
    /* const fetchCustomers = () => {
         authFetch(apiUrl + "/api/shop/get/customersList", {
             method: "GET",
             credentials: 'include',
             headers: {
                 "Content-Type": "application/json"
             }
         })
             .then((response) => {
                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                 return response.json();
             })
             .then((data) => setCustomers(data))
             .catch((error) => {
                 console.error("Error fetching customers:", error);
                 alert("Something went wrong while fetching customers.");
             });
     };*/

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddCustomer = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim()
            };

            const response = await fetch(`${apiUrl}/api/shop/create/customer`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            await fetchCustomers();
            setName(""); setEmail(""); setPhone(""); // Clear form fields
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding customer:", error);
            alert("Something went wrong while adding the customer.");
        }
    };

    const handleDeleteCustomer = async (id) => {
        if (!window.confirm("Are you sure you want to delete this customer?")) return;

        try {
            const response = await fetch(`${apiUrl}/api/shop/customer/delete/${id}`, {
                method: "DELETE",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // Remove customer from local state without refetching
            setCustomers(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error("Error deleting customer:", error);
            alert("Something went wrong while deleting the customer.");
        }
    };

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
                        &laquo; Prev
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
            <h2>Customers</h2>

            <div className="page-header">
                <input
                    type="text"
                    placeholder="Search customers..."
                    className="search-bar"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn" onClick={() => setIsModalOpen(true)}>Add Customer</button>
            </div>

            <div className="glass-card" style={{ padding: "1px", marginTop: "16px" }}>
                <div
                    className="customer-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)", // 2 cards per row
                        gap: "12px", // space between cards
                        paddingRight: "20px",
                    }}
                >
                    {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                        <div
                            key={customer.id}
                            className="customer-card"
                            style={{
                                padding: "10px", // reduced padding inside card
                                borderRadius: "12px",
                                background: "var(--glass-bg)",
                                border: "1px solid var(--border-color)",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                        >
                            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem" }}>{customer.name}</h3>
                            <p style={{ margin: "2px 0", fontSize: "0.9rem" }}><FaPhone className="icon" /> {customer.phone}</p>
                            <p style={{ margin: "2px 0", fontSize: "0.9rem" }}><FaMoneyBillWave className="icon" /> ₹{customer.totalSpent?.toLocaleString()}</p>
                            <button
                                className="delete-btn"
                                style={{ marginTop: "6px", padding: "4px 6px", fontSize: "0.9rem", color :"brown" }}
                                onClick={() => handleDeleteCustomer(customer.id)}
                            >
                                <FaTrash />
                            </button>
                        </div>
                    )) : (
                        <p style={{ textAlign: 'center', width: '100%' }}>No customers found.</p>
                    )}
                </div>
            </div>

            <Pagination />
            <Modal title="Add New Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleAddCustomer}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn">Add Customer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CustomersPage;
