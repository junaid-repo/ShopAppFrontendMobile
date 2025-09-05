// src/components/MainLayout.js
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const MainLayout = ({ children, onLogout, toggleTheme, theme }) => {
    const navigate = useNavigate();

    // sidebar collapsed state (persist in localStorage)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            const s = localStorage.getItem('sidebar_collapsed');
            return s === 'true';
        } catch (e) {
            return false;
        }
    });

    // NEW: sidebar visibility (hidden by default). Controls whether the sidebar is shown at all.
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebar_collapsed', String(next)); } catch (e) {}
            return next;
        });
    };

    const toggleSidebarVisibility = () => {
        setIsSidebarVisible(prev => !prev);
    };

    // sync with storage changes
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'sidebar_collapsed') {
                try { setIsCollapsed(e.newValue === 'true'); } catch (err) {}
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const handleLogout = () => {
        if (onLogout) {
            onLogout(); // clear token
        }
        navigate("/login"); // redirect to login page
    };

    return (
        <div className={`app-container ${isCollapsed ? 'collapsed' : ''} ${isSidebarVisible ? 'sidebar-open' : ''}`}
             style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

            {/* Floating hamburger to open/close sidebar (always visible) */}
            <button
                className="mobile-hamburger"
                onClick={toggleSidebarVisibility}
                aria-label={isSidebarVisible ? 'Close sidebar' : 'Open sidebar'}
                style={{
                    position: 'fixed',
                    top: 10,
                    left: 10,
                    zIndex: 1300,
                    marginTop: '1rem',
                    fontSize: '1.5rem',
                    background: 'transparent', // transparent background
                    color: 'var(--text-color)', // optional: set text/icon color
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 10px',
                    cursor: 'pointer'
                }}
            >
                ☰
            </button>


            {/* Sidebar (hidden by default, slides in when visible) */}
            <Sidebar
                onLogout={handleLogout}
                isCollapsed={isCollapsed}
                onToggleCollapse={toggleCollapse}
                visible={isSidebarVisible}
                onClose={() => setIsSidebarVisible(false)}
            />

            {/* Main content */}
            <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Topbar
                    onLogout={handleLogout}
                    toggleTheme={toggleTheme}
                    theme={theme}
                    isCollapsed={isCollapsed}
                />
                <main style={{ flex: 1, padding: '8px' }}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
