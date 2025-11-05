// src/pages/DashboardPage.js
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { FaRupeeSign, FaBoxes, FaBan, FaChartLine } from 'react-icons/fa';
import CurrencyRupeeTwoToneIcon from '@mui/icons-material/CurrencyRupeeTwoTone';
import Modal from '../components/Modal';
import './DashboardPage.css';
import { useNavigate } from 'react-router-dom';
import { useConfig } from "./ConfigProvider";
import { Line } from 'react-chartjs-2'; // 1. Added Graph Import
import { // 1. Added ChartJS Imports
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';

// 1. Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

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

    // --- 1. Added State for Sales Graph ---
    const [weeklySalesData, setWeeklySalesData] = useState([]); // State for graph data
    const lineChartRef = useRef(null);

    // --- 2. Added State for Top Products ---
    const [productFactor, setProductFactor] = useState('mostSelling'); // 'mostSelling' or 'topGrossing'
    const [topProducts, setTopProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);


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

    // --- 1. Added Helper function to format large numbers ---
    const formatLargeNumber = (value) => {
        if (value >= 10000000) { // 10 million or more
            return `${(value / 10000000).toFixed(1)}Cr`;
        } else if (value >= 100000) { // 1 lakh or more
            return `${(value / 100000).toFixed(1)}L`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return value?.toString?.() ?? '';
    };

    // --- 1. Added Function to fetch weekly sales ---
    const fetchWeeklySales = async () => {
        try {
            if (!apiUrl) throw new Error('No API URL');
            const response = await fetch(`${apiUrl}/api/shop/get/analytics/weekly-sales/${timeRange}`, {
                method: "GET",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("Weekly Sales Data:", data);
            setWeeklySalesData(Array.isArray(data) ? data : []);
        } catch (error) {
            console.warn("Error fetching weekly sales data:", error);
            setWeeklySalesData([]); // Fallback to empty on error
        }
    };

    // --- 2. Added Function to fetch top products ---
    const fetchTopProducts = async () => {
        setIsLoadingProducts(true);
        const params = new URLSearchParams({
            count: 3,
            timeRange: timeRange,
            factor: productFactor,
        });

        try {
            if (!apiUrl) throw new Error('No API URL');
            const response = await fetch(`${apiUrl}/api/shop/get/top/products?${params.toString()}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) throw new Error('Failed to fetch top products');
            const data = await response.json();
            setTopProducts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching top products:", error);
            setTopProducts([]); // safe fallback
        } finally {
            setIsLoadingProducts(false);
        }
    };

    // --- 1. Added useEffect for fetching weekly sales ---
    useEffect(() => {
        if (apiUrl) {
            fetchWeeklySales();
        }
    }, [timeRange, apiUrl]);

    // --- 2. Added useEffect for fetching top products ---
    useEffect(() => {
        if (apiUrl) {
            fetchTopProducts();
        }
    }, [timeRange, productFactor, apiUrl]);


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

    // --- 1. Added Chart.js Configuration ---
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#333' } // Simplified for mobile
            },
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: { display: true, text: 'Revenue (₹)', color: '#8884d8' },
                ticks: {
                    color: '#9ca3af',
                    callback: function(value) {
                        return '₹' + formatLargeNumber(value);
                    }
                },
                grid: { color: 'rgba(156, 163, 175, 0.1)' }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: { display: true, text: 'Units Sold', color: '#82ca9d' },
                ticks: { color: '#9ca3af' },
                grid: { drawOnChartArea: false },
            },
            x: {
                ticks: { color: '#9ca3af' },
                grid: { color: 'rgba(156, 163, 175, 0.1)' }
            }
        },
    };

    const chartData = {
        labels: (weeklySalesData || []).map(d => d.day),
        datasets: [
            {
                fill: true,
                label: 'Total Sales',
                data: (weeklySalesData || []).map(d => d.totalSales),
                borderColor: '#00b0ff',
                backgroundColor: 'rgba(0, 176, 255, 0.1)', // Simplified
                yAxisID: 'y',
                tension: 0.4,
                pointBackgroundColor: '#00b0ff',
                pointRadius: 2,
            },
            {
                fill: true,
                label: 'Units Sold',
                data: (weeklySalesData || []).map(d => d.unitsSold),
                borderColor: '#00bfa5',
                backgroundColor: 'rgba(0, 191, 165, 0.1)', // Simplified
                yAxisID: 'y1',
                tension: 0.4,
                pointBackgroundColor: '#00bfa5',
                pointRadius: 2,
            },
        ],
    };
    // --- End of Chart.js Configuration ---


    return (
        <div className="dashboard" style={{marginTop: "20px"}}>
            <h3>Dashboard</h3>

            {/* Time Range Selector */}
            <div className="time-range-selector glass-card" style={{ boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.06)", borderRadius: "20px", border: "1px solid var(--primary-color-light)"} }>
                <label htmlFor="timeRange"><i class="fa-duotone fa-solid fa-calendar-range" style={{fontSize:'15px', marginRight:'0px'}}></i> </label>
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

            {/* --- 3. Updated Shortcuts --- */}
            <div className="quick-shortcuts glass-card" >
                <h3 style ={{ marginTop: '30px', flexDirection: 'column', gap: '1rem' }}>Quick Shortcuts</h3>
                <div className="shortcuts-container">
                    <button className="btn" onClick={() => goTo('billing')}><i
                        className="fa-duotone fa-solid fa-cart-plus" style={{paddingRight: '7px'}}></i>New Sale
                    </button>
                    <button className="btn" onClick={() => goTo('reports')}><i
                        className="fa-duotone fa-solid fa-file-spreadsheet" style={{paddingRight: '7px'}}></i>Reports
                    </button>
                    <button className="btn" onClick={() => goTo('profile')}><i className="fa-duotone fa-solid fa-user"
                                                                               style={{paddingRight: '7px'}}></i>
                        Profile
                    </button>
                    <button className="btn" onClick={() => goTo('notifications')}><i
                        className="fa-duotone fa-solid fa-bell" style={{paddingRight: '7px'}}></i>Alerts
                    </button>
                    <button className="btn" onClick={() => goTo('customers')}><i
                        className="fa-duotone fa-regular fa-users" style={{paddingRight: '7px'}}></i>Customers
                    </button>
                    <button className="btn" onClick={() => goTo('analytics')}><i
                        className="fa-duotone fa-solid fa-chart-mixed" style={{paddingRight: '7px'}}></i>Analytics
                    </button>

                </div>
            </div>

            {/* --- 1. Added Sales Performance Graph --- */}
            <div className="weekly-sales-graph glass-card">
                <h3 className="card-header" onClick={() => goTo('analytics')}>Sales Performance</h3>
                {/* You may need to add a .chart-container style to your CSS */}
                <div className="chart-container" style={{ height: "250px", position: "relative" }}>
                    <Line ref={lineChartRef} options={chartOptions} data={chartData} />
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

            {/* --- 2. Added Top Products --- */}
            <div className="top-products glass-card">
                <div
                    className="card-header"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <div className="toggle-buttons">
                        <button
                            className={`toggle-btn ${
                                productFactor === "mostSelling" ? "active" : ""
                            }`}
                            onClick={() => setProductFactor("mostSelling")}
                        >
                            Most Selling
                        </button>
                        <button
                            className={`toggle-btn ${
                                productFactor === "topGrossing" ? "active" : ""
                            }`}
                            onClick={() => setProductFactor("topGrossing")}
                        >
                            Top Grossing
                        </button>
                    </div>
                    <h3>Top Products</h3>
                </div>

                <div className="table-container">
                    {isLoadingProducts ? (
                        <p>Loading...</p>
                    ) : (
                        <table className="data-table gradient-table">
                            <thead>
                            <tr>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Stock</th>
                                <th>Revenue</th>
                                <th>Units Sold</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(topProducts || []).map((product) => (
                                <tr key={product.productName || JSON.stringify(product)} onClick={() => goTo('products')}>
                                    <td>{product.productName}</td>
                                    <td>{product.category}</td>
                                    <td>{product.currentStock}</td>
                                    <td>
                                        ₹{(product.amount ?? 0).toLocaleString("en-IN")}
                                    </td>
                                    <td>{product.count}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
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