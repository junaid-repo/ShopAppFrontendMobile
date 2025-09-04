import React, { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';
import axios from 'axios';
import { useConfig } from "./ConfigProvider";
import {MdDownload} from "react-icons/md";
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

    const [selectedOrder, setSelectedOrder] = useState(null); // 🟢 For modal details
    const [showModal, setShowModal] = useState(false);
    const token = localStorage.getItem("jwt_token");
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
        color: '#213C67FF',
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
        color: '#213C67FF',
    };

    const summaryRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '1.1rem',
        padding: '0.4rem 0',
    };


    useEffect(() => {
        fetch(apiUrl + "/api/shop/get/sales", {
            method: "GET",
            headers: {

                'Authorization': `Bearer ${token}`
            }
        })
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then((data) => {
                setSales(data);
            })
            .catch((error) => {
                console.error("Error fetching sales:", error);
                alert("Something went wrong while fetching sales.");
            });
    }, []);

    const filteredSales = sales.filter(s =>
        s.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLast = currentPage * pageSize;
    const indexOfFirst = indexOfLast - pageSize;
    const currentSales = filteredSales.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredSales.length / pageSize);

    const handleDownloadInvoice = async (saleId) => {try {
        const response = await axios.get(
            `${apiUrl}/api/shop/get/invoice/${saleId}`,
            {
                responseType: "blob",
                headers: {
                    Authorization: `Bearer ${token}` // <-- Add your token here
                }
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
                    headers: {
                        Authorization: `Bearer ${token}` // Replace with your token variable
                    }
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
                <table className="data-table" style={{ borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                    <tr>
                        <th style={{ padding: "8px 6px" }}>Invoice ID</th>
                        <th style={{ padding: "8px 6px" }}>Customer</th>
                        <th style={{ padding: "8px 6px" }}>Date</th>
                        <th style={{ padding: "8px 6px" }}>Total</th>
                        <th style={{ padding: "8px 6px" }}>Status</th>
                        <th style={{ padding: "8px 6px" }}>Invoice</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentSales.map((sale) => (
                        <tr
                            key={sale.id}
                            onClick={() => handleRowClick(sale.id)}
                            style={{ cursor: "pointer" }}
                        >
                            <td style={{ padding: "8px 6px" }}>{sale.id}</td>
                            <td style={{ padding: "8px 6px" }}>{sale.customer}</td>
                            <td style={{ whiteSpace: "nowrap", padding: "8px 6px" }}>
                                {(() => {
                                    const d = new Date(sale.date);
                                    const day = String(d.getDate()).padStart(2, "0");
                                    const month = String(d.getMonth() + 1).padStart(2, "0");
                                    const year = d.getFullYear();
                                    return `${day}-${month}-${year}`;
                                })()}
                            </td>
                            <td style={{ padding: "8px 6px" }}>₹{sale.total.toLocaleString()}</td>
                            <td style={{ padding: "8px 6px" }}>
          <span className={sale.status === "Paid" ? "status-paid" : "status-pending"}>
            {sale.status}
          </span>
                            </td>
                            <td style={{ padding: "8px 6px" }}>
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
                                        padding: "4px",
                                        marginRight: "4px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                >
                                    <MdDownload size={16} color="#d32f2f" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {currentSales.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{ textAlign: "center", padding: "8px 6px" }}>
                                No sales found.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>


                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                            Prev
                        </button>
                        {[...Array(totalPages)].map((_, idx) => (
                            <button
                                key={idx}
                                className={currentPage === idx + 1 ? 'active' : ''}
                                onClick={() => setCurrentPage(idx + 1)}
                            >
                                {idx + 1}
                            </button>
                        ))}
                        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* 🟢 Order Details Modal */}
            {showModal && selectedOrder && (<div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                    animation: "fadeIn 0.3s ease"
                }}
                onClick={() => setShowModal(false)}
            >
                <div
                    style={{
                        background: "var(--glass-bg)",
                        borderRadius: "20px",
                        padding: "2rem",
                        width: "90%",
                        maxWidth: "700px",
                        boxShadow: "0 8px 30px var(--shadow-color)",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        color: "#213C67FF",
                        border: "1px solid var(--border-color)",
                        animation: "slideIn 0.3s ease"
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "2px solid var(--border-color)",
                        marginBottom: "1.5rem",
                        paddingBottom: "0.5rem",
                        color: "var(--primary-color)"
                    }}>
                        <h2 style={{ margin: 0, fontSize: "1.8rem" }}>
                            Invoice #{selectedOrder.invoiceId}
                        </h2>
                        <button
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-color)"
                            }}
                            onClick={() => setShowModal(false)}
                        >
                            <MdClose size={28} />
                        </button>
                    </div>

                    {/* Box 1: Customer Details */}
                    <div style={boxStyle}>
                        <h3 style={boxHeaderStyle}>
                            <MdPerson size={24} /> Customer Details
                        </h3>
                        <div style={detailItemStyle}>
                            <MdPerson size={20} color="var(--primary-color)" />
                            <span>
                                    <strong>Customer:</strong> {selectedOrder.customerName}
                                </span>
                        </div>
                        <div style={detailItemStyle}>
                            <MdEmail size={20} color="var(--primary-color)" />
                            <span>
                                    <strong>Email:</strong> {selectedOrder.customerEmail}
                                </span>
                        </div>
                        <div style={detailItemStyle}>
                            <MdPhone size={20} color="var(--primary-color)" />
                            <span>
                                    <strong>Phone:</strong> {selectedOrder.customerPhone}
                                </span>
                        </div>
                        <div style={detailItemStyle}>
                            {selectedOrder.paid ? (
                                <MdCheckCircle size={20} color="green" />
                            ) : (
                                <MdCancel size={20} color="red" />
                            )}
                            <span>
                                    <strong>Status:</strong>{' '}
                                {selectedOrder.paid ? "Paid" : "Pending"}
                                </span>
                        </div>
                    </div>

                    {/* Box 2: Order Items */}
                    <div style={boxStyle}>
                        <h3 style={boxHeaderStyle}>
                            <MdShoppingCart size={24} /> Order Items
                        </h3>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {selectedOrder.items.map((item, idx) => (
                                <li
                                    key={idx}
                                    style={{
                                        padding: "0.8rem 0.2rem",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        fontSize: "1.1rem",
                                        fontWeight: 500,
                                        borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid #eee' : 'none',
                                    }}
                                >
                                    <span>{item.productName} (x{item.quantity})</span>
                                    <span>₹{item.unitPrice.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Box 3: Totals & GST */}
                    <div style={boxStyle}>
                        {selectedOrder.subTotal !== undefined && (
                            <div style={summaryRowStyle}>
                                <span>Subtotal</span>
                                <span>₹{selectedOrder.subTotal.toLocaleString()}</span>
                            </div>
                        )}
                        {selectedOrder.tax !== undefined && (
                            <div style={summaryRowStyle}>
                                <span>Tax</span>
                                <span>₹{selectedOrder.tax.toLocaleString()}</span>
                            </div>
                        )}
                        {selectedOrder.discount !== undefined && (
                            <div style={summaryRowStyle}>
                                <span>Discount</span>
                                <span style={{color: 'red'}}>-₹{selectedOrder.discount.toLocaleString()}</span>
                            </div>
                        )}
                        {selectedOrder.gstRate !== undefined && (
                            <div style={{...summaryRowStyle, fontWeight: 'bold' }}>
                                <span>GST</span>
                                <span>₹{selectedOrder.gstRate.toLocaleString()}</span>
                            </div>
                        )}
                        <div style={{ borderTop: '2px solid var(--border-color)', margin: '0.75rem 0' }} />
                        <div
                            style={{
                                ...summaryRowStyle,
                                fontSize: "1.6rem",
                                fontWeight: "bold",
                                color: "var(--primary-color)",
                            }}
                        >
                            <span>Total</span>
                            <span>₹{selectedOrder.totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>)}



        </div>
    );
};

export default SalesPage;
