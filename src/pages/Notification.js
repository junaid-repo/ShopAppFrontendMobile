import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from './ConfigProvider';
import { useSearchKey } from '../context/SearchKeyContext';
import { FaCheck, FaFlag, FaTrash } from "react-icons/fa";

const domainToRoute = {
    products: 'products',
    sales: 'sales',
    customers: 'customers',
};

const Notification = ({ setCurrentPage }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDomain, setFilterDomain] = useState('all');
    const [showSeen, setShowSeen] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPPage, setCurrentPPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedNotification, setSelectedNotification] = useState(null); // Used to track expanded notification
    const config = useConfig();
    const apiUrl = config ? config.API_URL : '';
    const navigate = useNavigate();
    const { setSearchKey } = useSearchKey();
    const ITEMS_PER_PAGE = 7;

    useEffect(() => {
        fetchAllNotifications();
    }, [apiUrl, currentPPage, filterDomain, showSeen, sortOrder]);

    const fetchAllNotifications = async () => {
        setLoading(true);
        // Do not reset selectedNotification on fetch to keep it expanded during pagination
        try {
            const url = new URL(`${apiUrl}/api/shop/notifications/all`);
            url.searchParams.append('page', currentPPage);
            url.searchParams.append('limit', ITEMS_PER_PAGE);
            if (filterDomain !== 'all') url.searchParams.append('domain', filterDomain);
            if (showSeen !== 'all') url.searchParams.append('seen', showSeen);
            url.searchParams.append('sort', sortOrder);
            const res = await fetch(url, { method: 'GET', credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            setNotifications(data.notifications || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = (notif) => {
        // If the clicked notification is already expanded, collapse it.
        if (selectedNotification && selectedNotification.id === notif.id) {
            setSelectedNotification(null);
            return;
        }

        // Otherwise, expand the new one and mark as read if unseen.
        if (!notif.seen) {
            batchMarkAsRead([notif.id]);
        }
        setSelectedNotification(notif);
    };

    const batchMarkAsRead = async (ids) => {
        if (!ids || ids.length === 0) return;
        try {
            await fetch(`${apiUrl}/api/shop/notifications/update-status`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: ids, status: 'seen' }),
            });
            setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, seen: true } : n));
        } catch (err) {
            console.error('Failed to batch mark notifications as read:', err);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/delete/${notificationId}`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to delete notification');
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setSelectedNotification(null);

            setTimeout(() => {
                if (notifications.length === 1 && currentPPage > 1) {
                    setCurrentPPage(prev => prev - 1);
                } else {
                    fetchAllNotifications();
                }
            }, 0);
        } catch (err) {
            console.error("Error deleting notification:", err);
        }
    };

    const handleFlag = async (notificationId, newFlagStatus) => {
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/flag/${notificationId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ flagged: newFlagStatus }),
            });

            if (!res.ok) throw new Error('Failed to update flag status');
            const updatedNotification = await res.json();
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, isFlagged: updatedNotification.flagged } : n
                )
            );
            if (selectedNotification && selectedNotification.id === notificationId) {
                setSelectedNotification(prev => ({ ...prev, isFlagged: updatedNotification.flagged }));
            }
        } catch (err) {
            console.error('Error flagging/unflagging notification:', err);
        }
    };

    const handleTakeAction = (notif) => {
        const route = domainToRoute[notif.domain];
        if (!route) return;
        setSearchKey(notif.searchKey);
        if (setCurrentPage) {
            setCurrentPage(route);
        } else {
            navigate(`/${route}`);
        }
    };

    const getRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return `${Math.floor(diff / 86400)} day(s) ago`;
    };

    const getFormattedDateTime = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleString('en-US', options);
    };

    return (
        <div className="page-container" style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ marginBottom: "20px", paddingLeft: "30px" }}>Notifications</h2>

            {/* --- Mobile Friendly Filters --- */}
            <div className="glass-card" style={{ marginBottom: "2rem", padding: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "row", gap: "2rem", alignItems: "flex-end" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <span>Filter Domain:</span>
                        <select
                            className="date-input"
                            value={filterDomain}
                            onChange={(e) => setFilterDomain(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="products">Products</option>
                            <option value="sales">Sales</option>
                            <option value="customers">Customers</option>
                        </select>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <span>Show:</span>
                        <select
                            className="date-input"
                            value={showSeen}
                            onChange={(e) => setShowSeen(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="seen">Read</option>
                            <option value="unseen">Unread</option>
                            <option value="flagged">Flagged</option>
                        </select>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <span>Sort:</span>
                        <select
                            className="date-input"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                    </label>
                </div>
            </div>


            {/* --- Notification List --- */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                {loading ? (<div>Loading...</div>) : notifications.length === 0 ? (<div>No notifications found.</div>) : (
                    <>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {notifications.map(notif => (
                                <div key={notif.id} style={{ marginBottom: '1rem' }}>
                                    {/* --- Collapsed Notification Item (Clickable) --- */}
                                    <div
                                        onClick={() => handleNotificationClick(notif)}
                                        style={{
                                            padding: '1rem',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s ease',
                                            background: notif.seen ? 'rgba(0,170,255,0.08)' : '#f9f9f9',
                                            borderLeft: selectedNotification?.id === notif.id
                                                ? '4px solid #0056b3'
                                                : notif.seen
                                                    ? '4px solid #ddd'
                                                    : '4px solid var(--primary-color)',
                                            borderRadius: selectedNotification?.id === notif.id ? '20px 20px 0 0' : '20px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div style={{ fontWeight: 600 }}>{notif.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888', flexShrink: 0, marginLeft: '10px' }}>
                                                {getRelativeTime(notif.createdAt)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {notif.message}
                                        </div>
                                    </div>

                                    {/* --- Expanded Notification Details (Conditional) --- */}
                                    {selectedNotification?.id === notif.id && (
                                        <div
                                            className="glass-card expanded-details"
                                            style={{
                                                padding: '1.5rem',
                                                borderLeft: '5px solid rgba(0,170,255,0.08)',
                                                borderRight: '5px solid rgba(0,170,255,0.08)',
                                                borderBottom: '5px solid rgba(0,170,255,0.08)',
                                                borderBottomLeftRadius: '20px',
                                                borderBottomRightRadius: '20px'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "1rem",
                                                    borderBottom: "2px solid #ccc",
                                                    paddingBottom: "1rem",
                                                    marginBottom: "1rem",
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <div>
                                                        <h3 style={{ margin: 0, fontSize: "1.4rem" }}>
                                                            {selectedNotification.title}
                                                        </h3>
                                                        <div style={{ fontSize: "0.85rem", color: "#888", marginTop: "8px" }}>
                                                            {getFormattedDateTime(selectedNotification.createdAt)}
                                                        </div>
                                                    </div>

                                                    {/* Icons aligned to right */}
                                                    <div style={{ display: "flex", gap: "0.75rem" }}>
                                                        <FaCheck
                                                            size={18}
                                                            style={{ cursor: "pointer", color: "#28a745" }}
                                                            onClick={() => handleTakeAction(selectedNotification)}
                                                        />
                                                        <FaFlag
                                                            size={18}
                                                            style={{
                                                                cursor: "pointer",
                                                                color: selectedNotification?.isFlagged ? "#6c757d" : "#ffc107",
                                                            }}
                                                            onClick={() =>
                                                                handleFlag(selectedNotification.id, !selectedNotification.isFlagged)
                                                            }
                                                        />
                                                        <FaTrash
                                                            size={18}
                                                            style={{ cursor: "pointer", color: "#dc3545" }}
                                                            onClick={() => handleDelete(selectedNotification.id)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <div>
                                                    <p style={{ margin: 0, lineHeight: 1.6 }}>{selectedNotification.message || 'No additional details provided.'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="pagination-controls" style={{ marginTop: '1rem', display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                            <button onClick={() => setCurrentPPage(p => Math.max(p - 1, 1))} disabled={currentPPage === 1} className="pagination-btn">&laquo; Prev</button>
                            <span>Page {currentPPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPPage(p => Math.min(p + 1, totalPages))} disabled={currentPPage === totalPages} className="pagination-btn">Next &raquo;</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Notification;
