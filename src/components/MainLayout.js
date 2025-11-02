import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
// import Footer from "./Footer"; // Removed Footer import

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
        </div>
    );
};

export default MainLayout;

