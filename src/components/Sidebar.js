import React from 'react';
import './Sidebar.css'; // Ensure CSS is imported
import PremiumFeature from '../components/PremiumFeature';

const Sidebar = ({ visible = false, onClose = () => {}, setCurrentPage, currentPage }) => {

    const menuItems = [
        { key: 'dashboard', label: 'Dashboard', iconClass: 'fa-duotone fa-solid fa-gauge-simple-high' },
        { key: 'products', label: 'Products', iconClass: 'fa-duotone fa-solid fa-boxes-stacked' },
        { key: 'billing', label: 'Billing', iconClass: 'a-duotone fa-solid fa-file-invoice' },
        { key: 'sales', label: 'Sales', iconClass: 'fa-duotone fa-solid fa-cart-shopping' },
        { key: 'customers', label: 'Customers', iconClass: 'fa-duotone fa-regular fa-users' },
        { key: 'payments', label: 'Payments', iconClass: 'fa-duotone fa-solid fa-credit-card' },
        { key: 'reports', label: 'Reports', iconClass: 'ffa-duotone fa-solid fa-file-spreadsheet' },
        { key: 'analytics', label: 'Analytics', iconClass: 'a-duotone fa-solid fa-chart-mixed' }

    ];

    const handleNavigation = (pageKey) => {
        setCurrentPage(pageKey);
        if (visible) {
            onClose();
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`sidebar-overlay ${visible ? 'visible' : ''}`}
                onClick={onClose}
                aria-hidden={!visible}
            />

            {/* Sidebar */}
            <aside
                className={`sidebar ${visible ? 'visible' : 'hidden'}`}
                aria-hidden={!visible}
            >
                {/* Main Navigation - Make this scrollable */}
                <nav className="sidebar-nav">
                    {menuItems.map(item => {
                        // --- UPDATED LOGIC ---
                        // Check if the item is a premium feature
                        const isPremium = item.key === 'reports' || item.key === 'analytics';

                        // Create the button element first
                        const button = (
                            <button
                                // key is now on the outer element if premium
                                key={isPremium ? undefined : item.key}
                                className={`sidebar-link ${currentPage === item.key ? 'active' : ''}`}
                                onClick={() => handleNavigation(item.key)}
                                title={item.label}
                            >
                                <i className={item.iconClass} aria-hidden="true"></i>
                                <span className="nav-text">{item.label}</span>
                            </button>
                        );

                        // If it's premium, wrap the button. Otherwise, return the button directly.
                        if (isPremium) {
                            return (
                                <PremiumFeature key={item.key}>
                                    {button}
                                </PremiumFeature>
                            );
                        } else {
                            return button; // Return the button as-is
                        }
                        // --- END UPDATED LOGIC ---
                    })}
                </nav>

                {/* Footer Section - Positioned at the bottom */}
                <div className="sidebar-footer">
                    <button
                        className={`sidebar-link chat-support ${currentPage === 'chat' ? 'active' : ''}`}
                        onClick={() => handleNavigation('chat')}
                        title="Chat Support"
                    >
                        <i className="fa-duotone fa-solid fa-user-headset" aria-hidden="true"></i>
                        <span className="nav-text">Chat Support</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;

