// src/components/Topbar.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaSignOutAlt, FaSun, FaMoon, FaHome } from 'react-icons/fa';
import { jwtDecode } from "jwt-decode";
import { useConfig } from "../pages/ConfigProvider";

const Topbar = ({ onLogout, theme, toggleTheme, toggleSidebar, isCollapsed }) => {
    const [userName, setUserName] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const navigate = useNavigate();
    const config = useConfig();
    let apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');

        (async () => {
            try {
                if (token) {
                    const decoded = jwtDecode(token);
                    const username = decoded.sub;
                    setUserName(username);

                    const res = await fetch(`${apiUrl}/api/shop/user/${username}/profile-pic`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            'Authorization': `Bearer ${token}`
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
                }
            } catch (err) {
                console.error('Failed to load profile pic', err);
            }
        })();
    }, [apiUrl]);

    const handleProfileClick = () => {
        navigate('/profile');
    };

    const handleLogout = () => {
        const confirmLogout = window.confirm("Do you really want to log out?");
        if (!confirmLogout) return;
        onLogout();
        navigate("/login", { replace: true });
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
                    onClick={() =>  navigate("/")}
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
                    ShopFlow
                </div>

            </div>

            {/* Controls */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "2px"
            }}>



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
