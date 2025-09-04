// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

// ✅ Import Material Design Icons (from MUI)
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';

import './Sidebar.css';

// 🎨 Assign static colors for each icon
const iconColors = {
  dashboard: "#FF6B6B",   // red
  products: "#4ECDC4",    // teal
  sales: "#45B7D1",       // blue
  billing: "#FFA600",     // orange
  customers: "#9B5DE5",   // purple
  payments: "#06D6A0",    // green
  reports: "#FFD93D",     // yellow
  analytics: "#F15BB5"    // pink
};

// NOTE: changed props: isCollapsed, onToggleCollapse, visible, onClose
const Sidebar = ({ isCollapsed = false, onToggleCollapse = () => {}, visible = false, onClose = () => {} }) => {
    const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.body.classList.contains('dark-theme'));
    const [primaryColor, setPrimaryColor] = useState(() => {
        try {
            const val = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
            return val ? val.trim() : '#00aaff';
        } catch (e) {
            return '#00aaff';
        }
    });

    useEffect(() => {
        // updater reads current body class and css var
        const update = () => {
            try {
                setIsDark(document.body.classList.contains('dark-theme'));
            } catch (e) {}
            try {
                const val = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
                if (val) setPrimaryColor(val.trim());
            } catch (e) {}
        };

        update();

        // observe body class changes
        const obs = new MutationObserver(update);
        try {
            obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch (e) {}

        // also listen to storage (theme saved in localStorage by App)
        const storageHandler = (e) => {
            if (e.key === 'theme' || e.key === 'sidebar_collapsed') update();
        };
        window.addEventListener('storage', storageHandler);

        return () => {
            obs.disconnect();
            window.removeEventListener('storage', storageHandler);
        };
    }, []);

    // color to use for icons when sidebar is collapsed: primary in light, white in dark
    const collapsedIconColor = isDark ? '#ffffff' : primaryColor || '#00aaff';
    const toggleColor = collapsedIconColor;

    // Do not render nothing; sidebar will be off-canvas unless `visible` is true. We still render the element for accessibility and animations.
    return (
        <>
            {/* overlay shown when sidebar is visible */}
            <div className={`sidebar-overlay ${visible ? 'visible' : ''}`} onClick={onClose} aria-hidden={visible ? 'false' : 'true'} />

            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${visible ? 'visible' : 'hidden'}`} aria-hidden={!visible}>

                <nav className="sidebar-nav">

                    <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {({ isActive }) => (
                            <>
                                <DashboardIcon style={{ color: isDark ? '#ffffff' : (isCollapsed ? (isActive ? '#ffffff' : collapsedIconColor) : iconColors.dashboard) }} />
                                <span className="nav-text">Dashboard</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/products" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {({ isActive }) => (
                            <>
                                <Inventory2Icon style={{ color: isDark ? '#ffffff' : (isCollapsed ? (isActive ? '#ffffff' : collapsedIconColor) : iconColors.products) }} />
                                <span className="nav-text">Products</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/sales" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {({ isActive }) => (
                            <>
                                <ShoppingCartIcon style={{ color: isDark ? '#ffffff' : (isCollapsed ? (isActive ? '#ffffff' : collapsedIconColor) : iconColors.sales) }} />
                                <span className="nav-text">Sales</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/billing" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {({ isActive }) => (
                            <>
                                <ReceiptIcon style={{ color: isDark ? '#ffffff' : (isCollapsed ? (isActive ? '#ffffff' : collapsedIconColor) : iconColors.billing) }} />
                                <span className="nav-text">Billing</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/customers" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {({ isActive }) => (
                            <>
                                <PeopleIcon style={{ color: isDark ? '#ffffff' : (isCollapsed ? (isActive ? '#ffffff' : collapsedIconColor) : iconColors.customers) }} />
                                <span className="nav-text">Customers</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/payments" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {({ isActive }) => (
                            <>
                                <CreditCardIcon style={{ color: isDark ? '#ffffff' : (isCollapsed ? (isActive ? '#ffffff' : collapsedIconColor) : iconColors.payments) }} />
                                <span className="nav-text">Payments</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {({ isActive }) => (
                            <>
                                <TableChartIcon style={{ color: isDark ? '#ffffff' : (isCollapsed ? (isActive ? '#ffffff' : collapsedIconColor) : iconColors.reports) }} />
                                <span className="nav-text">Reports</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink to="/analytics" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                        {({ isActive }) => (
                            <>
                                <BarChartIcon style={{ color: isDark ? '#ffffff' : (isCollapsed ? (isActive ? '#ffffff' : collapsedIconColor) : iconColors.analytics) }} />
                                <span className="nav-text">Analytics</span>
                            </>
                        )}
                    </NavLink>

                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
