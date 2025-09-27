import React, { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';
import axios from 'axios';
import { useConfig } from "./ConfigProvider";
import {MdDownload} from "react-icons/md";
import './SalesPage.css';
import {
    MdPerson,
    MdEmail,
    MdPhone,
    MdShoppingCart,
    MdClose,
    MdCheckCircle,
    MdCancel,
} from 'react-icons/md';

const SalesPage = () => {
    const [sales, setSales] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(10);
    const [selectedOrder, setSelectedOrder] = useState(null); // 🟢 For modal details
    const [showModal, setShowModal] = useState(false);

    const config = useConfig();
    var apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }
    const boxStyle = {
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.07)',
    };

    const boxHeaderStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '1.3rem',
        fontWeight: '600',
        color: 'var(--text-color)',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem',
    };

    const detailItemStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '1.1rem',
        lineHeight: '1.8rem',
        color: 'var(--text-color-secondary)',
    };

    const summaryRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '1.1rem',
        padding: '0.4rem 0',
    };


    useEffect(() => {
        const fetchSales = async () => {
            try {
                const response = await axios.get(`${apiUrl}/api/shop/get/sales`, {
                    params: {
                        page: currentPage - 1,
                        size: pageSize,
                        search: searchTerm || '' // ✅ sent to backend
                    },
                    withCredentials: true,
                });

                setSales(response.data.content);
                setTotalPages(response.data.totalPages); // ✅ Fix typo here too (was `totalePages`)
            } catch (error) {
                console.error("Error fetching sales:", error);
                alert("Something went wrong while fetching sales.");
            }
        };

        fetchSales();
    }, [apiUrl, currentPage, pageSize, searchTerm]); // ✅ Add searchTerm here




    const indexOfLast = currentPage * pageSize;
    const indexOfFirst = indexOfLast - pageSize;
    // const currentSales = filteredSales.slice(indexOfFirst, indexOfLast);
    const currentSales = sales;


    const handleDownloadInvoice = async (saleId) => {try {
        const response = await axios.get(
            `${apiUrl}/api/shop/get/invoice/${saleId}`,
            {
                responseType: "blob",
                withCredentials: true,

            }
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

    } catch (error) {
        console.error("Error downloading invoice:", error);
        alert("Failed to download the invoice. Please try again.");
    }
    };

    // 🟢 API CALL needed here when user clicks a row
    const handleRowClick = async (saleId) => {

        try {
            const response = await axios.get(
                `${apiUrl}/api/shop/get/order/${saleId}`,
                {
                    withCredentials: true,

                }
            );

            setSelectedOrder(response.data); // full order details
            setShowModal(true);

        } catch (error) {
            console.error("Error fetching order details:", error);
            alert("Failed to fetch order details.");
        }

    };

    return (
        <div className="page-container">
            <h2>Sales</h2>
            <div className="page-header">
                <input
                    type="text"
                    placeholder="Search by Invoice ID or Customer..."
                    className="search-bar"
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
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
                        <th style={{ padding: "6px 8px" }}>Customer</th>
                        <th style={{ padding: "6px 8px" }}>Date</th>
                        <th style={{ padding: "6px 8px" }}>Total</th>
                        <th style={{ padding: "6px 8px" }}>Status</th>
                        <th style={{ padding: "6px 8px" }}>Invoice</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentSales.map((sale) => (
                        <tr
                            key={sale.id}
                            onClick={() => handleRowClick(sale.id)} // 🟢 click row to open modal
                            style={{ cursor: "pointer" }}
                        >
                            <td style={{ padding: "6px 8px" }}>{sale.id}</td>
                            <td style={{ padding: "6px 8px" }}>{sale.customer}</td>
                            <td style={{ padding: "6px 8px" }}>
                                {(() => {
                                    const d = new Date(sale.date);
                                    const day = String(d.getDate()).padStart(2, "0");
                                    const month = String(d.getMonth() + 1).padStart(2, "0"); // Months are 0-based
                                    const year = d.getFullYear();
                                    return `${day}-${month}-${year}`;
                                })()}
                            </td>
                            <td style={{ padding: "6px 8px" }}>₹{sale.total.toLocaleString()}</td>
                            <td style={{ padding: "6px 8px" }}>
            <span
                className={
                    sale.status === "Paid" ? "status-paid" : "status-pending"
                }
            >
              {sale.status}
            </span>
                            </td>

                            <td style={{ padding: "6px 8px" }}>
                                <button
                                    className="download-btn"
                                    title="Download Invoice"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadInvoice(sale.id);
                                    }}
                                    style={{
                                        cursor: "pointer",
                                        backgroundColor: "#6CDB11",
                                        borderRadius: "6px",
                                        padding: "4px 6px",
                                        marginRight: "6px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        color: "blue",
                                        justifyContent: "center",
                                    }}
                                >
                                    <MdDownload size={18} color="#d32f2f" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {currentSales.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{ textAlign: "center", padding: "8px" }}>
                                No sales found.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Prev
                        </button>
                        {[...Array(totalPages)].map((_, idx) => (
                            <button
                                key={idx}
                                className={currentPage === idx + 1 ? "active" : ""}
                                onClick={() => setCurrentPage(idx + 1)}
                            >
                                {idx + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>


            {/* 🟢 Order Details Modal */}
            {showModal && selectedOrder && (
                <div
                    className="order-modal-overlay"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="order-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="order-modal-header">
                            <h2>Invoice #{selectedOrder.invoiceId}</h2>
                            <button className="close-button" onClick={() => setShowModal(false)}>
                                <MdClose size={28} />
                            </button>
                        </div>

                        {/* Box 1: Customer Details */}
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
                                {selectedOrder.paid ? (
                                    <MdCheckCircle size={20} color="green" />
                                ) : (
                                    <MdCancel size={20} color="red" />
                                )}
                                <span>
            <strong>Status:</strong> {selectedOrder.paid ? "Paid" : "Pending"}
          </span>
                            </div>
                        </div>

                        {/* Box 2: Order Items */}
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


                        {/* Box 3: Totals & GST */}
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
                                    <span style={{ color: 'red' }}>
              -₹{selectedOrder.discount.toLocaleString()}
            </span>
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



        </div>
    );
};

export default SalesPage;
