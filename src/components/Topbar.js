// src/components/Topbar.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Moon,
    Sun,
    UserCircle,
} from "@phosphor-icons/react";
import "./Topbar.css"; // Make sure this CSS file is imported
import { useConfig } from "../pages/ConfigProvider";

const Topbar = ({ onLogout, theme, toggleTheme, toggleSidebar, isCollapsed, setCurrentPage }) => {
    // --- State ---
    const [userName, setUserName] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unseenCount, setUnseenCount] = useState(0);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
    const [notifDropdownHover, setNotifDropdownHover] = useState(false); // Still needed for notif auto-close
    const notifDropdownRef = useRef(null);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef(null);
    const [isDark, setIsDark] = useState(() =>
        typeof document !== 'undefined' && document.body.classList.contains('dark-theme')
    );

    const navigate = useNavigate();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";

    // --- Effect to get Sidebar Toggle Color ---
    useEffect(() => {
        const update = () => {
            try { setIsDark(document.body.classList.contains('dark-theme')); } catch (e) {}
        };
        update();
        const obs = new MutationObserver(update);
        try {
            obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch (e) {}

        const storageHandler = (e) => {
            if (e.key === 'theme') update();
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            obs.disconnect();
            window.removeEventListener('storage', storageHandler);
        };
    }, []);

    const collapsedIconColor = isDark ? '#ffffff' : '#353aad' || '#00aaff';
    const toggleColor = collapsedIconColor;

    // --- Effect to Fetch User Profile ---
    useEffect(() => {
        (async () => {
            if (!apiUrl) return;
            try {
                const res = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    credentials: "include",
                });
                if (!res.ok) return;
                const data = await res.json();
                setUserName(data.username || "");

                if (!data.username) return;

                const picRes = await fetch(
                    `${apiUrl}/api/shop/user/${data.username}/profile-pic`,
                    { credentials: "include" }
                );
                if (picRes.ok) {
                    const blob = new Blob([await picRes.arrayBuffer()]);
                    setProfilePic(URL.createObjectURL(blob));
                }
            } catch (err) {
                console.error("Profile fetch failed", err);
            }
        })();
    }, [apiUrl]);

    // --- Effect to Fetch Notifications ---
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
        } catch (err) { /* Handle error silently */ }
    };

    useEffect(() => {
        fetchUnseenNotifications();
        const interval = setInterval(fetchUnseenNotifications, 30000);
        return () => clearInterval(interval);
    }, [apiUrl]);

    // --- Effect for Closing Dropdowns on Outside Click ---
    useEffect(() => {
        const handleClick = (e) => {
            // Close notification dropdown
            if (notifDropdownOpen && notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
                setNotifDropdownOpen(false);
            }
            // Close user dropdown
            if (isUserDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [notifDropdownOpen, isUserDropdownOpen]);


    // --- Handlers ---

    const handleLogout = async () => {
        if (!window.confirm("Do you really want to log out?")) return;
        onLogout();
        await fetch(`${apiUrl}/api/user/logout`, {
            method: "POST",
            credentials: "include",
        });
        localStorage.removeItem('theme');
        navigate("/login", { replace: true });
    };

    const handleNotifClick = () => {
        setNotifDropdownOpen(false);
        if (setCurrentPage) {
            setCurrentPage('notifications');
        } else {
            navigate('/notifications');
        }
    };

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

    const getRelativeTime = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    const goTo = (page) => {
        if (typeof setCurrentPage === 'function') {
            setCurrentPage(page);
        } else {
            navigate(`/${page}`);
        }
    };

    return (
        <header className="topbar">

            {/* --- TOPBAR LEFT (Toggle + Logo) --- */}
            <div className="topbar-left">
                <button
                    onClick={toggleSidebar}
                    aria-label="Toggle sidebar"
                    className="sidebar-toggle-btn"
                >
                    <div className="hamburger-icon-wrapper">
                        <span
                            className="hamburger-line"
                            style={{ background: toggleColor }}
                        />
                        <span
                            className="hamburger-line"
                            style={{ background: toggleColor }}
                        />
                        <span
                            className="hamburger-line"
                            style={{ background: toggleColor }}
                        />
                    </div>
                </button>

                <h1 className="logo" onClick={() => goTo('dashboard')}>
                    {isCollapsed ? '' : 'Clear Bill'}
                </h1>
            </div>

            {/* --- TOPBAR RIGHT (Icons + User Menu) --- */}
            <div className="topbar-right">
                {/* This container holds the icons */}
                <div className="topbar-buttons-container">
                    {/* 🔔 Notifications */}
                    <div
                        ref={notifDropdownRef}
                        className="topbar-icon-wrapper"
                        style={{position: 'relative'}}
                        onMouseEnter={() => setNotifDropdownOpen(true)}
                        onMouseLeave={() => setTimeout(() => {
                            if (!notifDropdownHover) setNotifDropdownOpen(false);
                        }, 600)}
                        onClick={handleNotifClick}
                    >
                        <Bell size={26} weight="duotone" />
                        {unseenCount > 0 && (
                            <span className="notification-badge">
                                {unseenCount > 9 ? '9+' : unseenCount}
                            </span>
                        )}
                        {notifDropdownOpen && (
                            <div
                                className="notification-dropdown"
                                onMouseEnter={() => setNotifDropdownHover(true)}
                                onMouseLeave={() => {
                                    setNotifDropdownHover(false);
                                    setNotifDropdownOpen(false);
                                }}
                            >
                                <div className="notification-dropdown-header">Notifications</div>
                                {notifications.length === 0 ? (
                                    <div className="notification-dropdown-empty">No new notifications.</div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <div key={n.id}
                                             className={`notification-dropdown-item ${!n.seen ? 'unread' : ''}`}
                                             onClick={(e) => {
                                                 e.stopPropagation();
                                                 handleNotifClick();
                                             }}
                                        >
                                            <div className="notification-title">{n.title}</div>
                                            <div className="notification-subject">{n.subject}</div>
                                            <div className="notification-time">{getRelativeTime(n.createdAt)}</div>
                                        </div>
                                    ))
                                )}
                                <div className="notification-dropdown-actions">
                                    <button className="btn btn-clear-notif" onClick={handleClearNotifications}>Clear</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 🌙 / ☀️ Theme Toggle */}
                    <div
                        className="topbar-icon-wrapper"
                        onClick={toggleTheme}
                    >
                        {theme === "light" ? (
                            <Moon size={26} weight="duotone" />
                        ) : (
                            <Sun size={26} weight="duotone" />
                        )}
                    </div>

                    {/* 👤 User Info Wrapper (CLICK-TO-OPEN) */}
                    <div
                        ref={userDropdownRef}
                        className="user-profile-wrapper"
                        style={{ position: 'relative' }}
                        // Hovers removed, only click is left
                    >
                        <div
                            className="user-profile-trigger"
                            onClick={() => setIsUserDropdownOpen(prev => !prev)}
                        >
                            {profilePic ? (
                                <img
                                    src={profilePic}
                                    alt="Profile"
                                    className="user-profile-pic"
                                />
                            ) : (
                                <UserCircle
                                    size={32} // Slightly smaller for mobile
                                    weight="duotone"
                                />
                            )}
                            {/* User name is hidden on mobile by default via CSS */}
                            <span className="user-profile-name">
                                {userName || "Guest"}
                            </span>
                        </div>

                        {isUserDropdownOpen && (
                            <div
                                className="user-dropdown"
                                // Hovers removed
                            >
                                <div
                                    className="user-dropdown-item"
                                    onClick={() => {
                                        setCurrentPage("profile");
                                        setIsUserDropdownOpen(false);
                                    }}
                                >
                                    <i className="fa-duotone fa-thin fa-user"></i>
                                    <span>Shop and Profile</span>
                                </div>

                                <div
                                    className="user-dropdown-item"
                                    onClick={() => {
                                        setCurrentPage("settings");
                                        setIsUserDropdownOpen(false);
                                    }}
                                >
                                    <i className="fa-duotone fa-regular fa-gear"></i>
                                    <span>Settings</span>
                                </div>

                                <div
                                    className="user-dropdown-item logout"
                                    onClick={() => {
                                        handleLogout();
                                        setIsUserDropdownOpen(false);
                                    }}
                                >
                                    <i className="fa-duotone fa-regular fa-right-from-bracket" style={{color:"#e80a0d"}}></i>
                                    <span>Logout</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;