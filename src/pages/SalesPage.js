import React, { useState, useEffect, useCallback } from 'react';
import { FaDownload, FaPaperPlane } from 'react-icons/fa'; // Added FaPaperPlane
import axios from 'axios';
import { useConfig } from "./ConfigProvider";
import { MdDownload } from "react-icons/md";
import './SalesPage.css';
import PremiumFeature from '../components/PremiumFeature';
import {
    MdPerson,
    MdEmail,
    MdPhone,
    MdShoppingCart,
    MdClose,
    MdCheckCircle,
    MdCancel,
    MdNotifications, // Added
    MdSend,          // Added
    MdPayment,       // Added
} from 'react-icons/md';
// --- NEW IMPORTS ---
import { useLocation } from 'react-router-dom';
import { useSearchKey } from "../context/SearchKeyContext";
import toast, { Toaster } from 'react-hot-toast';

// --- NEW: useDebounce Hook ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const SalesPage = () => {
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // --- NEW: State from Desktop ---
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [currentReminderInvoiceId, setCurrentReminderInvoiceId] = useState(null);
    const [reminderMessage, setReminderMessage] = useState("");
    const [sendViaEmail, setSendViaEmail] = useState(true);
    const [sendViaWhatsapp, setSendViaWhatsapp] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [currentPaymentOrder, setCurrentPaymentOrder] = useState(null);
    const [payingAmount, setPayingAmount] = useState("");
    const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const config = useConfig();
    const apiUrl = config?.API_URL || "";

    // --- NEW: Global Search Context ---
    const location = useLocation();
    const { searchKey, setSearchKey } = useSearchKey();

    // --- STYLES (Unchanged) ---
    // ... (boxStyle, boxHeaderStyle, etc. remain the same)

    // --- NEW: Robust fetchSales from Desktop (FIXES YOUR ISSUE) ---
    const fetchSales = useCallback(async (termToSearch, page = 1) => {
        const finalSearchTerm = termToSearch !== undefined ? termToSearch : searchTerm;

        try {
            const response = await axios.get(`${apiUrl}/api/shop/get/sales`, {
                params: {
                    page: page - 1,
                    size: pageSize,
                    search: finalSearchTerm || '',
                    sort: sortConfig.key,
                    dir: sortConfig.direction,
                },
                withCredentials: true,
            });

            setSales(Array.isArray(response.data.content) ? response.data.content : []);
            setTotalPages(response.data.totalPages || 0);
            setCurrentPage(page);

        } catch (error) {
            console.error("Error fetching sales:", error);
            toast.error("Something went wrong while fetching sales.");
            setSales([]);
            setTotalPages(0);
            setCurrentPage(1);
        }
    }, [apiUrl, pageSize, sortConfig.key, sortConfig.direction, searchTerm]); // Added searchTerm

    // --- NEW: Global Search Effects ---
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const key = params.get('searchKey');
        if (key) {
            setSearchTerm(key);
        }
    }, [location.search]);

    useEffect(() => {
        return () => {
            setSearchKey('');
        };
    }, [setSearchKey]);

    useEffect(() => {
        if (searchKey && searchKey !== searchTerm) {
            setSearchTerm(searchKey);
            fetchSales(searchKey, 1);
        }
    }, [searchKey, fetchSales]); // Added fetchSales

    // Main fetch effect
    useEffect(() => {
        if (searchKey && searchKey === debouncedSearchTerm) {
            return; // Skip if context search just ran
        }
        fetchSales(debouncedSearchTerm, currentPage);
    }, [debouncedSearchTerm, currentPage, fetchSales, searchKey]);


    // --- NEW: Handlers from Desktop ---
    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: (prev.key === key && prev.direction === 'asc') ? 'desc' : 'asc'
        }));
        setCurrentPage(1);
    };

    const handleOpenReminderModal = (saleId) => {
        setCurrentReminderInvoiceId(saleId);
        setReminderMessage("");
        setSendViaEmail(true);
        setSendViaWhatsapp(false);
        setShowReminderModal(true);
    };

    const handleConfirmSendReminder = async () => {
        if (!currentReminderInvoiceId) return;
        if (!sendViaEmail && !sendViaWhatsapp) {
            toast.error("Please select at least one channel (Email or WhatsApp).");
            return;
        }

        try {
            const payload = {
                message: reminderMessage,
                sendViaEmail: sendViaEmail,
                sendViaWhatsapp: sendViaWhatsapp,
                orderId: currentReminderInvoiceId
            };

            await axios.post(`${apiUrl}/api/shop/payment/send-reminder`, payload, { withCredentials: true });

            setSales(currentSales =>
                currentSales.map(sale =>
                    sale.id === currentReminderInvoiceId
                        ? { ...sale, reminderCount: (sale.reminderCount || 0) + 1 }
                        : sale
                )
            );
            toast.success('Reminder sent successfully!');
            setShowReminderModal(false);
            setReminderMessage("");
            setCurrentReminderInvoiceId(null);
        } catch (error) {
            console.error("Error sending reminder:", error);
            toast.error("Failed to send the reminder.");
        }
    };

    const handleOpenPaymentModal = (sale) => {
        setCurrentPaymentOrder(sale);
        setPayingAmount("");
        setShowPaymentModal(true);
    };

    const handleConfirmUpdatePayment = async () => {
        if (!currentPaymentOrder) return;

        const amount = parseFloat(payingAmount);
        const dueAmount = currentPaymentOrder.total - currentPaymentOrder.paid;

        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid payment amount.");
            return;
        }
        if (amount > dueAmount + 0.01) {
            toast.error(`Payment cannot be more than the due amount of ₹${dueAmount.toLocaleString()}.`);
            return;
        }

        setIsUpdatingPayment(true);
        try {
            const payload = { invoiceId: currentPaymentOrder.id, amount: amount };
            await axios.post(`${apiUrl}/api/shop/payment/update`, payload, { withCredentials: true });

            setSales(prevSales =>
                prevSales.map(sale => {
                    if (sale.id === currentPaymentOrder.id) {
                        const newPaidAmount = sale.paid + amount;
                        const newStatus = (newPaidAmount + 0.01) >= sale.total ? 'Paid' : 'SemiPaid';
                        return { ...sale, paid: newPaidAmount, status: newStatus };
                    }
                    return sale;
                })
            );

            toast.success("Payment updated successfully!");
            setShowPaymentModal(false);
            setCurrentPaymentOrder(null);
        } catch (error) {
            console.error("Error updating payment:", error);
            toast.error("Failed to update payment.");
        } finally {
            setIsUpdatingPayment(false);
        }
    };

    const handleSendInvoice = async (saleId) => {
        if (!saleId) {
            toast.error("Order Reference number is not available.");
            return;
        }
        if (!window.confirm("Send the invoice to customer via email?")) return;

        try {
            const response = await fetch(`${apiUrl}/api/shop/send-invoice-email/${saleId}`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || `Failed to send invoice: ${response.statusText}`);
            }
            toast.success("Invoice sent successfully!");
        } catch (error) {
            console.error("Error sending invoice email:", error);
            toast.error(`Could not send invoice: ${error.message}`);
        }
    };

    // --- UPDATED: Handler from Mobile (with Toast) ---
    const handleDownloadInvoice = async (saleId) => {
        try {
            const response = await axios.get(
                `${apiUrl}/api/shop/get/invoice/${saleId}`,
                { responseType: "blob", withCredentials: true }
            );

            const blob = new Blob([response.data], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `invoice-${saleId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Invoice downloaded!"); // --- ADDED
        } catch (error) {
            console.error("Error downloading invoice:", error);
            toast.error("Failed to download the invoice."); // --- UPDATED
        }
    };

    // --- UPDATED: Row Click (Unchanged, was already correct) ---
    const handleRowClick = async (saleId) => {
        try {
            const response = await axios.get(
                `${apiUrl}/api/shop/get/order/${saleId}`,
                { withCredentials: true }
            );
            setSelectedOrder(response.data);
            setShowModal(true);
        } catch (error) {
            console.error("Error fetching order details:", error);
            toast.error("Failed to fetch order details."); // --- UPDATED
        }
    };

    // --- NEW: Smart Pagination Helper ---
    const getPaginationItems = (currentPage, totalPages) => {
        const totalPageNumbersToShow = 5; // Mobile friendly
        if (totalPages <= totalPageNumbersToShow) {
            return [...Array(totalPages)].map((_, i) => i + 1);
        }
        if (currentPage <= 3) {
            return [1, 2, 3, '...', totalPages];
        }
        if (currentPage >= totalPages - 2) {
            return [1, '...', totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    };
    const paginationItems = getPaginationItems(currentPage, totalPages);

    return (
        <div className="page-container">
            <Toaster position="top-center" /> {/* --- ADDED --- */}
            <h2>Sales</h2>
            <div className="page-header">
                <input
                    type="text"
                    placeholder="Search by Invoice ID or Customer..."
                    className="search-bar"
                    value={searchTerm} // --- ADDED to control input
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        // No need to set page here, debouncer handles it
                    }}
                />
            </div>

            <div className="glass-card">
                <table
                    className="data-table"
                    style={{ borderCollapse: "collapse", width: "100%" }}
                >
                    <thead>
                    <tr>
                        <th style={{ padding: "6px 8px" }}>Invoice ID</th>
                        <th style={{ padding: "6px 8px" }}>Date</th>
                        <th style={{ padding: "6px 8px" }}>Total</th>
                        <th style={{ padding: "6px 8px" }}>Actions</th> {/* --- RENAMED --- */}
                    </tr>
                    </thead>
                    <tbody>
                    {sales.map((sale) => (
                        <tr
                            key={sale.id}
                            onClick={() => handleRowClick(sale.id)}
                            style={{ cursor: "pointer" }}
                        >
                            <td style={{ padding: "6px 8px" }}>{sale.id}</td>
                            <td style={{ padding: "6px 8px" }}>
                                {(() => {
                                    const d = new Date(sale.date);
                                    const day = String(d.getDate()).padStart(2, "0");
                                    const month = String(d.getMonth() + 1).padStart(2, "0");
                                    const year = d.getFullYear();
                                    return `${day}-${month}-${year}`;
                                })()}
                            </td>
                            <td style={{ padding: "6px 8px" }}>₹{sale.total.toLocaleString()}</td>


                            {/* --- NEW: Actions Cell --- */}
                            <td style={{ padding: "6px 8px", display: 'flex', gap: '4px' }}>
                                <button
                                    className="download-btn"
                                    title="Download Invoice"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadInvoice(sale.id);
                                    }}
                                >
                                    <i className="fa-duotone fa-solid fa-download" style={{fontSize:"15px", color:"var(--text-color)"}}></i>
                                </button>
                                <PremiumFeature>
                                <button
                                    className="download-btn"
                                    title="Send via Email"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendInvoice(sale.id);
                                    }}
                                >
                                    <i className="fa-duotone fa-solid fa-paper-plane" style={{fontSize:"15px", color:"var(--text-color)"}}></i>
                                </button></PremiumFeature>

                                {sale.status !== 'Paid' && (
                                    <>
                                    <PremiumFeature>
                                        <button
                                            className="download-btn"
                                            title="Send Reminder"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenReminderModal(sale.id);
                                            }}
                                        >
                                            <i className="fa-duotone fa-solid fa-bell-plus" style={{fontSize: "15px", color:"var(--text-color)"}}></i>
                                        </button></PremiumFeature>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                    {sales.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{ textAlign: "center", padding: "8px" }}>
                                No sales found.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>

                {/* --- UPDATED: Smart Pagination --- */}
                {totalPages > 1 && (
                    <div className="pagination">
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
                                    className={currentPage === item ? "active" : ""}
                                    onClick={() => setCurrentPage(item)}
                                >
                                    {item}
                                </button>
                            )
                        )}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Order Details Modal (Unchanged) */}
            {showModal && selectedOrder && (
                <div className="order-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="order-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="order-modal-header">
                            <h2>Invoice #{selectedOrder.invoiceId}</h2>
                            <button className="close-button" onClick={() => setShowModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>
                        <div className="order-box">
                            <h3><MdPerson size={24} /> Customer Details</h3>
                            <div className="detail-item">
                                <MdPerson size={20} color="var(--primary-color)" />
                                <span><strong>Customer:</strong> {selectedOrder.customerName}</span>
                            </div>
                            <div className="detail-item">
                                <MdEmail size={20} color="var(--primary-color)" />
                                <span><strong>Email:</strong> {selectedOrder.customerEmail}</span>
                            </div>
                            <div className="detail-item">
                                <MdPhone size={20} color="var(--primary-color)" />
                                <span><strong>Phone:</strong> {selectedOrder.customerPhone}</span>
                            </div>
                            <div className="detail-item">
                                {selectedOrder.paid ? <MdCheckCircle size={20} color="green" /> : <MdCancel size={20} color="red" />}
                                <span><strong>Status:</strong> {selectedOrder.paid ? "Paid" : "Pending"}</span>
                            </div>
                        </div>
                        <div className="order-box">
                            <h3><MdShoppingCart size={24} /> Order Items</h3>
                            <table className="order-items-table">
                                <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Cost (each)</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                </tr>
                                </thead>
                                <tbody>
                                {selectedOrder.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.productName}</td>
                                        <td>₹{(item.unitPrice / item.quantity).toLocaleString()}</td>
                                        <td>{item.quantity.toLocaleString()}</td>
                                        <td>₹{item.unitPrice.toLocaleString()}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="order-box">
                            {selectedOrder.subTotal !== undefined && (
                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>₹{selectedOrder.subTotal.toLocaleString()}</span>
                                </div>
                            )}
                            {selectedOrder.tax !== undefined && (
                                <div className="summary-row">
                                    <span>Tax</span>
                                    <span>₹{selectedOrder.tax.toLocaleString()}</span>
                                </div>
                            )}
                            {selectedOrder.discount !== undefined && (
                                <div className="summary-row">
                                    <span>Discount</span>
                                    <span style={{ color: 'red' }}>-₹{selectedOrder.discount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="summary-divider" />
                            {selectedOrder.gstRate !== undefined && (
                                <div className="summary-row" style={{ fontWeight: 'bold' }}>
                                    <span className="gstTotal">GST</span>
                                    <span className="gstTotal">₹{selectedOrder.gstRate.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="total-amount">
                                <span>Total</span>
                                <span>₹{selectedOrder.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW: Reminder Modal --- */}
            {showReminderModal && (
                <div className="order-modal-overlay" onClick={() => setShowReminderModal(false)}>
                    <div className="order-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="order-modal-header">
                            <h2>Send Reminder for Invoice #{currentReminderInvoiceId}</h2>
                            <button className="close-button" onClick={() => setShowReminderModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label>Message (Optional):</label>
                                <textarea
                                    value={reminderMessage}
                                    onChange={(e) => setReminderMessage(e.target.value)}
                                    placeholder="Add a custom message..."
                                    rows="4"
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Send via:</label>
                                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={true} // Defaulted to true as per desktop
                                            onChange={(e) => setSendViaEmail(e.target.checked)}
                                        /> Email
                                    </label>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={sendViaWhatsapp}
                                            onChange={(e) => setSendViaWhatsapp(e.target.checked)}
                                        /> WhatsApp
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button className="btn btn-outline" onClick={() => setShowReminderModal(false)}>Cancel</button>
                                <button className="btn" onClick={handleConfirmSendReminder}>
                                    <MdSend size={18} /> Send Reminder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW: Payment Modal --- */}
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
                                    style={{ textAlign: 'right', fontSize: '1.2rem' }}
                                />
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

export default SalesPage;