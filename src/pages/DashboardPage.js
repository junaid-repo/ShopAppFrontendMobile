// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { FaRupeeSign, FaBoxes, FaBan, FaChartLine } from 'react-icons/fa';
import CurrencyRupeeTwoToneIcon from '@mui/icons-material/CurrencyRupeeTwoTone';
import Modal from '../components/Modal';
import './DashboardPage.css';
import { useNavigate } from 'react-router-dom';
import { useConfig } from "./ConfigProvider";

const DashboardPage = ({ setCurrentPage }) => {
    const [dashboardData, setDashboardData] = useState({});
    const [sales, setSales] = useState([]);
    const [timeRange, setTimeRange] = useState('today');
    const [isNewCusModalOpen, setIsNewCusModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [category, setCategory] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [tax, setTax] = useState("");
    const [isAddProdModalOpen, setIsAddProdModalOpen] = useState(false);

    const config = useConfig();
    const navigate = useNavigate();

    // helper to navigate or set current page when using internal navigation
    const goTo = (page) => {
        if (typeof setCurrentPage === 'function') {
            setCurrentPage(page);
        } else {
            navigate(`/${page}`);
        }
    };

    let apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    // 📌 Get JWT from localStorage
    const token = localStorage.getItem("jwt_token");

    // 📌 Fetch Dashboard Details
    useEffect(() => {
        fetch(`${apiUrl}/api/shop/get/dashboardDetails/${timeRange}`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
                // 🔑 Attach JWT
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => setDashboardData(data))
            .catch((err) => {
                console.error("Error fetching dashboardData:", err);
                alert("Something went wrong while fetching dashboard details.");
            });
    }, [timeRange, apiUrl, token]);

    // 📌 Fetch Sales
    useEffect(() => {
        //alert(token);
        fetch(`${apiUrl}/api/shop/get/count/sales`, {
            method: "GET",
            credentials: 'include',
            params: {
                count: 3 // ✅ sent to backend
            },
            headers: {
                "Content-Type": "application/json"
                // 🔑 Attach JWT
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => setSales(data))
            .catch((err) => {
                console.error("Error fetching sales:", err);
                alert("Something went wrong while fetching sales data.");
            });
    }, [apiUrl, token]);

    const recentSales = sales.slice(0, 3);

    // 📌 Add Customer
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, email, phone };
            const response = await fetch(`${apiUrl}/api/shop/create/customer`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                    // 🔑 Attach JWT
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            alert("Customer added successfully!");
        } catch (error) {
            console.error("Error adding customer:", error);
            alert("Something went wrong while adding the customer.");
        }
        setIsNewCusModalOpen(false);
        setName("");
        setEmail("");
        setPhone("");
    };

    // 📌 Add Product
    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const payload = { name, category, price, stock, tax };
            const response = await fetch(`${apiUrl}/api/shop/create/product`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"// 🔑 Attach JWT
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            console.log("API response:", data);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            alert("New product added!");
            setIsAddProdModalOpen(false);
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Something went wrong while adding the product.");
        }
    };

    return (
        <div className="dashboard" style={{marginTop: "20px"}}>
            <h3>Dashboard</h3>

            {/* Time Range Selector */}
            <div className="time-range-selector glass-card">
                <label htmlFor="timeRange">📅 </label>
                <select
                    id="timeRange"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="dropdown"
                >
                    <option value="today">Today</option>
                    <option value="lastWeek">Last Week</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="lastYear">Last Year</option>
                </select>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card glass-card"  style={{ padding: "10px" }}>
                    <FaChartLine className="icon revenue"  style={{ fontSize: "3.2rem" }}/>
                    <div>
                        <p>Total Revenue</p>
                        <h3 style={{ fontSize: "1.2rem" }}>₹{dashboardData.monthlyRevenue?.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ padding: "10px" }}>
                    <FaBoxes className="icon units" style={{ fontSize: "3.2rem" }} />
                    <div>
                        <p>Total Units Sold</p>
                        <h3 style={{ fontSize: "1.2rem" }}>{dashboardData.totalUnitsSold}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ padding: "10px" }}>
                    <FaRupeeSign className="icon tax" style={{ fontSize: "3.2rem" }}/>
                    <div>
                        <p>Tax Collected</p>
                        <h3 style={{ fontSize: "1.2rem" }}>₹{dashboardData.taxCollected?.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="stat-card glass-card" style={{ padding: "10px" }}>
                    <FaBan className="icon stock" style={{ fontSize: "3.2rem" }}/>
                    <div>
                        <p>Out of Stock Products</p>
                        <h3 style={{ fontSize: "1.2rem" }}>{dashboardData.outOfStockCount}</h3>
                    </div>
                </div>
            </div>

            {/* Shortcuts */}
            <div className="quick-shortcuts glass-card" >
                <h3 style ={{ marginTop: '30px', flexDirection: 'column', gap: '1rem' }}>Quick Shortcuts</h3>
                <div className="shortcuts-container">
                    <button className="btn" onClick={() => goTo('billing')}>New Billing</button>
                    <button className="btn" onClick={() => setIsAddProdModalOpen(true)}>Add Product</button>
                    <button className="btn" onClick={() => setIsNewCusModalOpen(true)}>New Customer</button>
                    <button className="btn" onClick={() => goTo('reports')}>Generate Report</button>
                    <button className="btn" onClick={() => goTo('analytics')}>Analytics</button>
                    <button className="btn" onClick={() => goTo('payments')}>Payments</button>
                </div>
            </div>

            {/* Recent Sales */}
            <div className="recent-sales glass-card">
                <h3 style ={{ marginTop: '30px', flexDirection: 'column', gap: '1rem' }}>Recent Sales</h3>
                <table className="data-table">
                    <thead>
                    <tr>
                        <th>Invoice ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {recentSales.map((sale) => (
                        <tr key={sale.id}>
                            <td style={{ padding: "4px 8px" }}>{sale.id}</td>
                            <td style={{ padding: "4px 8px" }}>{sale.customer}</td>
                            <td style={{ whiteSpace: "nowrap", padding: "4px 8px" }}>
                                {(() => {
                                    const d = new Date(sale.date);
                                    const day = String(d.getDate()).padStart(2, "0");
                                    const month = String(d.getMonth() + 1).padStart(2, "0");
                                    const year = d.getFullYear();
                                    return `${day}-${month}-${year}`;
                                })()}
                            </td>
                            <td style={{ padding: "4px 8px" }}>₹{sale.total.toLocaleString()}</td>
                            <td style={{ padding: "4px 8px" }}>
        <span className={sale.status === "Paid" ? "status-paid" : "status-pending"}>
          {sale.status}
        </span>
                            </td>
                        </tr>
                    ))}
                    </tbody>


                </table>
            </div>

            {/* Add Customer Modal */}
            {isNewCusModalOpen && (
                <Modal show={isNewCusModalOpen} onClose={() => setIsNewCusModalOpen(false)}>
                    <h2>Add New Customer</h2>
                    <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn">Add Customer</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Add Product Modal */}
            <Modal title="Add New Product" show={isAddProdModalOpen} onClose={() => setIsAddProdModalOpen(false)}>
                <form onSubmit={handleAddProduct}>
                    <div className="form-group">
                        <label>Product Name</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="">-- Select Category --</option>
                            <option value="Smartphones">Smartphones</option>
                            <option value="Laptops and Computers">Laptops and Computers</option>
                            <option value="Audio">Audio</option>
                            <option value="Videos">Videos</option>
                            <option value="Accessories">Accessories</option>
                            <option value="Others">Others</option>
                        </select>
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
        </div>
    );
};

export default DashboardPage;
