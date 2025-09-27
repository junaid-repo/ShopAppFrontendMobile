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
        clearBill, products, loadProducts,
        updateCartItem
    } = useBilling();
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
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
    const [sellingPrices, setSellingPrices] = useState({}); // <-- Selling Price state

    // pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const pageSize = 10; // rows per page
    const [loading, setLoading] = useState(false);
    const [availableMethods, setAvailableMethods]= useState([]);
    // NOTE: products coming from context represent the current page after fetch
    const displayedProducts = products;

    const [searchTerm, setSearchTerm] = useState('');

    const config = useConfig();
    var apiUrl = "";

    if (config) {
        apiUrl = config.API_URL;
    }

    // --- API CALL TO FETCH CUSTOMERS & PRODUCTS ---
    useEffect(() => {
        if (!apiUrl) return;

        fetch(`${apiUrl}/api/shop/get/customersList`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(res => res.json())
            .then(setCustomersList)
            .catch(err => console.error("Error fetching customers:", err));

        // fetch first page of products
        fetchProductsFromAPI(1, productSearchTerm);
        // eslint-disable-next-line
    }, [apiUrl]);

    useEffect(() => {
        if (!apiUrl) return;
        fetch(`${apiUrl}/api/shop/availablePaymentMethod`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch payment methods");
                return res.json();
            })
            .then(data => {
                //Convert { CASH: true, CARD: false } → Map
                const methodsMap = new Map(Object.entries(data));
                setAvailableMethods(data);
            })
            .catch(err => console.error("Error fetching payment methods:", err));
    }, [apiUrl]);

    console.log("the available payment methods are ",availableMethods);

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

    // keep sellingPrices initialized for products that might come from context (preserve any user edits)
    useEffect(() => {
        setSellingPrices(prev => {
            const next = { ...prev };
            products.forEach(p => {
                if (next[p.id] === undefined) next[p.id] = p.price;
            });
            return next;
        });
    }, [products]);

    // --- add product handler that attaches sellingPrice to the product object ---
    const handleAddProduct = (p) => {
        const sellingPrice = sellingPrices[p.id] !== undefined ? sellingPrices[p.id] : p.price;
        addProduct({ ...p, sellingPrice });
    };

    // Small pagination component used for the Available Products section
    const Pagination = () => {
        if (totalPages <= 1) return null;

        const getPaginationItems = () => {
            const pages = [];
            const maxVisible = 4;

            // Always include first and last page
            pages.push(1);

            let start = Math.max(2, currentPage - Math.floor(maxVisible / 2));
            let end = Math.min(totalPages - 1, start + maxVisible - 1);

            // shift window if close to the end
            if (end >= totalPages) {
                end = totalPages - 1;
                start = Math.max(2, end - maxVisible + 1);
            }

            if (start > 2) {
                pages.push("...");
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages - 1) {
                pages.push("...");
            }

            if (totalPages > 1) {
                pages.push(totalPages);
            }

            return pages;
        };

        return (
            <div
                className="product-pagination"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "12px",
                }}
            >
                <div style={{ color: "var(--text-color)" }}>
                    Showing {Math.min((currentPage - 1) * pageSize + 1, totalProducts || 0)} -{" "}
                    {Math.min(currentPage * pageSize, totalProducts || 0)} of {totalProducts}
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                        className="btn"
                        onClick={() => {
                            if (currentPage > 1) setCurrentPage((prev) => prev - 1);
                        }}
                        disabled={currentPage <= 1}
                    >
                        Prev
                    </button>

                    {getPaginationItems().map((page, idx) =>
                        page === "..." ? (
                            <span key={`dots-${idx}`}>...</span>
                        ) : (
                            <button
                                key={page}
                                className={`btn ${page === currentPage ? "active" : ""}`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        )
                    )}

                    <button
                        className="btn"
                        onClick={() => {
                            if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
                        }}
                        disabled={currentPage >= totalPages}
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    };


    // --- MODIFIED: API CALL TO CREATE AND SELECT A NEW CUSTOMER (WITH DEBUGGING) ---
    const handleAddCustomer = async (e) => {
        e.preventDefault();

        const payload = { name, email, phone };

        // DEBUG: Let's see what we are sending
        console.log("Attempting to create customer with payload:", payload);

        try {
            const response = await fetch(`${apiUrl}/api/shop/create/forBilling/customer`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            // DEBUG: Check the raw response from the server
            console.log("API Response Status:", response.status, response.statusText);

            if (!response.ok) {
                // If the response is not OK, log the error message from the server
                const errorData = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
            }

            const newCustomer = await response.json();

            // DEBUG: Check what we received and parsed as JSON
            console.log("✅ Successfully parsed new customer:", newCustomer);

            // This part will only run if the above lines succeed
            setCustomersList(prevList => [...prevList, newCustomer]);
            setSelectedCustomer(newCustomer);

            console.log("Customer state has been updated.");

            setName("");
            setEmail("");
            setPhone("");
            setIsNewCusModalOpen(false);

        } catch (error) {
            // DEBUG: This will catch any failure in the try block
            console.error("❌ Error adding customer:", error);
            alert(`Failed to add customer. Please check the console for details.`);
        }
    };


    // enrich cart items with per-product discount %
    const cartWithDiscounts = cart.map(item => {
        const perProductDiscount = item.price > 0
            ? (((item.price - (item.sellingPrice || item.price)) / item.price) * 100).toFixed(2)
            : 0;
        return {
            ...item,
            discountPercentage: perProductDiscount
        };
    });

    // --- API CALL TO PROCESS THE PAYMENT ---
    const HandleProcessPayment = () => {
        if (!selectedCustomer || cart.length === 0) {
            alert('Please select a customer and add products.');
            return;
        }
        setLoading(true);
        const payload = { selectedCustomer, cart: cartWithDiscounts, sellingSubtotal, discountPercentage, tax, paymentMethod, remarks };

        console.log("payload for billing ", payload);

        // 🔴 API may need changes here to accept `sellingPrice` for each cart item
        fetch(`${apiUrl}/api/shop/do/billing`, {
            method: "POST",
            credentials: 'include',
            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload),
        })
            .then(res => res.json())
            .then(data => {
                setOrderRef(data.invoiceNumber || 'N/A');
                setPaidAmount(sellingSubtotal);

                setLoading(false);
                setShowPopup(true);
                handleNewBilling();
            })
            .catch(err => {
                console.error("Billing failed:", err);
                alert("Billing failed.");
            });
    };

    const HandleCardProcessPayment = async () => {
        if (!selectedCustomer || cart.length === 0) {
            alert("Please select a customer and add products.");
            return;
        }
        setLoading(true);

        const billingPayload = {
            selectedCustomer,
            cart: cartWithDiscounts,
            sellingSubtotal,
            discountPercentage,
            tax,
            paymentMethod,
            remarks,
        };

        const orderResponse = await fetch(`${apiUrl}/api/razorpay/create-order`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: sellingSubtotal * 100, // Amount in paise
                currency: "INR",
            }),
        });

        if (!orderResponse.ok) {
            alert("Server error. Could not create order.");
            setLoading(false);
            return;
        }

        const orderData = await orderResponse.json();

        const options = {
            key: "rzp_test_RM94Bh3gUaJSjZ",
            order_id: orderData.id,
            name: "Clear Bill",
            description: "Billing Transaction",

            handler: async function (response) {
                const finalPayload = {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    billingDetails: billingPayload,
                };

                const verificationResponse = await fetch(
                    `${apiUrl}/api/razorpay/verify-payment`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(finalPayload),
                    }
                );

                if (!verificationResponse.ok) {
                    alert("Payment verification failed. Please contact support.");
                    setLoading(false);
                    return;
                }

                const finalBillData = await verificationResponse.json();



                setOrderRef(finalBillData.invoiceNumber || "N/A");
                setPaidAmount(finalBillData.totalAmount || sellingSubtotal);
                setLoading(false);
                setIsPreviewModalOpen(false)
                setShowPopup(true);

                handleNewBilling();
            },

            prefill: {
                name: selectedCustomer?.name || "Test User",
                email: selectedCustomer?.email || "test.user@example.com",
                contact: selectedCustomer?.phone || "9999999999",
            },

            theme: {
                color: "#3399cc",
            },
        };

        const rzp = new window.Razorpay(options);

        rzp.on("payment.failed", function (response) {
            alert(`Payment Failed: ${response.error.description}`);
            setLoading(false); // ✅ stop loader on failure
        });

        rzp.open();
        // ❌ Removed setLoading(false) here
    };


    const handleNewBilling = () => {
        clearBill();
        fetchProductsFromAPI(1, productSearchTerm);
    };

    // --- CALCULATIONS ---
    // actualSubtotal = based on real price saved in product.price
    // sellingSubtotal = based on sellingPrice (user editable). Totals/tax are calculated from sellingSubtotal.
    const actualSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
    const sellingSubtotal = cart.reduce((total, item) => total + ((item.sellingPrice !== undefined ? item.sellingPrice : item.price) * item.quantity), 0);
    //const tax = sellingSubtotal * 0.18;
    const tax = cart.reduce((total, item) => total + ((item.sellingPrice !== undefined ? item.sellingPrice * item.tax * 0.01 : item.price * item.tax * 0.01) * item.quantity), 0);;
    const total = sellingSubtotal - tax;
    const discountPercentage = actualSubtotal > 0 ? (((actualSubtotal - sellingSubtotal) / actualSubtotal) * 100).toFixed(2) : 0;

    const filteredCustomers = customersList.filter(customer => {
        const nameMatch = customer.name && customer.name.toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = customer.phone && customer.phone.includes(searchTerm);
        return nameMatch || phoneMatch;
    });

    const handlePreview = () => {
        if (!selectedCustomer || cart.length === 0) {
            alert('Please select a customer and add products.');
            return;
        }
        setIsPreviewModalOpen(true);
    };

    return (
        <div className="billing-page">
            <h2>Billing</h2>
            <div className="billing-layout" style={{marginTop: "1px"}}>
                <div className="product-list glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Available Products</h3>
                        {selectedCustomer && (
                            <button className="btn" onClick={handleNewBilling}>
                                New Billing
                            </button>
                        )}
                    </div>

                    {/* 🔍 Search bar */}
                    <input
                        type="text"
                        //className="search-bar"
                        placeholder="Search products..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '8px', margin: '10px 0'}}
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
                            {displayedProducts.map(p => (
                                <tr key={p.id} className={p.stock <= 0 ? "out-of-stock" : ""}>
                                    <td>{p.name}</td>
                                    <td>{p.price}</td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            value={sellingPrices[p.id] !== undefined ? sellingPrices[p.id] : p.price}
                                            onChange={(e) => setSellingPrices({ ...sellingPrices, [p.id]: Number(e.target.value) })}
                                            // small inline styling only for selling price box (requested)
                                            style={{
                                                width: "80px",
                                                padding: "3px 6px",
                                                borderRadius: "25px",
                                                border: "1.5px solid var(--border-color)",
                                                borderColor: "skyblue",
                                                textAlign: "center",
                                                fontSize: "0.9rem"
                                            }}
                                        />
                                    </td>
                                    <td>{p.stock}</td>
                                    <td>
                                        <button
                                            className="btn small-btn"
                                            onClick={() => handleAddProduct(p)}
                                            disabled={p.stock <= 0}
                                            title={p.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                                        >
                                            <FaPlus />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {displayedProducts.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center' }}>No matching products.</td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination controls (extracted to component) */}
                    <Pagination />

                </div>

                <div className="invoice-details glass-card">
                    <h3 style={{ textAlign: 'center' }}>Current Bill</h3>
                    <div className="customer-actions" style={{ marginBottom: '0.75rem', display: 'flex', gap: '10px' }}>
                        <button className="btn" onClick={() => setIsModalOpen(true)}>
                            {selectedCustomer ? 'Reselect Customer' : 'Select Customer'}
                        </button>
                        <button className="btn" onClick={() => setIsNewCusModalOpen(true)}>
                            <FaPlus /> Create Customer
                        </button>
                    </div>
                    {selectedCustomer && (
                        <p style={{ marginTop: '20px', fontSize: '1.1em',  textDecoration: 'underline'}}>
                            Customer: <strong>{selectedCustomer.name}</strong>{' '}
                            <strong style={{ fontSize: '0.8em', color: '#888', marginLeft: '10px' }}>{selectedCustomer.phone}</strong>
                        </p>
                    )}
                    <div className="cart-items">
                        {cart.length === 0 ? (
                            <p>No items in cart.</p>
                        ) : (
                            <div className="cart-table-wrapper">
                                <table className="beautiful-table cart-table">
                                    <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th style={{width: '40px'}}>Qty</th>
                                        <th>Price (₹)</th>
                                        <th>Selling (₹)</th>
                                        <th>Details</th>
                                        <th style={{width: '40px'}}>Action</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {cart.map(item => (
                                        <tr key={item.id} className={item.stock <= 0 ? 'out-of-stock' : ''}>
                                            <td style={{verticalAlign: 'top'}}>{item.name}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const q = Math.max(1, Number(e.target.value) || 1);
                                                        updateCartItem(item.id, { quantity: q });
                                                    }}
                                                    style={{ width: '40px', padding: '6px', borderRadius: '8px', border: '1px solid var(--bp-border)' }}
                                                />
                                            </td>
                                            <td style={{verticalAlign: 'top'}}>₹{(item.price * item.quantity).toLocaleString()}</td>
                                            <td style={{verticalAlign: 'top'}}>₹{(((item.sellingPrice !== undefined ? item.sellingPrice : item.price) * item.quantity)).toLocaleString()}</td>
                                            <td>
                                                    <textarea
                                                        value={item.details || ''}
                                                        onChange={(e) => updateCartItem(item.id, { details: e.target.value })}
                                                        placeholder="Enter item details..."
                                                        style={{ width: '100%', minHeight: '48px', padding: '6px', borderRadius: '8px', border: '1px solid var(--bp-border)', resize: 'vertical', background: 'var(--bp-glass)', color: 'var(--bp-text)' }}
                                                    />
                                            </td>
                                            <td style={{verticalAlign: 'top', width: '20px'}}>
                                                <button className="remove-btn" onClick={() => removeProduct(item.id)}>
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
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




                        <div className="remarks-section" style={{ margin: '1rem 0' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--primary-color)' }}>
                                Remarks:
                            </label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Enter any remarks for this bill..."
                                style={{
                                    width: '100%',
                                    minHeight: '60px',
                                    padding: '10px',
                                    borderRadius: '15px',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--glass-bg)',
                                    resize: 'vertical',
                                    fontSize: '1rem',
                                    color: 'var(--text-color)'
                                }}
                            />
                        </div>
                        <div className="payment-methods"
                             style={{
                                 marginTop: '1rem',
                                 display: 'flex',
                                 flexDirection: 'column',
                                 gap: '10px',
                                 alignItems: 'center'
                             }}>

                            <h5 style={{ marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
                                Payment Method:
                            </h5>

                            {/* center the radio buttons */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '8px',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                justifyContent: 'center'   // ✅ centers them horizontally
                            }}>
                                {[
                                    { type: 'CASH', color: '#00aaff', icon: '💵', key: 'cash' },
                                    { type: 'CARD', color: '#0077cc', icon: '💳', key: 'card' },
                                    { type: 'UPI', color: '#3399ff', icon: '📱', key: 'upi' }
                                ].map(method => {
                                    const enabled = availableMethods?.[method.key];
                                    return (
                                        <label
                                            key={method.type}
                                            title={!enabled ? 'Contact support to enable this payment method' : ''}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                size: '2rem',
                                                width: '100px',
                                                padding: '0.45rem 0.75rem',
                                                borderRadius: '20px',
                                                border: `1px solid ${
                                                    enabled
                                                        ? paymentMethod === method.type
                                                            ? 'var(--primary-color)'
                                                            : 'var(--border-color)'
                                                        : '#ccc'
                                                }`,
                                                background: enabled
                                                    ? paymentMethod === method.type
                                                        ? 'var(--primary-color-light)'
                                                        : 'transparent'
                                                    : '#f5f5f5',
                                                cursor: enabled ? 'pointer' : 'not-allowed',
                                                transition: 'all 0.15s ease',
                                                fontWeight: '600',
                                                color: enabled ? 'var(--text-color)' : '#888',
                                                fontSize: '0.95rem',
                                                opacity: enabled ? 1 : 0.6
                                            }}
                                        >
          <span
              style={{
              }}
          >
            {method.icon}
          </span>
                                            <input
                                                type="radio"
                                                value={method.type}
                                                checked={paymentMethod === method.type}
                                                onChange={e => enabled && setPaymentMethod(e.target.value)}
                                                disabled={!enabled}
                                                style={{ accentColor: 'var(--primary-color)' }}
                                            />
                                            <span style={{ marginLeft: '4px' }}>{method.type}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>


                    </div>

                    <button
                        className="btn process-payment-btn"
                        onClick={() => {
                            if (paymentMethod === "CARD") {
                                HandleCardProcessPayment();
                            } else {
                                HandleProcessPayment();
                            }
                        }}
                        disabled={loading}
                        style={{ position: "relative", borderRadius: "10px", padding: "0.75rem 2rem", width: "80%" }}
                    >
                        Process Payment
                    </button>

                    <button
                        className="btn"
                        onClick={handlePreview}
                        style={{
                            backgroundColor: "var(--primary-color-light)",
                            color: "var(--text-color)",
                            marginTop: "18px",
                            marginLeft: "10px",
                            border: "1px solid var(--primary-color)",
                            borderRadius: "10px"
                        }}
                    >
                        Preview
                    </button>
                </div>



                <div>
                    {/* Preview Modal */}
                    <Modal title="Order Summary" show={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)}>
                        <div className="order-summary" style={{ padding: '10px' }}>
                            <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                                <h3 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>Customer Details</h3>
                                <p><strong>Name:</strong> {selectedCustomer?.name}</p>
                                <p><strong>Phone:</strong> {selectedCustomer?.phone}</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>Order Items</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Item</th>
                                        <th style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Qty</th>
                                        <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Price</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {cart.map(item => (
                                        <tr key={item.id}>
                                            <td style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{item.name}</td>
                                            <td style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
                                                ₹{((item.sellingPrice || item.price) * item.quantity).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Total without GST:</span>
                                    <strong>₹{total.toLocaleString()}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>GST:</span>
                                    <strong>₹{tax.toLocaleString()}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>Discount:</span>
                                    <strong>{discountPercentage}%</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.2em', color: 'var(--primary-color)' }}>
                                    <strong>Final Total:</strong>
                                    <strong>₹{sellingSubtotal.toLocaleString()}</strong>
                                </div>
                                <div style={{ marginTop: '15px' }}>
                                    <strong>Payment Method:</strong> {paymentMethod}
                                </div>
                                {remarks && (
                                    <div style={{ marginTop: '15px' }}>
                                        <strong>Remarks:</strong>
                                        <p style={{ marginTop: '5px', padding: '10px', background: 'var(--glass-bg)', borderRadius: '8px' }}>
                                            {remarks}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            className="btn process-payment-btn"
                            onClick={() => {
                                if (paymentMethod === "CARD") {
                                    HandleCardProcessPayment();
                                } else {
                                    HandleProcessPayment();
                                }
                            }}
                            disabled={loading}
                            style={{ position: "relative", padding: "0.75rem 2rem" }}
                        >
                            Process Payment
                        </button>

                    </Modal>

                    {loading && (
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
            <Modal title="Select Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px', marginBottom: '15px' }}
                />
                <ul className="customer-modal-list">
                    {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                        <li key={c.id} onClick={() => { setSelectedCustomer(c); setIsModalOpen(false); setSearchTerm(''); }}>
                            <span>{c.name}</span>
                            <span style={{ color: '#555', fontSize: '0.9em' }}>{c.phone}</span>
                        </li>
                    )) : (
                        <li>No customers found.</li>
                    )}
                </ul>
            </Modal>
            <Modal title="Add New Customer" show={isNewCusModalOpen} onClose={() => setIsNewCusModalOpen(false)}>
                <form onSubmit={handleAddCustomer}>
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
                        <button type="submit" className="btn">Add & Select Customer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};


export default BillingPage;
