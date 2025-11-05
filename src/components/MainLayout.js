import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
// --- ADDED ---
import { FaFileInvoice } from 'react-icons/fa'; // Import the billing icon

const MainLayout = ({ children, onLogout, toggleTheme, theme, currentPage, setCurrentPage, pages }) => {
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

            {/* --- REMOVED Floating hamburger to open/close sidebar --- */}
            {/* This button was removed because the Topbar now handles this */}


            {/* Sidebar (hidden by default, slides in when visible) */}
            <Sidebar
                onLogout={handleLogout}
                isCollapsed={isCollapsed}
                onToggleCollapse={toggleCollapse}
                visible={isSidebarVisible}
                onClose={() => setIsSidebarVisible(false)}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}// Pass navigation function
            />

            {/* Main content */}
            {/* Added styles to make main-content and main grow to fill space */}
            <div className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Topbar
                    onLogout={handleLogout}
                    toggleTheme={toggleTheme}
                    theme={theme}
                    isCollapsed={isCollapsed}
                    setCurrentPage={setCurrentPage}
                    toggleSidebar={toggleSidebarVisibility} /* --- ADDED THIS PROP --- */
                />
                <main style={{ flex: 1 }}>
                    {(pages && currentPage && pages[currentPage]) ? pages[currentPage] : children}
                </main>

                {/* --- Footer component removed --- */}

            </div>

            {/* --- ADDED: Floating Action Button for Billing --- */}
            <button
                onClick={() => setCurrentPage('billing')}
                title="Go to Billing"
                style={{
                    position: 'fixed',
                    bottom: '25px',
                    right: '25px',
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-color)', // Your app's primary color
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px', // Icon size
                    cursor: 'pointer',
                    zIndex: 99, // Below modals, above content
                    transition: 'transform 0.2s ease',
                }}
                // Simple hover effect
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <i className="fa-duotone fa-solid fa-plus" style={{fontSize: '20px'}}></i>
            </button>
            {/* --- END: Floating Action Button --- */}

        </div>
    );
};

export default MainLayout;
