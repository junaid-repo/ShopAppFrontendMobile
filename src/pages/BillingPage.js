import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBilling } from '../context/BillingContext';
import Modal from '../components/Modal';
// UPDATED: Added new icons for payment methods
import { FaPlus, FaTrash, FaSearch, FaPaperPlane, FaPrint, FaMoneyBill, FaCreditCard, FaMobileAlt } from 'react-icons/fa';
import '../index.css'; // Ensure your styles are imported
import './BillingPage.css'; // Add specific mobile styles if needed
import { useConfig } from "./ConfigProvider";
import { getIndianStates } from "../utils/statesUtil"; // Added
import toast, { Toaster } from 'react-hot-toast'; // Added

// Debounce Hook (from desktop)
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

const BillingPage = () => {
    // --- Context and Config ---
    const {
        selectedCustomer, setSelectedCustomer,
        cart, addProduct, removeProduct,
        paymentMethod, setPaymentMethod,
        clearBill, products, loadProducts, // products from context are search results now
        updateCartItem,
        payingAmount, // Added from desktop context
        setPayingAmount, // Added from desktop context
        isPayingAmountManuallySet, // Added from desktop context
        setIsPayingAmountManuallySet // Added from desktop context
    } = useBilling();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";

    // --- Component State (Merged from Mobile & Desktop) ---
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false); // Customer Select Modal
    const [isNewCusModalOpen, setIsNewCusModalOpen] = useState(false); // New Customer Modal
    const [showPopup, setShowPopup] = useState(false); // Success Popup
    const [orderRef, setOrderRef] = useState('');
    const [paidAmount, setPaidAmount] = useState(0); // For success popup
    const [loading, setLoading] = useState(false); // General loading state
    const [availableMethods, setAvailableMethods] = useState([]);

    // --- State for New Customer Modal ---
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [gstNumber, setGstNumber] = useState("");
    const [customerState, setCustomerState] = useState("");
    const [shopState, setShopState] = useState(""); // Needed for GST calc & default state
    const statesList = getIndianStates();

    // --- State for Product Search ---
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(productSearchTerm, 300);
    const [isSearchFocused, setIsSearchFocused] = useState(false); // To show/hide dropdown
    const searchContainerRef = useRef(null); // To detect clicks outside search

    // --- State for Customer Search Modal ---
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const debouncedCustomerSearchTerm = useDebounce(customerSearchTerm, 500);
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [isCustomerLoading, setIsCustomerLoading] = useState(false);

    // --- State for Success Popup Actions ---
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // --- State for Settings (Partial Billing / Remarks) ---
    const [showPartialBilling, setShowPartialBilling] = useState(false);
    const [showRemarks, setShowRemarks] = useState(false);

    // --- Refs ---
    const productSearchInputRef = useRef(null); // For focus management (optional on mobile)

    // --- Calculations (from Desktop) ---
    const actualSubtotal = cart.reduce((total, item) => total + (item.listPrice || item.price) * item.quantity, 0);
    const sellingSubtotal = cart.reduce((total, item) => total + (item.sellingPrice * item.quantity), 0);
    const tax = cart.reduce((total, item) => {
        const taxRate = item.tax / 100;
        const basePrice = item.sellingPrice / (1 + taxRate);
        const itemTaxAmount = (item.sellingPrice - basePrice) * item.quantity;
        return total + itemTaxAmount;
    }, 0);
    const total = sellingSubtotal - tax; // Total before tax
    const discountPercentage = actualSubtotal > 0 ? (((actualSubtotal - sellingSubtotal) / actualSubtotal) * 100).toFixed(2) : 0;
    const remainingAmount = sellingSubtotal - payingAmount;
    const totalUnits = cart.reduce((total, item) => total + item.quantity, 0);

    // Grouped Taxes (from Desktop)
    const groupedTaxes = useMemo(() => {
        if (!selectedCustomer || !shopState || cart.length === 0) return {};
        const taxSummary = {};
        cart.forEach(item => {
            const taxRate = item.tax / 100;
            const basePrice = item.sellingPrice / (1 + taxRate);
            const totalTaxAmount = (item.sellingPrice - basePrice) * item.quantity;
            if (selectedCustomer.state === shopState) {
                const halfTax = totalTaxAmount / 2;
                const halfPercent = item.tax / 2;
                const cgstKey = `CGST @${halfPercent}%`;
                const sgstKey = `SGST @${halfPercent}%`;
                taxSummary[cgstKey] = (taxSummary[cgstKey] || 0) + halfTax;
                taxSummary[sgstKey] = (taxSummary[sgstKey] || 0) + halfTax;
            } else {
                const igstKey = `IGST @${item.tax}%`;
                taxSummary[igstKey] = (taxSummary[igstKey] || 0) + totalTaxAmount;
            }
        });
        return taxSummary;
    }, [cart, selectedCustomer, shopState]);

    // --- Effects ---

    // Load Settings on Mount
    useEffect(() => {
        const partialBillingSetting = localStorage.getItem('doParitalBilling') === 'true';
        const remarksSetting = localStorage.getItem('showRemarksOptions') === 'true';
        setShowPartialBilling(partialBillingSetting);
        setShowRemarks(remarksSetting);
    }, []);

    // Sync payingAmount with sellingSubtotal
    useEffect(() => {
        if (!isPayingAmountManuallySet) {
            setPayingAmount(sellingSubtotal);
        }
    }, [sellingSubtotal, isPayingAmountManuallySet, setPayingAmount]);

    // Fetch available payment methods
    useEffect(() => {
        if (!apiUrl) return;
        fetch(`${apiUrl}/api/shop/availablePaymentMethod`, {
            method: "GET", credentials: "include", headers: { "Content-Type": "application/json" }
        })
            .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch methods'))
            .then(data => setAvailableMethods(data))
            .catch(err => console.error("Error fetching payment methods:", err));
    }, [apiUrl]);

    // Fetch shop details for tax calculation & default state
    useEffect(() => {
        if (!apiUrl) return;
        const fetchShopDetails = async () => {
            try {
                const detailsRes = await fetch(`${apiUrl}/api/shop/user/get/userprofile/null`, {
                    method: "GET", credentials: 'include', headers: { Accept: "application/json" },
                });
                if (detailsRes.ok) {
                    const data = await detailsRes.json();
                    setShopState(data?.shopState || '');
                    if (!customerState) {
                        setCustomerState(data?.shopState || '');
                    }
                }
            } catch (err) {
                console.error("Error fetching shop details:", err);
            }
        };
        fetchShopDetails();
    }, [apiUrl, customerState]);

    // Sanity Check API Call
    useEffect(() => {
        if (!apiUrl) return;
        const runSanityCheck = async () => {
            try {
                const response = await fetch(`${apiUrl}/api/shop/gstBilling/sanityCheck`, {
                    method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                });
                if (!response.ok) return;
                const data = await response.json();
                if (data && data.success === false) {
                    alert(data.message + " Please complete your profile in Settings.");
                }
            } catch (error) {
                console.error("Sanity check API failed:", error);
            }
        };
        runSanityCheck();
    }, [apiUrl]);

    // --- Product Search API Call (from Desktop) ---
    const fetchProductsFromAPI = useCallback((q = '') => {
        if (!apiUrl) return;
        if (!q) {
            loadProducts([]); // Clear results if search is empty
            return;
        }
        const params = new URLSearchParams({ q, limit: 5 }); // Limit results for dropdown
        fetch(`${apiUrl}/api/shop/get/forGSTBilling/withCache/productsList?${params.toString()}`, {
            method: "GET", credentials: 'include', headers: { "Content-Type": "application/json" }
        })
            .then(res => res.json())
            .then(data => {
                const items = data?.data || (Array.isArray(data) ? data : []);
                loadProducts(items); // Load search results into context state
            })
            .catch(err => console.error("Error fetching products:", err));
    }, [apiUrl, loadProducts]);

    // Effect to trigger search when debounced term changes
    useEffect(() => {
        fetchProductsFromAPI(debouncedSearchTerm);
    }, [debouncedSearchTerm, fetchProductsFromAPI]);

    // Close product search dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchContainerRef]);

    // --- Customer Search API Call (for Modal - from Desktop) ---
    const fetchCustomersForModal = useCallback(async (term = '') => {
        if (!apiUrl) return;
        setIsCustomerLoading(true);
        try {
            const url = new URL(`${apiUrl}/api/shop/get/cacheable/customersList`);
            if (term) {
                url.searchParams.append('search', term);
                url.searchParams.append('page', 1);
            } else {
                url.searchParams.append('limit', 15); // Fetch initial list without search
                url.searchParams.append('page', 1);
            }
            const response = await fetch(url, { method: "GET", credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            setCustomerSearchResults(result.data || []);
        } catch (error) {
            console.error("Error fetching customers for modal:", error);
            setCustomerSearchResults([]);
        } finally {
            setIsCustomerLoading(false);
        }
    }, [apiUrl]);

    const handleDiscountChange = (itemId, percentage) => {
        const item = cart.find(i => i.id === itemId);
        if (!item) return;

        if (percentage === '') {
            updateCartItem(itemId, { discountPercentage: '', sellingPrice: item.listPrice });
            return;
        }
        const discount = parseFloat(percentage);

        if (isNaN(discount) || discount < 0 || discount > 100) {
            updateCartItem(itemId, { discountPercentage: percentage }); // Update only the percentage string
            return;
        }
        const newSellingPrice = item.listPrice * (1 - discount / 100);
        updateCartItem(itemId, { discountPercentage: discount, sellingPrice: newSellingPrice });
    };

    // Fetch customers when modal opens or search term inside modal changes
    useEffect(() => {
        if (isModalOpen) {
            fetchCustomersForModal(debouncedCustomerSearchTerm);
        }
    }, [isModalOpen, debouncedCustomerSearchTerm, fetchCustomersForModal]);


    // --- Handlers ---

    // Add Product
    const handleAddProduct = (p) => {
        addProduct({
            ...p,
            listPrice: p.price, // Store original price
            sellingPrice: p.price, // Initial selling price is the list price
            costPrice: p.costPrice,
            discountPercentage: 0 // Initialize discount
        });
        setProductSearchTerm('');
        productSearchInputRef.current?.focus();
        setIsSearchFocused(true);
    };

    // Add New Customer
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        const payload = { name, email, phone, city, customerState, gstNumber };
        try {
            const response = await fetch(`${apiUrl}/api/shop/create/forBilling/customer`, {
                method: "POST", credentials: 'include', headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
            }
            const newCustomer = await response.json();
            setSelectedCustomer(newCustomer);
            toast.success("Customer added and selected!");
            setName(""); setEmail(""); setPhone(""); setCity(""); setGstNumber(""); setCustomerState(shopState);
            setIsNewCusModalOpen(false);
        } catch (error) {
            console.error("Error adding customer:", error);
            toast.error(`Failed to add customer: ${error.message}`);
        }
    };

    // New Bill
    const handleNewBilling = () => {
        clearBill();
        setProductSearchTerm("");
        setRemarks("");
        setCustomerSearchTerm("");
        setIsPayingAmountManuallySet(false);
    };

    // Preview Bill
    const handlePreview = () => {
        if (!selectedCustomer || cart.length === 0) {
            toast.error('Please select customer and add products.');
            return;
        }
        setIsPreviewModalOpen(true);
    };

    // --- Payment Processing ---
    const processPayment = async (paymentProviderPayload = {}) => {
        if (!selectedCustomer || cart.length === 0) {
            toast.error('Please select customer and add products.');
            return;
        }
        setLoading(true);

        const cartForBackend = cart.map(item => ({
            ...item,
            discountPercentage: item.listPrice > 0 ? (((item.listPrice - item.sellingPrice) / item.listPrice) * 100) : 0,
        }));

        const payload = {
            selectedCustomer,
            cart: cartForBackend,
            sellingSubtotal,
            discountPercentage,
            tax,
            paymentMethod,
            remarks,
            payingAmount: payingAmount,
            remainingAmount: remainingAmount,
            ...paymentProviderPayload
        };

        const isCardPayment = paymentMethod === 'CARD';
        const endpoint = isCardPayment ? '/api/razorpay/verify-payment' : '/api/shop/do/billing';
        const body = isCardPayment ? JSON.stringify({ billingDetails: payload, ...paymentProviderPayload }) : JSON.stringify(payload);

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: "POST", credentials: 'include', headers: { "Content-Type": "application/json" }, body,
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || `Billing failed with status ${res.status}`);
            }

            const data = await res.json();
            const newInvoiceNumber = data.invoiceNumber || 'N/A';
            setOrderRef(newInvoiceNumber);
            setPaidAmount(data.paidAmount ?? data.totalAmount ?? sellingSubtotal);
            setShowPopup(true);
            handleNewBilling();

        } catch (err) {
            console.error("Billing failed:", err);
            toast.error(`Billing failed: ${err.message}`);
        } finally {
            setLoading(false);
            setIsPreviewModalOpen(false);
        }
    };

    // Razorpay specific handler
    const HandleCardProcessPayment = async () => {
        setLoading(true);
        const amountToPay = showPartialBilling && isPayingAmountManuallySet ? payingAmount : sellingSubtotal;

        if (amountToPay <= 0) {
            toast.error("Payment amount must be greater than zero.");
            setLoading(false);
            return;
        }

        try {
            const orderResponse = await fetch(`${apiUrl}/api/razorpay/create-order`, {
                method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: Math.round(amountToPay * 100), currency: "INR" }), // Amount in paise
            });

            if (!orderResponse.ok) {
                const errorText = await orderResponse.text();
                throw new Error(errorText || "Could not create Razorpay order.");
            }
            const orderData = await orderResponse.json();

            const options = {
                key: "rzp_test_RM94Bh3gUaJSjZ", // Replace with your actual key
                order_id: orderData.id,
                name: "Clear Bill",
                description: "Billing Transaction",
                handler: (response) => {
                    processPayment({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                    });
                },
                prefill: {
                    name: selectedCustomer?.name || "",
                    email: selectedCustomer?.email || "",
                    contact: selectedCustomer?.phone || "",
                },
                theme: { color: "#3399cc" },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", (response) => {
                toast.error(`Payment Failed: ${response.error.description}`);
                setLoading(false);
            });
            rzp.open();

        } catch (error) {
            console.error("Razorpay order creation failed:", error);
            toast.error(`Error initiating payment: ${error.message}`);
            setLoading(false);
        }
    };

    // Unified handler called by the button
    const handleProcessPayment = () => {
        if (!selectedCustomer || cart.length === 0) {
            toast.error('Please select customer and add products.');
            return;
        }
        if (showPartialBilling && isPayingAmountManuallySet) {
            if (payingAmount <= 0) {
                toast.error("Paying amount must be greater than zero.");
                return;
            }
            if (payingAmount > sellingSubtotal) {
                toast.error("Paying amount cannot exceed the final total.");
                return;
            }
        }

        if (paymentMethod === "CARD") {
            HandleCardProcessPayment();
        } else {
            processPayment();
        }
    };


    // --- Print and Email Handlers ---
    const handlePrintInvoice = async (invoiceNumber) => {
        if (!invoiceNumber) { toast.error("Invoice number missing."); return; }
        setShowPopup(false);
        setIsPrinting(true);
        try {
            const response = await fetch(`${apiUrl}/api/shop/get/invoice/${invoiceNumber}`, {
                method: 'GET', credentials: 'include',
            });
            if (!response.ok) throw new Error(`Failed to fetch invoice: ${response.statusText}`);
            const blob = await response.blob();
            const pdfUrl = URL.createObjectURL(blob);
            window.open(pdfUrl, '_blank');
        } catch (error) {
            console.error("Error printing invoice:", error);
            toast.error("Could not retrieve invoice for printing.");
        } finally {
            setIsPrinting(false);
        }
    };

    const handleSendEmail = async (invoiceNumber) => {
        if (!invoiceNumber) { toast.error("Invoice number missing."); return; }
        setShowPopup(false);
        setIsSendingEmail(true);
        try {
            const response = await fetch(`${apiUrl}/api/shop/send-invoice-email/${invoiceNumber}`, {
                method: 'POST', credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || `Failed to send: ${response.statusText}`);
            }
            toast.success("Invoice sent via email!");
        } catch (error) {
            console.error("Error sending invoice email:", error);
            toast.error(`Could not send invoice: ${error.message}`);
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="billing-page">
            <Toaster position="top-center" />
            <h2>Billing</h2>

            {/* --- Main Layout (Mobile Adaptable) --- */}
            <div className="billing-layout-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* --- Current Bill Section --- */}
                <div className="current-bill-section">
                    <div className="glass-card" style={{ padding: '1rem' }}>

                        {/* --- REQUEST 4: Customer Actions (Updated) --- */}
                        <div className="current-bill-header">
                            <h3>Current Bill</h3>
                            <div className="current-bill-actions">
                                <div className="customer-action-buttons-left">
                                    <button className="btn" onClick={() => setIsModalOpen(true)}>
                                        {selectedCustomer ? `Change` : 'Select Customer'}
                                    </button>
                                    <button className="btn" onClick={() => setIsNewCusModalOpen(true)}>
                                        <FaPlus /> Create
                                    </button>
                                </div>
                                {cart.length > 0 && (
                                    <button className="btn btn-danger" onClick={handleNewBilling}>
                                        New Bill
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* --- End of REQUEST 4 --- */}


                        {/* Customer Display */}
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '1rem', gap: '10px' }}>
                            <span style={{ fontWeight: '600' }}>Customer:</span>
                            <div className="customer-display-box" style={{ borderStyle: selectedCustomer ? 'solid' : 'dashed', borderColor: selectedCustomer ? 'green' : '#ff6b6b' }}>
                                {selectedCustomer ? (
                                    <>
                                        <strong>{selectedCustomer.name}</strong>
                                        <small>{selectedCustomer.phone}</small>
                                    </>
                                ) : (
                                    <span style={{ color: '#888' }}>Select Customer</span>
                                )}
                            </div>
                        </div>

                        {/* Product Search */}
                        <div className="product-search-container" ref={searchContainerRef} style={{ marginTop: '1rem', position: 'relative' }}>
                            <div className="search-input-wrapper">
                                <FaSearch />
                                <input
                                    type="text"
                                    ref={productSearchInputRef}
                                    placeholder="Search products to add..."
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    className="search-input"
                                />
                            </div>
                            {/* Search Results Dropdown */}
                            {isSearchFocused && debouncedSearchTerm && (
                                <div className="search-results-mobile">
                                    {products.length > 0 ? products.map((p) => (
                                        <div
                                            key={p.id}
                                            className="search-result-item-mobile"
                                            onClick={() => handleAddProduct(p)}
                                        >
                                            <strong>{p.name}</strong>
                                            <small>₹{p.price} | Stock: {p.stock}</small>
                                        </div>
                                    )) : <div className="search-no-results">No products found.</div>}
                                </div>
                            )}
                        </div>

                        {/* Cart Items */}
                        <div className="cart-items" style={{ marginTop: '1rem' }}>
                            {cart.length === 0 ? (
                                <p className="cart-empty-message">Cart is empty.</p>
                            ) : (
                                <div className="cart-table-wrapper-mobile">
                                    <table className="beautiful-table cart-table-mobile">
                                        <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Qty</th>
                                            <th>Dis%</th>
                                            <th>Selling</th>
                                            <th>Details</th>
                                            <th>Act</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {cart.map(item => {
                                            const totalSellingPrice = item.sellingPrice * item.quantity;
                                            return (
                                                <tr key={item.id}>
                                                    <td>{item.name}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={item.stock} // Prevent exceeding stock
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                let q = Number(e.target.value) || 1;
                                                                q = Math.max(1, Math.min(q, item.stock)); // Ensure valid range
                                                                updateCartItem(item.id, { quantity: q });
                                                            }}
                                                            className="qty-input-mobile"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text" // Use text to allow empty/percentage
                                                            value={item.discountPercentage !== undefined ? item.discountPercentage : ''} // Display value from state
                                                            onChange={(e) => handleDiscountChange(item.id, e.target.value)} // Call handler
                                                            placeholder="0" // Placeholder
                                                            className="discount-input-mobile" // Apply CSS class
                                                        />
                                                    </td>
                                                    <td>{totalSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>

                                                    <td>
                                                        <textarea
                                                            value={item.details || ''}
                                                            onChange={(e) => updateCartItem(item.id, { details: e.target.value })}
                                                            placeholder="Notes..."
                                                            className="details-textarea-mobile"
                                                            rows={1} // Start small
                                                        />
                                                    </td>
                                                    <td>
                                                        <button className="remove-btn-mobile" onClick={() => removeProduct(item.id)}>
                                                            <FaTrash size={14}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Summary Section --- */}
                <div className="summary-section">
                    {/* The outer glass-card is still here from your original code */}
                    <div className="glass-card" style={{ padding: '0.5rem', height: 'fit-content' }}>
                        <h3 style={{ textAlign: 'center', marginTop: '0.5rem', marginBottom: '1rem' }}>Summary</h3>

                        {/* --- REQUEST 2: Summary Box 1 --- */}
                        <div className="summary-box">
                            <div className="invoice-summary">
                                <p>Total Units: <span>{totalUnits}</span></p>
                                <p>Total w/o GST: <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                                <p className="tax">GST: <span>₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                                {/* GST Breakdown */}
                                <div className="tax-breakdown-mobile">
                                    {Object.entries(groupedTaxes).map(([key, value]) => (
                                        <p key={key}>{key}: <span>₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                                    ))}
                                </div>
                                <p className="discount">Discount: <span>{discountPercentage}%</span></p>
                                <h4 className="subtotal-selling">Final Total: <span>₹{sellingSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></h4>

                                {/* Partial Billing */}
                                {showPartialBilling && (
                                    <>
                                        <div className="payment-input-group-mobile">
                                            <label>Paying:</label>
                                            <input
                                                type="number"
                                                value={payingAmount}
                                                onChange={(e) => {
                                                    setPayingAmount(parseFloat(e.target.value) || 0);
                                                    setIsPayingAmountManuallySet(true);
                                                }}
                                                className="paying-amount-input-mobile"
                                            />
                                        </div>
                                        <h5 className="remaining-total-mobile">
                                            Due: <span>₹{remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </h5>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* --- REQUEST 3: Summary Box 2 --- */}
                        <div className="summary-box">
                            {/* Remarks */}
                            {showRemarks && (
                                <div className="remarks-section-mobile">
                                    <label>Remarks:</label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Add remarks..."
                                        className="remarks-textarea-mobile"
                                    />
                                </div>
                            )}

                            {/* --- REQUEST 5: Vertical Payment Methods --- */}
                            <div className="payment-methods-mobile">
                                <h5>Payment Method:</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {[
                                        { type: 'CASH', icon: 'fa-duotone fa-money-bills', key: 'cash' },
                                        { type: 'CARD', icon: 'fa-duotone fa-solid fa-credit-card', key: 'card' },
                                        { type: 'UPI', icon: 'fa-duotone fa-solid  fa-qrcode', key: 'upi' }
                                    ].map(method => {
                                        const enabled = availableMethods?.[method.key];

                                        return (
                                            <label
                                                key={method.type}
                                                title={!enabled ? 'Contact support to enable this payment method' : ''}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-start',
                                                    gap: '10px',
                                                    width: '370px',
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
                                                <i
                                                    className={`fa-fw ${method.icon}`}
                                                    style={{
                                                        fontSize: '1.2rem',
                                                        color: enabled
                                                            ? paymentMethod === method.type
                                                                ? 'var(--primary-color)'
                                                                : 'var(--text-color)'
                                                            : '#888',
                                                    }}
                                                />

                                                <input
                                                    type="radio"
                                                    value={method.type}
                                                    checked={paymentMethod === method.type}
                                                    onChange={e => enabled && setPaymentMethod(e.target.value)}
                                                    disabled={!enabled}
                                                    style={{ accentColor: 'var(--primary-color)' }}
                                                />
                                                <span>{method.type}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            {/* Select Customer Modal */}
            <Modal title="Select Customer" show={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <input
                    type="text"
                    placeholder="Search name or phone..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '20px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                />
                <ul className="customer-modal-list">
                    {isCustomerLoading ? (
                        <li>Loading...</li>
                    ) : customerSearchResults.length > 0 ? (
                        customerSearchResults.map(c => (
                            <li key={c.id} onClick={() => { setSelectedCustomer(c); setIsModalOpen(false); setCustomerSearchTerm(''); }}>
                                <span>{c.name}</span>
                                <small>{c.phone}</small>
                            </li>
                        ))
                    ) : (
                        <li>No customers found.</li>
                    )}
                </ul>
            </Modal>

            {/* Add New Customer Modal */}
            <Modal title="Add New Customer" show={isNewCusModalOpen} onClose={() => setIsNewCusModalOpen(false)}>
                <form onSubmit={handleAddCustomer}>
                    <div className="form-group"><label>Name*</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div className="form-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                    <div className="form-group"><label>Phone*</label><input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} maxLength="10" pattern="[5-9][0-9]{9}" title="10 digit mobile number"/></div>
                    <div className="form-group"><label>GST No</label><input type="text" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} /></div>
                    <div className="form-group"><label>State</label>
                        <select value={customerState} onChange={(e) => setCustomerState(e.target.value)}>
                            <option value="">Select State</option>
                            {statesList.map((state, i) => (<option key={i} value={state}>{state}</option>))}
                        </select>
                    </div>
                    <div className="form-group"><label>City</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} /></div>
                    <div className="form-actions"><button type="submit" className="btn">Add & Select</button></div>
                </form>
            </Modal>

            {/* Preview Modal */}
            <Modal title="Order Summary" show={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)}>
                <div className="order-summary-mobile">
                    {selectedCustomer && (
                        <div className="summary-section-mobile">
                            <h3>Customer</h3>
                            <p><strong>Name:</strong> {selectedCustomer.name}</p>
                            <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                        </div>
                    )}
                    <div className="summary-section-mobile">
                        <h3>Items</h3>
                        {cart.map(item => (
                            <p key={item.id}>{item.name} x {item.quantity} = <strong>₹{(item.sellingPrice * item.quantity).toLocaleString()}</strong></p>
                        ))}
                    </div>
                    <div className="summary-section-mobile totals-mobile">
                        <p>Total w/o GST: <span>₹{total.toLocaleString()}</span></p>
                        <p>GST: <span>₹{tax.toLocaleString()}</span></p>
                        <p>Discount: <span>{discountPercentage}%</span></p>
                        <h4>Final Total: <span>₹{sellingSubtotal.toLocaleString()}</span></h4>
                        {showPartialBilling && (
                            <>
                                <p>Paying: <span>₹{payingAmount.toLocaleString()}</span></p>
                                <h4>Remaining: <span>₹{remainingAmount.toLocaleString()}</span></h4>
                            </>
                        )}
                        <p>Method: <strong>{paymentMethod}</strong></p>
                        {remarks && <p>Remarks: <small>{remarks}</small></p>}
                    </div>
                </div>
                <button
                    className="btn process-payment-btn"
                    onClick={handleProcessPayment} // Reuse the main handler
                    disabled={loading}
                    style={{ marginTop: '1rem', width: '100%' }}
                >
                    {loading ? 'Processing...' : 'Confirm & Process Payment'}
                </button>
            </Modal>

            {/* Loading Overlay */}
            {loading && (
                <div className="loading-overlay-mobile">
                    <div className="loading-content-mobile">
                        <h2>Processing Payment...</h2>
                        <div className="spinner-mobile"></div>
                        <p>Please wait...</p>
                    </div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .spinner-mobile { animation: spin 1s linear infinite; }`}</style>
                </div>
            )}

            {/* Success Popup (using Modal) */}
            <Modal
                title="✅ Payment Successful"
                show={showPopup}
                onClose={() => setShowPopup(false)}
            >
                <div style={{ textAlign: 'center' }}>
                    <p>Order Ref: <strong>{orderRef}</strong></p>
                    <p>Amount Paid: <strong>₹{paidAmount.toLocaleString()}</strong></p>
                    {remainingAmount > 0.01 && ( // Show remaining only if it's significant
                        <p style={{ color: '#d9534f' }}>
                            Amount Remaining: <strong>₹{remainingAmount.toLocaleString()}</strong>
                        </p>
                    )}
                    <div className="success-actions-mobile">
                        <button className="btn btn-outline" onClick={() => setShowPopup(false)}>Close</button>
                        <button className="btn btn-icon" onClick={() => handleSendEmail(orderRef)} disabled={isSendingEmail}>
                            <FaPaperPlane /> {isSendingEmail ? 'Sending...' : 'Email'}
                        </button>
                        <button className="btn btn-icon" onClick={() => handlePrintInvoice(orderRef)} disabled={isPrinting}>
                            <FaPrint /> {isPrinting ? 'Loading...' : 'Print'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- REQUEST 1: STICKY FOOTER ACTIONS --- */}
            <div className="sticky-footer-actions">
                <button
                    className="btn btn-outline"
                    onClick={handlePreview}
                    disabled={cart.length === 0 || !selectedCustomer}
                >
                    Preview
                </button>
                <button
                    className="process-payment-btn"
                    onClick={handleProcessPayment}
                    disabled={loading || cart.length === 0 || !selectedCustomer}
                >
                    {loading ? 'Processing...' : 'Process Payment'}
                </button>
            </div>
            {/* --- End of REQUEST 1 --- */}

        </div>
    );
};

export default BillingPage;

