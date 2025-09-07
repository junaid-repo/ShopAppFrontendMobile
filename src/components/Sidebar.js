// src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ✅ Import Material Design Icons (from MUI)
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import { FaUserCircle } from "react-icons/fa";

import './Sidebar.css';
import { FaSignOutAlt } from "react-icons/fa";

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
const Sidebar = ({ onLogout, theme, toggleTheme, isCollapsed = false, onToggleCollapse = () => {}, visible = false, onClose = () => {}, setCurrentPage }) => {
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.body.classList.contains('dark-theme'));
  const [primaryColor, setPrimaryColor] = useState(() => {
      try {
          const val = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
          return val ? val.trim() : '#00aaff';
      } catch (e) {
          return '#00aaff';
      }
  });
  const navigate = useNavigate();
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
  const handleLogout = () => {
      const confirmLogout = window.confirm("Do you really want to log out?");
      if (!confirmLogout) return;
      onLogout();
      navigate("/login", { replace: true });
  };

  // color to use for icons when sidebar is collapsed: primary in light, white in dark
  const collapsedIconColor = isDark ? '#ffffff' : primaryColor || '#00aaff';
  const toggleColor = collapsedIconColor;

  // Do not render nothing; sidebar will be off-canvas unless `visible` is true. We still render the element for accessibility and animations.
  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon style={{ color: iconColors.dashboard }} /> },
    { key: 'products', label: 'Products', icon: <Inventory2Icon style={{ color: iconColors.products }} /> },
    { key: 'sales', label: 'Sales', icon: <ShoppingCartIcon style={{ color: iconColors.sales }} /> },
    { key: 'customers', label: 'Customers', icon: <PeopleIcon style={{ color: iconColors.customers }} /> },
    { key: 'payments', label: 'Payments', icon: <CreditCardIcon style={{ color: iconColors.payments }} /> },
    { key: 'billing', label: 'Billing', icon: <ReceiptIcon style={{ color: iconColors.billing }} /> },
    { key: 'reports', label: 'Reports', icon: <TableChartIcon style={{ color: iconColors.reports }} /> },
    { key: 'analytics', label: 'Analytics', icon: <BarChartIcon style={{ color: iconColors.analytics }} /> },

];

  return (
      <>
          {/* overlay shown when sidebar is visible */}
          <div className={`sidebar-overlay ${visible ? 'visible' : ''}`} onClick={onClose}
               aria-hidden={visible ? 'false' : 'true'}/>

          <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${visible ? 'visible' : 'hidden'}`}
                 aria-hidden={!visible}>

              <nav className="sidebar-nav">
                  {menuItems.map(item => (
                      <button
                          key={item.key}
                          className="sidebar-link"
                          onClick={() => { setCurrentPage(item.key); if (visible) onClose(); }}
                          style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '10px', cursor: 'pointer' }}
                      >
                          {item.icon}
                          <span style={{ marginLeft: 8 }}>{item.label}</span>
                      </button>
                  ))}
              </nav>
              <div style={{padding: '1rem', textAlign: 'center'}}>
                  <button
                      onClick={handleLogout}
                      style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          background: "#e80a0d",
                          padding: "8px 12px",
                          fontSize: "0.75rem",
                          borderRadius: "20px",
                          cursor: "pointer",
                          boxShadow: "0 5px 5px rgba(255, 107, 107, 0.3)",
                          color: '#fff'
                      }}
                  >
                      <FaSignOutAlt style={{fontSize: "0.8rem"}}/>
                      Logout
                  </button>
              </div>
          </aside>
      </>
  );
};

export default Sidebar;
