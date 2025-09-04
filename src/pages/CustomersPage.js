import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import './CustomersPage.css';
import { FaEnvelope, FaPhone, FaMoneyBillWave, FaTrash } from 'react-icons/fa';
import { useConfig } from "./ConfigProvider";
import { authFetch } from "../utils/authFetch";

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const token = localStorage.getItem('jwt_token');

    // Fetch customers on component mount
    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await authFetch(`${apiUrl}/api/shop/get/customersList`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
            alert("Something went wrong while fetching customers.");
        }
    };

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
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
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
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${token}`
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
