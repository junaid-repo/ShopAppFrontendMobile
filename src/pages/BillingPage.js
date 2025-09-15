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
    const [loading, setLoading] = useState(false);

    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const [searchTerm, setSearchTerm] = useState('');


    // pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const pageSize = 10; // rows per page

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
    );

    // --- API CALL TO FETCH CUSTOMERS & PRODUCTS ---
    useEffect(() => {
        fetch(`${apiUrl}/api/shop/get/customersList`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(res => res.json())
            .then(setCustomersList)
            .catch(err => console.error(err));

        if (!products.length) fetchProductsFromAPI();
    }, []);

    // refetch when page changes
    useEffect(() => {
        if (!apiUrl) return;
        fetchProductsFromAPI(currentPage, productSearchTerm);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    // when search term changes, reset to page 1 and fetch
    useEffect(() => {
        if (!apiUrl) return;
        setCurrentPage(1);
        fetchProductsFromAPI(1, productSearchTerm);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productSearchTerm]);

    const fetchProductsFromAPI = (page = 1, q = '') => {
        if (!apiUrl) return;

        // build query params for pagination + optional search
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', pageSize);
        if (q) {
            params.append('q', q);
            // also send searchTerm for backend endpoints expecting that name
            params.append('search', q);
        }

        fetch(`${apiUrl}/api/shop/get/withCache/productsList?${params.toString()}`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(res => res.json())
            .then(data => {
                // API might return either an array (legacy) or an object { products: [], total: N }
                console.log("THe fetched product data is:", data);
                let items = [];
                let total = 0;

                if (Array.isArray(data)) {
                    // legacy: assume full list or already-paged array
                    items = data;
                    total = data.length;
                } else if (data && data.data) {
                    items = data.data;
                    total = items.length;
                } else {
                    items = Array.isArray(data) ? data : [];
                    total = items.length;
                }

                const inStockProducts = items.filter(p => p.stock > 0);
                loadProducts(inStockProducts);

                // initialize selling prices for fetched products (default = actual price)
                const initialPrices = {};
                inStockProducts.forEach(p => { initialPrices[p.id] = p.price; });
                setSellingPrices(prev => ({ ...initialPrices, ...prev }));

                setTotalProducts(total);
                setTotalPages(data.totalPages);
            })
            .catch(err => console.error("Error fetching products:", err));
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

    // Small pagination component used for the Available Products section
    const Pagination = () => {
        console.log("totalPage", totalPages);
        if (totalPages <= 1) return null;

        const getPaginationItems = () => {
            const items = [];
            if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) items.push(i);
                return items;
            }
            items.push(1);
            if (currentPage > 4) items.push('...');
            if (currentPage > 2) items.push(currentPage - 1);
            if (currentPage !== 1 && currentPage !== totalPages) items.push(currentPage);
            if (currentPage < totalPages - 1) items.push(currentPage + 1);
            if (currentPage < totalPages - 3) items.push('...');
            items.push(totalPages);
            return Array.from(new Set(items));
        };

        return (
            <div className="product-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <div style={{ color: 'var(--text-color)' }}>
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalProducts || 0)} - {Math.min(currentPage * pageSize, totalProducts || 0)} of {totalProducts}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn" onClick={() => { if (currentPage > 1) setCurrentPage(prev => prev - 1); }} disabled={currentPage <= 1}>Prev</button>

                    {getPaginationItems().map((page, idx) => (
                        page === '...' ? (
                            <span key={`dots-${idx}`}>...</span>
                        ) : (
                            <button key={page} className={`btn ${page === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                        )
                    ))}

                    <button className="btn" onClick={() => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); }} disabled={currentPage >= totalPages}>Next</button>
                </div>
            </div>
        );
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        const payload = { name, email, phone };

        try {
            const response = await fetch(`${apiUrl}/api/shop/create/forBilling/customer`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
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
        setLoading(true);
        const payload = { selectedCustomer, cart: cartWithDiscounts, sellingSubtotal, discountPercentage, tax, paymentMethod, remarks };

        fetch(`${apiUrl}/api/shop/do/billing`, {
            method: "POST",
            credentials: 'include',
            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload),
        })
            .then(res => res.json())
            .then(data => {
                setOrderRef(data.invoiceNumber ?? 'N/A');
                setPaidAmount(sellingSubtotal);
                setLoading(false);
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

                    {/* Pagination controls (extracted to component) */}
                    <Pagination />
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
                        <h4>Total without gst: <span>₹{total.toLocaleString()}</span></h4>
                        <p className="tax">
                            GST : <span>₹{tax.toLocaleString()}</span>
                        </p>
                        {/* <p className="subtotal-actual">
                            Subtotal (Actual): <span>₹{actualSubtotal.toLocaleString()}</span>
                        </p>*/}
                        <p className="discount">
                            Discount %: <span>{discountPercentage}%</span>
                        </p>
                        <p className="subtotal-selling">
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

                        <div className="payment-methods" style={{ marginTop: '1rem' }}>
                            <h5 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>Payment Method:</h5>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                    { type: 'CASH', color: '#00aaff', icon: '💵' },
                                    { type: 'CARD', color: '#0077cc', icon: '💳' },
                                    { type: 'UPI', color: '#3399ff', icon: '📱' }
                                ].map(method => (
                                    <label
                                        key={method.type}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            width: '100%',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '25px',
                                            border: `1px solid ${paymentMethod === method.type ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                            background: paymentMethod === method.type ? 'var(--primary-color-light)' : 'var(--glass-bg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            fontWeight: '500',
                                            color: 'var(--text-color)'
                                        }}
                                    >
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: method.color,
                color: 'white',
                fontSize: '0.9rem'
            }}
        >
          {method.icon}
        </span>
                                        <input
                                            type="radio"
                                            value={method.type}
                                            checked={paymentMethod === method.type}
                                            onChange={e => setPaymentMethod(e.target.value)}
                                            style={{ accentColor: 'var(--primary-color)' }}
                                        />
                                        {method.type}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button className="btn process-payment-btn" onClick={HandleProcessPayment}>Process Payment</button>


                </div>
                <div> {loading && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            zIndex: 2000,
                            animation: 'fadeIn 0.3s ease'
                        }}
                    >
                        <div
                            style={{
                                background: 'var(--glass-bg)',
                                padding: '2rem',
                                borderRadius: '25px',
                                width: '90%',
                                maxWidth: '500px',
                                boxShadow: '0 8px 30px var(--shadow-color)',
                                color: 'var(--text-color)',
                                border: '1px solid var(--border-color)',
                                textAlign: 'center',
                                animation: 'slideIn 0.3s ease',
                            }}
                        >
                            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', fontSize: '1.8rem' }}>
                                Processing Payment...
                            </h2>

                            {/* Spinner */}
                            <div
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    border: "6px solid var(--border-color)",
                                    borderTop: "6px solid var(--primary-color)",
                                    borderRadius: "50%",
                                    animation: "spin 1s linear infinite",
                                    margin: "0 auto"
                                }}
                                className="spinner"
                            ></div>

                            {/* Spinner Animation */}
                            <style>
                                {`
                                    @keyframes spin {
                                        0% { transform: rotate(0deg); }
                                        100% { transform: rotate(360deg); }
                                    }
                                
                                    .spinner {
                                        animation: spin 1s linear infinite;
                                    }
                                    `}
                            </style>

                            <p style={{ marginTop: '1rem', fontSize: '1rem' }}>Please wait while we complete your payment.</p>
                        </div>
                    </div>
                )}
                    {showPopup && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 2000,
                                animation: 'fadeIn 0.3s ease'
                            }}
                            onClick={() => setShowPopup(false)}
                        >
                            <div
                                style={{
                                    background: 'var(--glass-bg)',
                                    padding: '2rem',
                                    borderRadius: '25px',
                                    width: '90%',
                                    maxWidth: '500px',
                                    boxShadow: '0 8px 30px var(--shadow-color)',
                                    color: 'var(--text-color)',
                                    border: '1px solid var(--border-color)',
                                    textAlign: 'center',
                                    animation: 'slideIn 0.3s ease',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 style={{ color: 'var(--primary-color)', marginBottom: '1rem', fontSize: '1.8rem' }}>
                                    ✅ Payment Successful
                                </h2>
                                <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>
                                    Order Reference: <strong>{orderRef}</strong>
                                </p>
                                <p style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>
                                    Amount Paid: <strong>₹{paidAmount.toLocaleString()}</strong>
                                </p>
                                <button
                                    style={{
                                        marginTop: '1.5rem',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '25px',
                                        border: 'none',
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => setShowPopup(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
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


        </div>
    );
};

export default BillingPage;
