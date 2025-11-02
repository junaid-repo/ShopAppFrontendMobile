// src/pages/SettingsPage.jsx

import React, { useState, useEffect } from 'react';
import { useConfig } from "./ConfigProvider";
import { useAlert } from '../context/AlertContext';
import toast, { Toaster } from 'react-hot-toast';
import './SettingsPage.css'; // Main settings styles
import './InvoiceTemplates.css'; // Styles for template grid/modal
import './UserProfilePage.css'; // Styles for password modal

// --- Helper: Define Tabs ---
// We'll use this array to generate the navigation
const settingTabs = [
    { key: 'templates', label: 'Templates', icon: 'fa-duotone fa-solid fa-ballot-check' },
    { key: 'invoice', label: 'Invoice', icon: 'fa-duotone fa-solid fa-file-invoice' },
    { key: 'ui', label: 'UI', icon: 'fa-duotone fa-solid fa-paint-roller' },
    { key: 'billing', label: 'Billing', icon: 'fa-duotone fa-solid fa-calculator' },
    { key: 'schedulers', label: 'Schedulers', icon: 'fa-duotone fa-solid fa-stopwatch' },
    { key: 'account', label: 'Account', icon: 'fa-duotone fa-solid fa-user-tie' },
];

const SettingsPage = () => {
    const { showAlert } = useAlert();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || "";

    // --- State ---
    const [activeTab, setActiveTab] = useState('templates'); // Default tab
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    // UI Settings
    const [uiSettings, setUiSettings] = useState({ darkModeDefault: false, billingPageDefault: false, autoPrintInvoice: false });
    const [originalUiSettings, setOriginalUiSettings] = useState({});
    const isUiDirty = JSON.stringify(uiSettings) !== JSON.stringify(originalUiSettings);

    // Scheduler Settings
    const [schedulerSettings, setSchedulerSettings] = useState({
        lowStockAlerts: true, autoDeleteNotificationsDays: 30,
        autoDeleteCustomers: { enabled: false, minSpent: 100, inactiveDays: 90 },
    });
    const [originalSchedulerSettings, setOriginalSchedulerSettings] = useState({});
    const isSchedulersDirty = JSON.stringify(schedulerSettings) !== JSON.stringify(originalSchedulerSettings);

    // Billing Settings
    const [billingSettings, setBillingSettings] = useState({
        autoSendInvoice: false, allowNoStockBilling: false, hideNoStockProducts: false,
        serialNumberPattern: '', showPartialPaymentOption: true, showRemarksOnSummarySide: true,
    });
    const [originalBillingSettings, setOriginalBillingSettings] = useState({});
    const isBillingDirty = JSON.stringify(billingSettings) !== JSON.stringify(originalBillingSettings);

    // Invoice Settings
    const [invoiceSettings, setInvoiceSettings] = useState({
        addDueDate: false, combineAddresses: false, showPaymentStatus: false, removeTerms: false,
        showCustomerGstin: false, showTotalDiscountPercentage: false, showIndividualDiscountPercentage:false,
        showShopPanOnInvoice: true, showSupportInfoOnInvoice: true, showRateColumn: true, showHsnColumn: true,
    });
    const [originalInvoiceSettings, setOriginalInvoiceSettings] = useState({});
    const isInvoiceDirty = JSON.stringify(invoiceSettings) !== JSON.stringify(originalInvoiceSettings);

    // Invoice Templates
    const invoiceTemplates = [
        { name: 'gstinvoiceskyblue', displayName: 'Modern Blue', imageUrl: '/invoiceTemplates/Screenshot_20251019_235059.png' },
        { name: 'gstinvoiceLightGreen', displayName: 'Elegant Green', imageUrl: '/invoiceTemplates/Screenshot_20251019_235119.png' },
        { name: 'gstinvoiceGreen', displayName: 'Simple Green', imageUrl: '/invoiceTemplates/Screenshot_20251019_235133.png' },
        { name: 'gstinvoiceBlue', displayName: 'Simple Blue', imageUrl: '/invoiceTemplates/Screenshot_20251019_235150.png' },
        { name: 'gstinvoiceOrange', displayName: 'Classic Orange', imageUrl: '/invoiceTemplates/Screenshot_20251019_235203.png' },
        { name: 'gstinvoice', displayName: 'Best Purple', imageUrl: '/invoiceTemplates/Screenshot_20251019_235220.png' },
    ];
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTemplate, setModalTemplate] = useState(null);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchSettings = async () => { /* ... same as desktop ... */
            if (!apiUrl) return;
            try {
                const response = await fetch(`${apiUrl}/api/shop/get/user/settings`, { credentials: 'include' });
                if (!response.ok) throw new Error("Could not load settings");
                const data = await response.json();
                setUiSettings(data.ui || {}); setOriginalUiSettings(data.ui || {});
                setSchedulerSettings(data.schedulers || {}); setOriginalSchedulerSettings(data.schedulers || {});
                setBillingSettings(data.billing || {}); setOriginalBillingSettings(data.billing || {});
                setInvoiceSettings(data.invoice || {}); setOriginalInvoiceSettings(data.invoice || {});
            } catch (error) { console.error("Failed to fetch settings:", error); showAlert("Could not load general settings."); }
        };
        const fetchSelectedTemplate = async () => { /* ... same as desktop ... */
            if (!apiUrl) return;
            try {
                const response = await fetch(`${apiUrl}/api/shop/user/get/user/invoiceTemplate`, { method: 'GET', credentials: 'include' });
                if (response.ok) { const data = await response.json(); setSelectedTemplate(data.selectedTemplateName || ''); }
                else { console.warn("Failed to fetch selected template:", response.status); setSelectedTemplate(''); }
            } catch (error) { console.error("Error fetching selected template:", error); setSelectedTemplate(''); }
        };
        fetchSettings();
        fetchSelectedTemplate();
    }, [apiUrl, showAlert]);

    // --- Handlers ---
    const handlePasswordSubmit = async () => { /* ... same as desktop ... */
        if (passwordStep === 1) {
            try {
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, { method: "GET", credentials: 'include' });
                if (!userRes.ok) throw new Error("Could not fetch user profile.");
                const { username } = await userRes.json();
                const response = await fetch(`${authApiUrl}/auth/authenticate`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password: passwordData.currentPassword }),
                });
                if (!response.ok) { showAlert("Invalid current password."); return; }
                setPasswordStep(2);
            } catch (error) { console.error("Error validating password:", error); showAlert("Error validating password."); }
        } else {
            if (passwordData.newPassword !== passwordData.confirmPassword) { showAlert("Passwords do not match."); return; }
            if (passwordData.newPassword.length < 4) { showAlert("Password too short."); return; }
            try {
                const response = await fetch(`${apiUrl}/api/shop/user/updatepassword`, {
                    method: "POST", credentials: 'include', headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: passwordData.newPassword }),
                });
                if (!response.ok) throw new Error("Failed to update password.");
                toast.success("Password updated!");
                setShowPasswordModal(false); setPasswordStep(1); setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } catch (error) { console.error("Error updating password:", error); showAlert("Error updating password."); }
        }
    };

    const createSaveHandler = (endpoint, settings, setOriginalSettings, settingsName) => async () => { /* ... same as desktop ... */
        try {
            const response = await fetch(`${apiUrl}/api/shop/settings/user/save/${endpoint}`, {
                method: "PUT", credentials: 'include', headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (!response.ok) throw new Error("Server error");
            toast.success(`${settingsName} settings saved!`);
            setOriginalSettings(settings); // Update original settings on successful save
            // Apply UI settings immediately if needed
            if (settingsName === 'UI') {
                localStorage.setItem('theme', settings.darkModeDefault ? 'dark' : 'light');
                document.body.classList.toggle('dark-theme', settings.darkModeDefault);
                localStorage.setItem('billingPageDefault', settings.billingPageDefault);
                localStorage.setItem('autoPrintInvoice', settings.autoPrintInvoice);
            }
            if (settingsName === 'Billing') {
                localStorage.setItem('autoSendInvoice', settings.autoSendInvoice);
                localStorage.setItem('allowNoStockBilling', settings.allowNoStockBilling);
                localStorage.setItem('hideNoStockProducts', settings.hideNoStockProducts);
                localStorage.setItem('serialNumberPattern', settings.serialNumberPattern);
                localStorage.setItem('doParitalBilling', settings.showPartialPaymentOption);
                localStorage.setItem('showRemarksOptions', settings.showRemarksOnSummarySide);
            }
        } catch (error) { console.error(`Error saving ${settingsName}:`, error); showAlert(`Failed to save ${settingsName}.`); }
    };

    const handleSaveUiSettings = createSaveHandler('ui', uiSettings, setOriginalUiSettings, 'UI');
    const handleSaveSchedulers = createSaveHandler('scheduler', schedulerSettings, setOriginalSchedulerSettings, 'Scheduler');
    const handleSaveBillingSettings = createSaveHandler('billing', billingSettings, setOriginalBillingSettings, 'Billing');
    const handleSaveInvoiceSettings = createSaveHandler('invoice', invoiceSettings, setOriginalInvoiceSettings, 'Invoice');

    const handleSelectTemplate = async (templateName, displayName) => { /* ... same as desktop ... */
        if (!apiUrl) { toast.error("API config missing."); return; }
        try {
            const response = await fetch(`${apiUrl}/api/shop/user/save/user/invoiceTemplate`, {
                method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedTemplateName: templateName }),
            });
            if (response.ok) { setSelectedTemplate(templateName); toast.success(`"${displayName}" selected!`); setModalOpen(false); }
            else { toast.error(`Failed: ${response.statusText}`); }
        } catch (error) { console.error("Error selecting template:", error); toast.error("Error saving selection."); }
    };
    const openTemplateModal = (template) => { setModalTemplate(template); setModalOpen(true); };
    const closeTemplateModal = () => { setModalOpen(false); setModalTemplate(null); };

    // --- Render Helper: Toggle Switch ---
    const ToggleSwitch = ({ checked, onChange }) => ( /* ... same as desktop ... */
        <label className="switch">
            <input type="checkbox" checked={checked} onChange={onChange} />
            <span className="slider round"></span>
        </label>
    );

    // --- Main Render (Mobile Layout) ---
    return (
        <div className="settings-page">
            <Toaster position="top-center" />

            <h1>Settings</h1>
            <p className="info-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                * Logout and re-login for settings to take effect
            </p>

            {/* ====== NEW MOBILE LAYOUT ====== */}
            <div className="settings-layout">

                {/* --- Vertical Tab Navigation --- */}
                <nav className="settings-sidebar-nav">
                    {settingTabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-btn-vertical ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <i className={tab.icon}></i>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {/* --- Main Content Area --- */}
                <div className="settings-main-content">
                    {/* Wrap content in a glass card */}
                    <div className="glass-card settings-content-card">

                        {/* ====== TAB CONTENT AREA (Conditional Rendering) ====== */}

                        {/* --- INVOICE TEMPLATES TAB PANE --- */}
                        {activeTab === 'templates' && (
                            <div className="tab-pane invoice-templates-tab">
                                <h3>Select Invoice Template</h3>
                                <p>Choose the design for generated invoices.</p>
                                <div className="template-grid mobile"> {/* Add mobile class */}
                                    {invoiceTemplates.map((template) => (
                                        <div key={template.name} className={`template-card ${selectedTemplate === template.name ? 'selected' : ''}`}>
                                            <img src={template.imageUrl} alt={template.displayName} onClick={() => openTemplateModal(template)} className="template-image"/>
                                            <div className="template-info">
                                                <span className="template-name">{template.displayName}</span>
                                                <button className="btn small-btn select-btn" onClick={() => handleSelectTemplate(template.name, template.displayName)} disabled={selectedTemplate === template.name}>
                                                    {selectedTemplate === template.name ? 'Selected' : 'Select'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- ACCOUNT TAB PANE --- */}
                        {activeTab === 'account' && (
                            <div className="tab-pane">
                                <h3>Account</h3>
                                <div className="setting-row">
                                    <span>Update Password</span>
                                    <button className="btn" onClick={() => setShowPasswordModal(true)}>Change</button>
                                </div>
                                {/* Add other account settings if needed */}
                            </div>
                        )}

                        {/* --- UI TAB PANE --- */}
                        {activeTab === 'ui' && (
                            <div className="tab-pane">
                                <h3>UI Settings</h3>
                                <div className="setting-item">
                                    <div className="setting-toggle">
                                        <ToggleSwitch checked={uiSettings.darkModeDefault} onChange={(e) => setUiSettings({ ...uiSettings, darkModeDefault: e.target.checked })}/>
                                        <label>Default to dark mode</label>
                                    </div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-toggle">
                                        <ToggleSwitch checked={uiSettings.billingPageDefault} onChange={(e) => setUiSettings({ ...uiSettings, billingPageDefault: e.target.checked })} />
                                        <label>Default to Billing Page</label>
                                    </div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-toggle">
                                        <ToggleSwitch checked={uiSettings.autoPrintInvoice} onChange={(e) => setUiSettings({ ...uiSettings, autoPrintInvoice: e.target.checked })} />
                                        <label>Auto-print after payment</label>
                                    </div>
                                </div>
                                {isUiDirty && (<div className="save-button-container"><button className="btn" onClick={handleSaveUiSettings}>Save UI</button></div>)}
                            </div>
                        )}

                        {/* --- BILLING TAB PANE --- */}
                        {activeTab === 'billing' && (
                            <div className="tab-pane">
                                <h3>Billing Settings</h3>
                                <div className="setting-item">
                                    <div className="setting-toggle"><ToggleSwitch checked={billingSettings.autoSendInvoice} onChange={(e) => setBillingSettings({ ...billingSettings, autoSendInvoice: e.target.checked })}/><label>Auto-send invoice via email</label></div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-toggle"><ToggleSwitch checked={billingSettings.allowNoStockBilling} onChange={(e) => setBillingSettings({ ...billingSettings, allowNoStockBilling: e.target.checked })}/><label>Allow billing out-of-stock items</label></div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-toggle"><ToggleSwitch checked={billingSettings.hideNoStockProducts} onChange={(e) => setBillingSettings({ ...billingSettings, hideNoStockProducts: e.target.checked })}/><label>Hide out-of-stock from lists</label></div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-toggle"><ToggleSwitch checked={billingSettings.showPartialPaymentOption} onChange={(e) => setBillingSettings({ ...billingSettings, showPartialPaymentOption: e.target.checked })}/><label>Show Partial Payment option</label></div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-toggle"><ToggleSwitch checked={billingSettings.showRemarksOnSummarySide} onChange={(e) => setBillingSettings({ ...billingSettings, showRemarksOnSummarySide: e.target.checked })}/><label>Show Remarks option</label></div>
                                </div>
                                <div className="setting-item">
                                    <label>Serial number pattern (Max 5)</label>
                                    <div className="input-group">
                                        <input type="text" className="small-input" maxLength={5} value={billingSettings.serialNumberPattern || ''} onChange={(e) => setBillingSettings({ ...billingSettings, serialNumberPattern: e.target.value })}/>
                                    </div>
                                </div>
                                {isBillingDirty && (<div className="save-button-container"><button className="btn" onClick={handleSaveBillingSettings}>Save Billing</button></div>)}
                            </div>
                        )}

                        {/* --- INVOICE TAB PANE --- */}
                        {activeTab === 'invoice' && (
                            <div className="tab-pane">
                                <h3>Invoice Customization</h3>
                                <h5 className="setting-section-header">Header</h5>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showShopPanOnInvoice} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showShopPanOnInvoice: e.target.checked })}/><label>Show Shop PAN</label></div></div>

                                <h5 className="setting-section-header">Customer Details</h5>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.combineAddresses} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, combineAddresses: e.target.checked })}/><label>Combine Addresses as 'Bill To'</label></div></div>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showCustomerGstin} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showCustomerGstin: e.target.checked })}/><label>Show Customer GSTIN</label></div></div>

                                <h5 className="setting-section-header">Items List</h5>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showIndividualDiscountPercentage} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showIndividualDiscountPercentage: e.target.checked })}/><label>Show Item Discount %</label></div></div>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showHsnColumn} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showHsnColumn: e.target.checked })}/><label>Show HSN Column</label></div></div>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showRateColumn} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showRateColumn: e.target.checked })}/><label>Show Rate Column</label></div></div>

                                <h5 className="setting-section-header">Total Summary</h5>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showTotalDiscountPercentage} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showTotalDiscountPercentage: e.target.checked })}/><label>Show Total Discount %</label></div></div>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showPaymentStatus} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showPaymentStatus: e.target.checked })}/><label>Show Paid/Due Amounts</label></div></div>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.addDueDate} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, addDueDate: e.target.checked })}/><label>Show Due Date</label></div></div>

                                <h5 className="setting-section-header">Footer</h5>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.removeTerms} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, removeTerms: e.target.checked })}/><label>Hide Terms & Conditions</label></div></div>
                                <div className="setting-item"><div className="setting-toggle"><ToggleSwitch checked={invoiceSettings.showSupportInfoOnInvoice} onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showSupportInfoOnInvoice: e.target.checked })}/><label>Show Support Info</label></div></div>

                                {isInvoiceDirty && (<div className="save-button-container"><button className="btn" onClick={handleSaveInvoiceSettings}>Save Invoice</button></div>)}
                            </div>
                        )}

                        {/* --- SCHEDULERS TAB PANE --- */}
                        {activeTab === 'schedulers' && (
                            <div className="tab-pane">
                                <h3>Schedulers</h3>
                                <div className="setting-item">
                                    <div className="setting-toggle"><ToggleSwitch checked={schedulerSettings.lowStockAlerts} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, lowStockAlerts: e.target.checked })}/><label>Receive low stock alerts</label></div>
                                </div>
                                <div className="setting-item">
                                    <label>Auto-delete notifications after (days)</label>
                                    <div className="input-group">
                                        <input type="number" className="small-input" value={schedulerSettings.autoDeleteNotificationsDays || ''} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteNotificationsDays: Number(e.target.value) })}/>
                                    </div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-toggle">
                                        <ToggleSwitch checked={schedulerSettings.autoDeleteCustomers?.enabled} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteCustomers: { ...(schedulerSettings.autoDeleteCustomers || {}), enabled: e.target.checked }})}/>
                                        <label>Auto-delete inactive customers</label>
                                    </div>
                                    {schedulerSettings.autoDeleteCustomers?.enabled && (
                                        <div className="indented-controls">
                                            <label>Criteria:</label>
                                            <div className="input-group">
                                                <span>Spent &lt; ₹</span>
                                                <input type="number" className="small-input" value={schedulerSettings.autoDeleteCustomers.minSpent || ''} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, minSpent: Number(e.target.value) }})} />
                                            </div>
                                            <div className="input-group">
                                                <span>Inactive &gt;</span>
                                                <input type="number" className="small-input" value={schedulerSettings.autoDeleteCustomers.inactiveDays || ''} onChange={(e) => setSchedulerSettings({ ...schedulerSettings, autoDeleteCustomers: { ...schedulerSettings.autoDeleteCustomers, inactiveDays: Number(e.target.value) }})} />
                                                <span> days</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {isSchedulersDirty && (<div className="save-button-container"><button className="btn" onClick={handleSaveSchedulers}>Save Schedulers</button></div>)}
                            </div>
                        )}
                    </div> {/* End .settings-content-card */}
                </div> {/* End .settings-main-content */}
            </div> {/* End .settings-layout */}


            {/* ====== MODALS ====== */}
            {/* Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{passwordStep === 1 ? 'Current Password' : 'New Password'}</h2>
                            <button className="close-btn" onClick={() => setShowPasswordModal(false)}>&times;</button>
                        </div>
                        {passwordStep === 1 ? (
                            <div className="form-group"><label>Current Password</label><input type="password" value={passwordData.currentPassword} onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} /></div>
                        ) : (
                            <>
                                <div className="form-group"><label>New Password</label><input type="password" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} /></div>
                                <div className="form-group"><label>Confirm New Password</label><input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} /></div>
                            </>
                        )}
                        <div className="form-actions">
                            <button className="btn" onClick={handlePasswordSubmit}>{passwordStep === 1 ? 'Validate' : 'Update'}</button>
                            <button className="btn btn-outline" type="button" onClick={() => { setShowPasswordModal(false); setPasswordStep(1); }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Preview Modal */}
            {modalOpen && modalTemplate && (
                <div className="template-modal-overlay" onClick={closeTemplateModal}>
                    <div className="template-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={closeTemplateModal}>&times;</button>
                        <img src={modalTemplate.imageUrl} alt={modalTemplate.displayName} className="modal-image-full"/>
                        <h4>{modalTemplate.displayName}</h4>
                        <button className="btn select-btn-modal" onClick={() => handleSelectTemplate(modalTemplate.name, modalTemplate.displayName)} disabled={selectedTemplate === modalTemplate.name}>
                            {selectedTemplate === modalTemplate.name ? 'Selected' : 'Select This Template'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;