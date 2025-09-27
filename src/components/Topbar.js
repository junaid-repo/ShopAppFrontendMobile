// src/components/Topbar.js
import React, { useState, useEffect, useRef } from 'react';
import { FaUserCircle, FaSignOutAlt, FaSun, FaMoon, FaHome, FaBell } from 'react-icons/fa';
import { jwtDecode } from "jwt-decode";
import { useConfig } from "../pages/ConfigProvider";
import { useNavigate } from 'react-router-dom';

const Topbar = ({ onLogout, theme, toggleTheme, toggleSidebar, isCollapsed, setCurrentPage }) => {
    const [userName, setUserName] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unseenCount, setUnseenCount] = useState(0);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
    const [notifDropdownHover, setNotifDropdownHover] = useState(false);
    const notifDropdownRef = useRef(null);

    const navigate = useNavigate();
    let apiUrl = "";
    const config = useConfig();
    if (config) {
        apiUrl = config.API_URL;
    }

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');

        (async () => {
            try {
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });

                if (!userRes.ok) {
                    console.error('Failed to fetch user data:', userRes.statusText);
                    return;
                }

                const userData = await userRes.json();
                const username = userData.username;

                if (!username) {
                    console.warn('Username is empty, skipping profile pic fetch');
                    return;
                }

                setUserName(username); // You can still store it in state
                console.log("Fetched username:", username);

                // Fetch profile picture
                const res = await fetch(`${apiUrl}/api/shop/user/${username}/profile-pic`, {
                    method: "GET",
                    credentials: 'include',
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                if (res.ok) {
                    const arrayBuffer = await res.arrayBuffer();
                    const blob = new Blob([arrayBuffer]);
                    const imageUrl = URL.createObjectURL(blob);
                    setProfilePic(imageUrl);
                } else {
                    console.error('Failed to fetch profile picture:', res.statusText);
                }

            } catch (err) {
                console.error('Failed to load profile pic', err);
            }
        })();
    }, [apiUrl]);

    // Fetch unseen notifications
    const fetchUnseenNotifications = async () => {
        if (!apiUrl) return;
        try {
            const res = await fetch(`${apiUrl}/api/shop/notifications/unseen`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnseenCount(data.count || 0);
        } catch (err) {
            // Optionally handle error
        }
    };

    // Poll for notifications every 30s
    useEffect(() => {
        fetchUnseenNotifications();
        const interval = setInterval(fetchUnseenNotifications, 30000);
        return () => clearInterval(interval);
    }, [apiUrl]);

    // Close dropdown on outside click
    useEffect(() => {
        if (!notifDropdownOpen) return;
        const handleClick = (e) => {
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
                setNotifDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [notifDropdownOpen]);

    // Clear notifications (mark all as seen)
    const handleClearNotifications = async (e) => {
        e.stopPropagation();
        try {
            await fetch(`${apiUrl}/api/shop/notifications/clear`, {
                method: 'POST',
                credentials: 'include',
            });
            setUnseenCount(0);
            setNotifications([]);
        } catch (err) {}
    };

    console.log("inside top bar ",setCurrentPage)

    // Handle notification icon click
    const handleNotifClick = () => {
        setNotifDropdownOpen(false);
        if (setCurrentPage) {
            setCurrentPage('notifications');
        } else {
            navigate('/notifications');
        }
    };

    // helper to navigate internally when setCurrentPage is provided
    const goTo = (page) => {
        if (typeof setCurrentPage === 'function') {
            setCurrentPage(page);
        } else {
            navigate(`/${page}`);
        }
    };

    const handleProfileClick = () => {
        if (setCurrentPage) {
            setCurrentPage('profile');
        } else {
            navigate('/profile');
        }
    };

    const handleLogout = () => {

        const confirmDownload = window.confirm("Do you really want to log out?");
        if (!confirmDownload) {
            return;
        }

        onLogout();

        const res =  fetch(`${apiUrl}/api/user/logout`, {
            method: "POST",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json"
            }
        });
        if(res.status){
            navigate("/login", { replace: true });
        }
    };

    // Helper: relative time
    const getRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000); // seconds
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? '' : 's'} ago`;
        if (diff < 2592000) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? '' : 's'} ago`;
        return date.toLocaleDateString();
    };


    return (
        <header
            className="topbar"
            style={{
                display: 'flex',
               // flexDirection: 'column', // stack vertically on mobile
                gap: '5px',
                marginTop: '1.5rem',
                marginLeft: '50px',
                padding: '0.5rem 0.75rem',
                alignItems: 'stretch',
            }}
        >
            {/* Left section → Home shortcut */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginRight: "12px", marginLeft: "55px" }}>
                <div
                    onClick={() => goTo('dashboard')}
                    style={{
                        fontSize: "1.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        userSelect: "none",
                        color: "var(--text-color)", // ✅ adapts to theme
                        fontFamily:
                            "lemon_milk_pro_regular_webfont, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
                    }}
                >
                    <h5>Clear Bill</h5>
                </div>

            </div>

            {/* Controls */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "2px"
            }}>

                {/* Notification Bell Icon */}
                <div
                    ref={notifDropdownRef}
                    style={{ position: 'relative', marginRight: '-2rem' }}
                    onMouseEnter={() => setNotifDropdownOpen(true)}
                    onMouseLeave={() => setTimeout(() => { if (!notifDropdownHover) setNotifDropdownOpen(false); }, 100)}
                >
                    <button
                        style={{
                            background: 'transparent', // fully invisible
                            border: 'none',
                            padding: 0,

                            cursor: 'pointer',
                            outline: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        aria-label="Notifications"
                        onClick={handleNotifClick}
                    >
                        <FaBell
                            size={21}
                            color={unseenCount > 0 ? '#f4d812' : 'var(--primary-color)'}
                            style={{
                                display: 'inline-block',
                                filter: 'drop-shadow(0 2px 8px var(--shadow-color)) drop-shadow(0 1px 4px var(--shadow-color))', // subtle shadow
                                marginLeft: '10px',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        />

                        {unseenCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                background: '#e80a0d',
                                color: '#fff',
                                borderRadius: '50%',
                                fontSize: '0.75rem',
                                minWidth: '15px',
                                height: '15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                zIndex: 2,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            }}>
            {unseenCount}
        </span>
                        )}
                    </button>



                    {/* Dropdown */}
                    {notifDropdownOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '38px',
                                right: 0,
                                minWidth: '320px',
                                background: 'var(--modal-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '5%',
                                boxShadow: '0 12px 24px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.15)', // stronger dropdown depth
                                zIndex: 100,
                                padding: '0.5rem 0',
                                transition: 'transform 0.2s, opacity 0.2s',
                                transform: 'translateY(0)',
                                opacity: 1,
                            }}
                            onMouseEnter={() => setNotifDropdownHover(true)}
                            onMouseLeave={() => { setNotifDropdownHover(false); setNotifDropdownOpen(false); }}
                        >
                            <div style={{ padding: '0.5rem 1rem', fontWeight: 600, color: 'var(--primary-color)' }}>Notifications</div>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '0.75rem 1rem', color: '#888' }}>No new notifications.</div>
                            ) : (
                                notifications.slice(0, 5).map(n => (
                                    <div key={n.id} style={{
                                        padding: '0.5rem 1rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        background: n.seen ? 'transparent' : 'rgba(0,170,255,0.08)',
                                        //  color: n.seen ? 'var(--text-color)' : '#103784',
                                        fontWeight: n.seen ? 400 : 600,
                                        cursor: 'pointer',
                                        boxShadow: n.seen ? 'none' : '0 1px 6px rgba(0,0,0,0.08)', // subtle depth for unread
                                        borderRadius: '0%',
                                        marginBottom: '2px',
                                        transition: 'background 0.2s, transform 0.2s',
                                    }}
                                         onClick={() => {
                                             setNotifDropdownOpen(false);
                                             navigate('/notifications');
                                         }}
                                         onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                                         onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                                    >
                                        <div style={{ fontSize: '1rem', fontWeight: "bold" }}>{n.title}</div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{n.subject}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2, paddingLeft: "170px"}}>{getRelativeTime(n.createdAt)}</div>
                                    </div>
                                ))
                            )}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem 1rem' }}>
                                <button className="btn btn-cancel" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }} onClick={handleClearNotifications}>Clear</button>
                            </div>
                        </div>
                    )}
                </div>



                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    style={{
                        width: "50px",
                        height: "30px",
                        borderRadius: "20px",
                        border: "none",
                        background: theme === "light" ? "#f0faff" : "#002b36",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: theme === "light" ? "flex-start" : "flex-end",
                        padding: "2px",
                        marginLeft: "50px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                    }}
                >
                    <div
                        style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: theme === "light" ? "#ffcc00" : "#00aaff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "12px",
                        }}
                    >
                        {theme === "light" ? <FaMoon /> : <FaSun />}
                    </div>
                </button>

                {/* User Profile */}
                <div
                    onClick={handleProfileClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '50px',

                        cursor: 'pointer',
                        /* Fixed width button */
                        width: '60px',     /* adjust as needed */
                        justifyContent: 'center', /* keep text/icon centered */
                        flex: '0 0 auto',   /* prevent flex-grow/shrink */

                    }}
                >
                    {profilePic ? (
                        <img
                            src={profilePic}
                            alt="Profile"
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '2px solid var(--primary-color)'
                            }}
                        />
                    ) : (
                        <FaUserCircle size={40} color="var(--primary-color)" />
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                        <span style={{ opacity: 0.8 }}></span>
                    </div>
                </div>

                {/* Logout */}

            </div>
        </header>
    );
};

export default Topbar;
