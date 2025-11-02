// src/pages/PaymentsPage.js
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useConfig } from "./ConfigProvider";
import { useNavigate } from 'react-router-dom';
import { useSearchKey } from "../context/SearchKeyContext";
import toast, { Toaster } from 'react-hot-toast';
import {
    MdClose,
    MdPayment,
    MdRefresh
} from 'react-icons/md';
import axios from 'axios';

// --- formatDate Helper ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (error) {
        return 'Invalid Date';
    }
};

const PaymentsPage = () => {
    // State for the *full* list fetched from API based on date range
    const [payments, setPayments] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isLoading, setIsLoading] = useState(false);

    const config = useConfig();
    const apiUrl = config?.API_URL || "";

    const { setSearchKey } = useSearchKey();
    const navigate = useNavigate();

    // --- Modal & Theme State ---
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentPaymentOrder, setCurrentPaymentOrder] = useState(null);
    const [payingAmount, setPayingAmount] = useState("");
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [themeColors, setThemeColors] = useState({ paid: '#006400', due: '#8b0000' });

    // --- Filter State ---
    const [searchTerm, setSearchTerm] = useState(() => {
        try {
            const s = localStorage.getItem("payments_filters");
            if (s) return JSON.parse(s).searchTerm || "";
        } catch (e) {}
        return "";
    });
    const [paymentMode, setPaymentMode] = useState(() => {
        try {
            const s = localStorage.getItem("payments_filters");
            if (s) return JSON.parse(s).paymentMode || "All";
        } catch (e) {}
        return "All";
    });

    const formatDateInput = (d) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const _savedFilters = (() => {
        try {
            const s = localStorage.getItem("payments_filters");
            if (!s) return null;
            return JSON.parse(s);
        } catch (e) {
            return null;
        }
    })();

    const [fromDate, setFromDate] = useState(() => {
        return (_savedFilters && _savedFilters.fromDate) || formatDateInput(defaultFrom);
    });
    const [toDate, setToDate] = useState(() => {
        return (_savedFilters && _savedFilters.toDate) || formatDateInput(defaultTo);
    });

    // --- Effect to get theme colors ---
    useEffect(() => {
        const currentTheme = localStorage.getItem("theme") || "light";
        if (currentTheme === "dark") {
            setThemeColors({ paid: '#90ee90', due: '#f08080' });
        } else {
            setThemeColors({ paid: '#006400', due: '#8b0000' });
        }
    }, []);

    // Effect to save filters
    useEffect(() => {
        try {
            const obj = { fromDate, toDate, paymentMode, searchTerm };
            localStorage.setItem("payments_filters", JSON.stringify(obj));
        } catch (e) {}
    }, [fromDate, toDate, paymentMode, searchTerm]);

    // --- *** REVERTED: Data Fetching (Matches Desktop) *** ---
    const fetchPayments = useCallback(async () => {
        if (!apiUrl) return;
        setIsLoading(true);
        const query = `?fromDate=${fromDate}&toDate=${toDate}`;
        try {
            const response = await fetch(`${apiUrl}/api/shop/get/paymentLists${query}`, { // Use desktop endpoint
                method: "GET",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setPayments(data || []); // Set the full list fetched based on dates
        } catch (error) {
            console.error("Error fetching paymentLists:", error);
            toast.error("Something went wrong while fetching paymentLists.");
            setPayments([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, fromDate, toDate]); // Dependencies are only date range

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]); // Trigger fetch when dates change

    // --- *** ADDED: Client-Side Filtering (from Desktop) *** ---
    const filteredPayments = useMemo(() => {
        // Helper functions to handle date comparison correctly
        const toDateObjStart = (dateStrOrObj) => {
            const d = new Date(dateStrOrObj);
            d.setHours(0, 0, 0, 0);
            return d;
        };
        const toDateObjEnd = (dateStrOrObj) => {
            const d = new Date(dateStrOrObj);
            d.setHours(23, 59, 59, 999);
            return d;
        };

        const from = toDateObjStart(fromDate); // Make sure these are date objects for comparison
        const to = toDateObjEnd(toDate);

        return payments.filter((p) => {
            const matchesSearch = p.saleId
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            const matchesMode = paymentMode === "All" || !paymentMode ? true : (p.method === paymentMode);

            // Date check (since API only filters by date range initially)
            const pDate = new Date(p.date);
            if (isNaN(pDate.getTime())) return false; // Exclude invalid dates
            const withinRange = pDate >= from && pDate <= to; // Check within range

            return matchesSearch && matchesMode && withinRange;
        });
    }, [payments, searchTerm, paymentMode, fromDate, toDate]); // Add fromDate, toDate


    // --- *** ADDED: Client-Side Totals Calculation (from Desktop) *** ---
    const { totalPaid, totalDue, dueInvoicesCount, modeCounts } = useMemo(() => {
        const counts = {};
        let totalP = 0;
        let totalD = 0;
        let countDue = 0;

        filteredPayments.forEach((p) => {
            // Use p.paid and p.due directly if they exist in the API response
            const paidAmt = Number(p.paid) || 0; // Use paid amount
            const dueAmt = Number(p.due) || 0;   // Use due amount

            totalP += paidAmt; // Sum of amounts paid in the period (could be multiple payments per invoice)
            totalD += dueAmt; // Sum of remaining dues for invoices within the period

            if (dueAmt > 0) {
                countDue++; // Count invoices that *still* have dues
            }
            const m = p.method || "Unknown";
            counts[m] = (counts[m] || 0) + 1; // Count payment *methods* used
        });

        return {
            totalPaid: totalP,
            totalDue: totalD,
            dueInvoicesCount: countDue,
            modeCounts: counts
        };
    }, [filteredPayments]); // Calculates based on the *filtered* list

    // --- *** ADDED: Client-Side Pagination (from Desktop) *** ---
    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentPayments = filteredPayments.slice(indexOfFirst, indexOfLast); // Paginate the *filtered* list

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, fromDate, toDate, paymentMode]);

    // --- Payment Modal Handlers ---
    const handleOpenPaymentModal = (payment) => {
        // Recalculate total amount for the modal based on THIS payment record
        const totalAmount = (Number(payment.paid) || 0) + (Number(payment.due) || 0);
        setCurrentPaymentOrder({
            id: payment.saleId,
            total: totalAmount,
            paid: Number(payment.paid) || 0 // Ensure it's a number
        });
        setPayingAmount("");
        setPaymentError("");
        setShowPaymentModal(true);
    };


    const handleConfirmUpdatePayment = async () => {
        if (!currentPaymentOrder) return;
        const amount =  payingAmount;
        const dueAmount = currentPaymentOrder.total - currentPaymentOrder.paid;

        if (isNaN(amount) || amount <= 0) {
            setPaymentError("Please enter a valid amount.");
            return;
        }
        if (amount > dueAmount + 0.01) {
            setPaymentError(`Payment cannot be more than the due amount of ₹${dueAmount.toLocaleString()}.`);
            return;
        }

        setIsUpdatingPayment(true);
        try {
            const payload = {
                invoiceId: currentPaymentOrder.id,
                amount: amount
            };
            // This API call remains the same
            await axios.post(`${apiUrl}/api/shop/payment/update`, payload, {
                withCredentials: true,
            });

            toast.success("Payment updated!");
            setShowPaymentModal(false);
            setCurrentPaymentOrder(null);
            fetchPayments(); // Refetch the full list after successful update
        } catch (error) {
            console.error("Error updating payment:", error);
            toast.error("Failed to update payment.");
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    // --- Navigation Handler ---
    const handleTakeAction = (orderNumber) => {
        setSearchKey(orderNumber);
        navigate(`/sales?searchKey=${encodeURIComponent(orderNumber)}`);
    };

    // --- Smart Pagination Helper ---
    const getPaginationItems = () => {
        const items = [];
        // Use client-side totalPages
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

    // Get unique modes from the *full* list fetched from API
    const uniqueModes = useMemo(() => {
        const set = new Set();
        payments.forEach((p) => {
            if (p.method) set.add(p.method);
        });
        return Array.from(set);
    }, [payments]); // Depends on the full `payments` list


    return (
        <div className="page-container">
            <Toaster position="top-center" />
            <h2>Payments</h2>

            {/* Stats Container - uses client-calculated totals */}
            <div className="payments-stats">
                {/* Filters Card */}
                <div className="stats-card dates-card">
                    <div className="card-title">Filters</div>
                    <div className="time-range-selector-horizontal" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                        <label>
                            From
                            <input className="date-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        </label>
                        <label>
                            To
                            <input className="date-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                        </label>
                        <label>
                            Mode
                            <select className="date-input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                                <option value="All">All</option>
                                {uniqueModes.map((m) => ( // Use uniqueModes derived from full list
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </label>
                        <button
                            onClick={fetchPayments}
                            disabled={isLoading}
                            title="Refresh Data"
                            className="btn-refresh"
                            style={{
                                padding: '8px',
                                height: '38px', // Added height to match inputs
                                width: '38px',  // Added width for a square button
                                cursor: 'pointer',
                                background: 'var(--primary-color-light)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isLoading ? 0.5 : 1,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <i className="fa-duotone fa-solid fa-rotate-right"></i>
                        </button>
                    </div>
                </div>

                {/* === Total card - THIS IS THE CHANGE (Goal 1) === */}
                <div className="stats-card total-card">
                    {/* Removed inline style from parent */}

                    {/* Added a new inner wrapper with the flex styles */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>

                        <div style={{ flex: '1' }}> {/* Child 1: Takes up 50% of the space */}
                            <div className="card-title">Total Payments</div>
                            <div className="total-amount" style={{ fontSize: "1.8rem", color: themeColors.paid }}>
                                ₹{totalPaid.toLocaleString()}
                            </div>
                        </div>

                        <div style={{ flex: '1', textAlign: 'right' }}> {/* Child 2: Takes up 50% of the space */}
                            <div className="card-title">Total Due</div>
                            <div className="total-amount" style={{ fontSize: "1.8rem", color: themeColors.due }}>
                                ₹{totalDue.toLocaleString()}
                            </div>
                            <div className="total-sub">{dueInvoicesCount} Due</div>
                        </div>

                    </div>
                </div>

                {/* Bars card - uses client-calculated modeCounts */}
                <div className="stats-card bars-card">
                    <div className="card-title">Payment Modes</div>
                    <div className="payments-bars">
                        {Object.keys(modeCounts).length === 0 ? (
                            <div className="no-data">No payments in selected range</div>
                        ) : (
                            (() => {// Helper function to map payment methods to Font Awesome 6 icons
                                const getPaymentIcon = (method) => {
                                    // Use .toUpperCase() for case-insensitive matching
                                    const upperMethod = String(method).toUpperCase();

                                    if (upperMethod.includes("CASH")) {
                                        return "fa-duotone fa-solid fa-money-bills";
                                    }
                                    if (upperMethod.includes("CARD")) {
                                        return "fa-duotone fa-solid fa-credit-card";
                                    }

                                    if (upperMethod.includes("UPI")) {
                                        return "fa-duotone fa-solid fa-qrcode";
                                    }
                                    if (upperMethod.includes("WALLET")) {
                                        return "fa-solid fa-wallet";
                                    }
                                    if (upperMethod.includes("ONLINE") || upperMethod.includes("NETBANKING")) {
                                        return "fa-solid fa-globe";
                                    }
                                    // Default icon for other/unknown types
                                    return "fa-solid fa-receipt";
                                };

                                const entries = Object.entries(modeCounts);
                                const max = Math.max(...entries.map(([, c]) => c), 1);
                                const colors = ["#4caf50", "#ffb300", "#2196f3", "#9c27b0", "#f44336", "#00bcd4"];

                                return entries.map(([method, count], idx) => (
                                    <div key={method} className="mode-row">
                                        <div className="mode-label">
                                            {/* This line adds the icon */}
                                            <i
                                                className={getPaymentIcon(method)}
                                                style={{ marginRight: '10px', minWidth: '20px', textAlign: 'center' }}
                                            ></i>
                                            {method}
                                        </div>
                                        <div className="mode-bar-wrapper">
                                            <div className="mode-bar-inner" style={{ width: `${Math.max((count / max) * 100, 6)}%`, background: colors[idx % colors.length] }} />
                                        </div>
                                        <div className="mode-count">{count}</div>
                                    </div>
                                ));})()
                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <input
                type="text"
                placeholder="Search by Invoice ID..."
                className="search-bar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '90%', marginTop: '25px', marginBottom: '-25px' }}
            />

            {/* Table - iterates over client-paginated `currentPayments` */}
            <div className="glass-card">
                <table className="data-table" style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                    <tr>
                        <th style={{ padding: "8px 4px" }}>Invoice ID</th>
                        <th style={{ padding: "8px 4px" }}>Date</th>
                        <th style={{ padding: "8px 4px" }}>Paid</th>
                        <th style={{ padding: "8px 4px" }}>Due</th>
                        <th style={{ padding: "8px 4px" }}>Status</th>
                        <th style={{ padding: "8px 4px" }}>Update</th>
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>Loading...</td></tr>
                    ) : currentPayments.length > 0 ? ( // Use currentPayments
                        currentPayments.map((payment) => ( // Use currentPayments
                            <tr key={payment.id}>
                                <td
                                    style={{ padding: "8px 4px", cursor: "pointer", color: "var(--primary-color)", fontWeight: "bold" }}

                                >
                                    {payment.saleId}
                                </td>
                                <td style={{ whiteSpace: "nowrap", padding: "8px 4px" }}>
                                    {formatDate(payment.date)}
                                </td>
                                <td style={{ padding: "8px 4px", color: themeColors.paid, fontWeight: 'bold' }}>
                                    {/* Ensure 'paid' exists and is a number */}
                                    ₹{(Number(payment.paid) || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: "8px 4px", color: themeColors.due, fontWeight: 'bold' }}>
                                    {/* Ensure 'due' exists and is a number */}
                                    ₹{(Number(payment.due) || 0).toLocaleString()}
                                </td>
                                <td style={{ padding: "8px 4px" }}>
                            <span className={payment.status === 'Paid' ? 'status-paid' : 'status-pending'}>
                              {payment.status}
                            </span>
                                </td>
                                <td style={{ padding: "8px 4px" }}>
                                    {payment.status !== 'Paid' && (
                                        <button
                                            className="download-btn"
                                            title="Update Payment"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenPaymentModal(payment);
                                            }}
                                        >
                                            <i className="fa-duotone fa-solid fa-credit-card" style={{color:'var(--text-color)', fontSize: '1.3rem'}}></i>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="6" style={{ textAlign: "center", padding: "8px 4px" }}>
                                No records found for the selected filters.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Pagination - uses client-calculated `totalPages` */}
            <div className="pagination button">
                <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Prev
                </button>
                {paginationItems.map((item, index) =>
                    typeof item === 'string' ? (
                        <span key={index} className="pagination-ellipsis">{item}</span>
                    ) : (
                        <button
                            key={index}
                            onClick={() => setCurrentPage(item)}
                            className={currentPage === item ? "active" : ""}
                        >
                            {item}
                        </button>
                    )
                )}
                <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Next
                </button>
            </div>

            {/* Payment Update Modal */}
            {showPaymentModal && currentPaymentOrder && (
                <div className="order-modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="order-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="order-modal-header">
                            <h2>Update Payment for #{currentPaymentOrder.id}</h2>
                            <button className="close-button" onClick={() => setShowPaymentModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <div className="payment-summary-box">
                                <div className="summary-row">
                                    <span>Total Amount:</span>
                                    <strong>₹{currentPaymentOrder.total.toLocaleString()}</strong>
                                </div>
                                <div className="summary-row">
                                    <span>Amount Paid:</span>
                                    <strong style={{color: 'green'}}>₹{currentPaymentOrder.paid.toLocaleString()}</strong>
                                </div>
                                <div className="summary-divider" />
                                <div className="summary-row" style={{fontSize: '1.2em', fontWeight: 'bold'}}>
                                    <span>Amount Due:</span>
                                    <strong style={{color: '#d32f2f'}}>₹{(currentPaymentOrder.total - currentPaymentOrder.paid).toLocaleString()}</strong>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '20px' }}>
                                <label>Enter Paying Amount:</label>
                                <input
                                    type="number"
                                    value={payingAmount}
                                    onChange={(e) => setPayingAmount(e.target.value)}
                                    placeholder="0.00"
                                    style={{
                                        textAlign: 'right',
                                        fontSize: '1.2rem',
                                        border: `1px solid ${paymentError ? '#d32f2f' : 'var(--border-color)'}`
                                    }}
                                />
                                {paymentError && (
                                    <span style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: '5px', display: 'block' }}>
                                  {paymentError}
                              </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button className="btn btn-outline" onClick={() => setShowPaymentModal(false)} disabled={isUpdatingPayment}>
                                    Cancel
                                </button>
                                <button className="btn" onClick={handleConfirmUpdatePayment} disabled={isUpdatingPayment}>
                                    {isUpdatingPayment ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentsPage;