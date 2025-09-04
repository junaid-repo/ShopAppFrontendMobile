import React, { useState, useEffect } from 'react';
import { useBilling } from '../context/BillingContext';
import Modal from '../components/Modal';
import { FaPlus, FaTrash } from 'react-icons/fa';
import '../index.css';
import { useConfig } from "./ConfigProvider";

const BillingPage = () => {
    const {
        selectedCustomer, setSelectedCustomer,
        cart, addProduct, removeProduct,
        paymentMethod, setPaymentMethod,
        clearBill, products, loadProducts
    } = useBilling();

    const [remarks, setRemarks] = useState("");
    const [customersList, setCustomersList] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNewCusModalOpen, setIsNewCusModalOpen] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [orderRef, setOrderRef] = useState('');
    const [paidAmount, setPaidAmount] = useState(0);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const [sellingPrices, setSellingPrices] = useState({});

    const token = localStorage.getItem('jwt_token');
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
    );

    // --- API CALL TO FETCH CUSTOMERS & PRODUCTS ---
    useEffect(() => {
        fetch(`${apiUrl}/api/shop/get/customersList`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(setCustomersList)
            .catch(err => console.error(err));

        if (!products.length) fetchProductsFromAPI();
    }, []);

    const fetchProductsFromAPI = () => {
        fetch(`${apiUrl}/api/shop/get/productsList`, { headers: { "Authorization": `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => {
                const inStock = data.filter(p => p.stock > 0);
                loadProducts(inStock);
                const initialPrices = {};
                inStock.forEach(p => initialPrices[p.id] = p.price);
                setSellingPrices(prev => ({ ...initialPrices, ...prev }));
            })
            .catch(console.error);
    };

    useEffect(() => {
        setSellingPrices(prev => {
            const next = { ...prev };
            products.forEach(p => { if (next[p.id] === undefined) next[p.id] = p.price; });
            return next;
        });
    }, [products]);

    const handleAddProduct = (p) => {
        const sellingPrice = sellingPrices[p.id] ?? p.price;
        addProduct({ ...p, sellingPrice });
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        const payload = { name, email, phone };

        try {
            const response = await fetch(`${apiUrl}/api/shop/create/forBilling/customer`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(await response.text());
            const newCustomer = await response.json();
            setCustomersList(prev => [...prev, newCustomer]);
            setSelectedCustomer(newCustomer);
            setName(""); setEmail(""); setPhone("");
            setIsNewCusModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Failed to add customer. Check console for details.");
        }
    };

    const cartWithDiscounts = cart.map(item => {
        const perProductDiscount = item.price > 0
            ? (((item.price - (item.sellingPrice ?? item.price)) / item.price) * 100).toFixed(2)
            : 0;
        return { ...item, discountPercentage: perProductDiscount };
    });

    const actualSubtotal = cart.reduce((t, i) => t + i.price * i.quantity, 0);
    const sellingSubtotal = cart.reduce((t, i) => t + ((i.sellingPrice ?? i.price) * i.quantity), 0);
    const tax = cart.reduce((t, i) => t + ((i.sellingPrice ?? i.price) * i.tax * 0.01 * i.quantity), 0);
    const total = sellingSubtotal - tax;
    const discountPercentage = actualSubtotal ? (((actualSubtotal - sellingSubtotal) / actualSubtotal) * 100).toFixed(2) : 0;

    const filteredCustomers = customersList.filter(c =>
        (c.name?.toLowerCase().includes(searchTerm.toLowerCase())) || (c.phone?.includes(searchTerm))
    );

    const HandleProcessPayment = () => {
        if (!selectedCustomer || !cart.length) return alert('Select a customer and add products.');
        const payload = { selectedCustomer, cart: cartWithDiscounts, sellingSubtotal, discountPercentage, tax, paymentMethod, remarks };

        fetch(`${apiUrl}/api/shop/do/billing`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                setOrderRef(data.invoiceNumber ?? 'N/A');
                setPaidAmount(sellingSubtotal);
                setShowPopup(true);
                clearBill();
                fetchProductsFromAPI();
            })
            .catch(err => { console.error(err); alert("Billing failed."); });
    };

    return (
        <div className="billing-page">
            <h2>Billing</h2>
            <div className="billing-layout">
                <div className="product-list glass-card">
                    <div className="header-row">
                        <h3>Available Products</h3>
                        {selectedCustomer && <button className="btn" onClick={() => { clearBill(); fetchProductsFromAPI(); }}>New Billing</button>}
                    </div>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearchTerm}
                        onChange={e => setProductSearchTerm(e.target.value)}
                        className="search-bar"
                    />
                    <div className="product-table-wrapper">
                        <table className="beautiful-table">
                            <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price (₹)</th>
                                <th>Selling Price (₹)</th>
                                <th>Stock</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredProducts.map(p => (
                                <tr key={p.id} className={p.stock <= 0 ? "out-of-stock" : ""}>
                                    <td>{p.name}</td>
                                    <td>{p.price}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            value={sellingPrices[p.id] ?? p.price}
                                            onChange={e => setSellingPrices({ ...sellingPrices, [p.id]: Number(e.target.value) })}
                                            className="selling-price-input"
                                            style={{
                                                width: "80px",
                                                padding: "3px 6px",
                                                borderRadius: "25px",
                                                borderColor: "skyblue",
                                                textAlign: "center",
                                                fontSize: "0.9rem"
                                            }}  />

                                    </td>
                                    <td>{p.stock}</td>
                                    <td>
                                        <button className="btn small-btn" onClick={() => handleAddProduct(p)} disabled={p.stock <= 0} title={p.stock <= 0 ? "Out of Stock" : "Add to Cart"}>
                                            <FaPlus />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center' }}>No matching products.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="invoice-details glass-card">
                    <h3>Current Bill</h3>
                    <div className="customer-actions">
                        <button className="btn" style={{
                            width: "45%",
                            marginRight: "12px"
                        }} onClick={() => setIsModalOpen(true)}>
                            {selectedCustomer ? 'Reselect Customer' : 'Select Customer'}
                        </button>
                        <button className="btn"  style={{
                            width: "45%",
                            paddingTop: "10px",
                            marginRight: "12px"
                        }} onClick={() => setIsNewCusModalOpen(true)}>
                            <FaPlus /> Create Customer
                        </button>
                    </div>
                    {selectedCustomer && <p>Customer: <strong>{selectedCustomer.name}</strong></p>}
                    <div className="cart-items">
                        {cart.length === 0 ? <p>No items in cart.</p> : cart.map(item => (
                            <div className="cart-item" key={item.id}>
                                <span>{item.name} (x{item.quantity})</span>
                                <span>
                                    <span className="actual-price">₹{(item.price * item.quantity).toLocaleString()}</span>
                                    <span>₹{((item.sellingPrice ?? item.price) * item.quantity).toLocaleString()}</span>
                                </span>
                                <button className="remove-btn" onClick={() => removeProduct(item.id)}><FaTrash /></button>
                            </div>
                        ))}
                    </div>
                    <div className="invoice-summary">
                        <h4 style={{ marginBottom: "12px" }}>
                            Total without GST: <span>₹{total.toLocaleString()}</span>
                        </h4>

                        <p style={{ marginBottom: "12px" }}>
                            GST: <span>₹{tax.toLocaleString()}</span>
                        </p>

                        <p style={{ marginBottom: "12px" }}>
                            Discount %: <span>{discountPercentage}%</span>
                        </p>

                        <p style={{ marginBottom: "16px" }}>
                            Final Total: <span>₹{sellingSubtotal.toLocaleString()}</span>
                        </p>

                        <div className="remarks-section" style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", marginBottom: "8px" }}>Remarks:</label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Enter any remarks..."
                                style={{
                                    width: "100%",
                                    minHeight: "60px",
                                    padding: "10px",
                                    borderRadius: "15px",
                                    border: "1px solid var(--border-color)",
                                    background: "var(--glass-bg)",
                                    resize: "vertical",
                                    fontSize: "1rem",
                                    color: "var(--text-color)"
                                }}
                            />
                        </div>

                        <div className="payment-methods" style={{ marginBottom: "20px" }}>
                            <h5 style={{ marginBottom: "12px" }}>Payment Method:</h5>
                            {[
                                { type: "CASH", color: "#00aaff", icon: "💵" },
                                { type: "CARD", color: "#0077cc", icon: "💳" },
                                { type: "UPI", color: "#3399ff", icon: "📱" },
                            ].map((m) => (
                                <label
                                    key={m.type}
                                    className={`payment-method ${paymentMethod === m.type ? "selected" : ""}`}
                                    style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}
                                >
        <span className="method-icon" style={{ backgroundColor: m.color }}>
          {m.icon}
        </span>
                                    <input
                                        type="radio"
                                        value={m.type}
                                        checked={paymentMethod === m.type}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    {m.type}
                                </label>
                            ))}
                        </div>
                    </div>

                    <button className="btn process-payment-btn" onClick={HandleProcessPayment}>Process Payment</button>
                </div>
            </div>

            {/* Modals */}
            <Modal title="Select Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-bar" />
                <ul className="customer-modal-list">
                    {filteredCustomers.length ? filteredCustomers.map(c => (
                        <li key={c.id} onClick={() => { setSelectedCustomer(c); setIsModalOpen(false); setSearchTerm(''); }}>
                            <span>{c.name}</span> <span className="phone">{c.phone}</span>
                        </li>
                    )) : <li>No customers found.</li>}
                </ul>
            </Modal>

            <Modal title="Add New Customer" show={isNewCusModalOpen} onClose={() => setIsNewCusModalOpen(false)}>
                <form onSubmit={handleAddCustomer}>
                    <div className="form-group"><label>Full Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="form-group"><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div className="form-group"><label>Phone Number</label><input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} /></div>
                    <div className="form-actions"><button type="submit" className="btn">Add & Select Customer</button></div>
                </form>
            </Modal>

            {/* Payment Success Popup */}
            {showPopup && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 2000,
                    }}
                    onClick={() => setShowPopup(false)}
                >
                    <div
                        style={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
                            padding: "2rem",
                            maxWidth: "400px",
                            width: "90%",
                            textAlign: "center",
                            boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
                            transform: "scale(1)",
                            transition: "transform 0.2s ease, opacity 0.2s ease",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ marginBottom: "1rem", color: "green" }}>✅ Payment Successful</h2>
                        <p style={{ marginBottom: "0.5rem" }}>
                            Order Reference: <strong>{orderRef}</strong>
                        </p>
                        <p style={{ marginBottom: "1rem" }}>
                            Amount Paid: <strong>₹{paidAmount.toLocaleString()}</strong>
                        </p>
                        <button
                            className="btn"
                            onClick={() => setShowPopup(false)}
                            style={{
                                padding: "8px 16px",
                                borderRadius: "8px",
                                backgroundColor: "#0077cc",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default BillingPage;
