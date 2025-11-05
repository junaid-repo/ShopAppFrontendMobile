import React, { useState, useEffect, useRef, useCallback, useContext } from 'react'; // Added useCallback & useContext
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import PaymentsPage from './pages/PaymentsPage';
import BillingPage from './pages/BillingPage';
import ReportsPage from './pages/ReportsPage';
import UserProfilePage from './pages/UserProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpPage from './pages/HelpPage';
import Notification from './pages/Notification';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
// --- NEW IMPORTS ---
import SubscriptionPage from './pages/SubscriptionPage';
import PremiumGuard from './context/PremiumGuard';
import { PremiumProvider, usePremium } from './context/PremiumContext';
import { PremiumModalProvider } from './context/PremiumModalContext';
import PremiumModal from './components/PremiumModal';
// --- END NEW IMPORTS ---

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfig } from "./pages/ConfigProvider";
import { useSearchKey } from "./context/SearchKeyContext";
import { Toaster } from 'react-hot-toast';
import { AlertProvider } from './context/AlertContext';
import AlertDialog from './components/AlertDialog';

const queryClient = new QueryClient();

// --- NEW AppContent COMPONENT ---
// Contains all app logic, wrapped by providers
function AppContent() {
    const [user, setUser] = useState(null); // Replaced isAuthenticated & userData
    const [isLoading, setIsLoading] = useState(true);
    const [warning, setWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const countdownRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const config = useConfig();
    const apiUrl = config?.API_URL || "";

    // --- NEW: Get premium setter from context ---
    const { setIsPremium } = usePremium();

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    });

    const [currentPage, setCurrentPage] = useState('dashboard');

    useEffect(() => {
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
        localStorage.setItem('theme', theme);
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#10102a' : '#f0f8ff');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // --- UPDATED: checkSession to use new endpoint and set premium status ---
    const checkSession = useCallback(async () => {
        setIsLoading(true);
        let initialAuth = false;

        try {
            // 1. Check user session & role
            const sessionResponse = await fetch(`${apiUrl}/api/shop/user/profileWithRole`, {
                method: 'GET',
                credentials: 'include',
            });

            if (sessionResponse.ok) {
                const data = await sessionResponse.json();
                setUser(data); // Set user object
                initialAuth = true; // Mark as initially authenticated for settings fetch

                // Set premium status
                if (data.roles && data.roles.includes('ROLE_PREMIUM')) {
                    setIsPremium(true);
                } else {
                    setIsPremium(false);
                }

                handleUserActivity(); // Start/reset timer

            } else {
                setUser(null);
                setIsPremium(false);
                clearTimers(); // Clear timers if session fails
            }
        } catch (error) {
            console.error('Error checking session:', error);
            setUser(null);
            setIsPremium(false);
            clearTimers(); // Clear timers on error
        }

        // 2. Fetch settings ONLY if initially authenticated
        if (initialAuth) {
            try {
                const settingsResponse = await fetch(`${apiUrl}/api/shop/get/user/settings`, {
                    method: 'GET',
                    credentials: 'include',
                });

                if (settingsResponse.ok) {
                    const settingsData = await settingsResponse.json();
                    console.log("Fetched User Settings:", settingsData);

                    const savedTheme = localStorage.getItem('theme');
                    if (!savedTheme && settingsData?.ui?.darkModeDefault) {
                        setTheme('dark');
                    } else if (!savedTheme) {
                        setTheme('light');
                    }

                    if (settingsData?.ui?.billingPageDefault && currentPage === 'dashboard') {
                        setCurrentPage('billing');
                    }

                    // Save settings to localStorage
                    localStorage.setItem('autoPrintInvoice', settingsData?.ui?.autoPrintInvoice || 'false');
                    localStorage.setItem('autoSendInvoice', settingsData?.billing?.autoSendInvoice || 'false');
                    localStorage.setItem('doParitalBilling', settingsData?.billing?.showPartialPaymentOption || 'true');
                    localStorage.setItem('showRemarksOptions', settingsData?.billing?.showRemarksOnSummarySide || 'true');

                } else {
                    console.warn("Could not fetch user settings. Using defaults.");
                    if (!localStorage.getItem('theme')) setTheme('light');
                }
            } catch (settingsError) {
                console.error('Error fetching user settings:', settingsError);
                if (!localStorage.getItem('theme')) setTheme('light');
            }
        }
        setIsLoading(false);
    }, [apiUrl, currentPage, setIsPremium]); // Added setIsPremium dependency


    const handleLogin = () => {
        checkSession();
    };

    // --- UPDATED: handleLogout to clear user and premium state ---
    const handleLogout = async () => {
        try {
            await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) { console.error('Logout failed', e); }
        setUser(null);
        setIsPremium(false);
        setCurrentPage('dashboard');
        clearTimers();
        setWarning(false);
        localStorage.removeItem('theme');
    };

    // --- Inactivity Timer Logic ---
    const clearTimers = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        inactivityTimerRef.current = null;
        countdownRef.current = null;
    }, []);

    const startInactivityWarning = useCallback(() => {
        clearTimers();
        inactivityTimerRef.current = setTimeout(() => {
            setWarning(true);
            let timeLeft = 60;
            setCountdown(timeLeft);
            countdownRef.current = setInterval(() => {
                timeLeft -= 1;
                setCountdown(timeLeft);
                if (timeLeft <= 0) {
                    clearTimers();
                    alert("Logged out due to inactivity.");
                    handleLogout(); // handleLogout is safe here
                }
            }, 1000);
        }, 14 * 60 * 1000);
    }, [clearTimers, handleLogout]); // Added handleLogout dependency

    // --- UPDATED: handleUserActivity to check for user ---
    const handleUserActivity = useCallback(() => {
        if (!user) return; // Only run if logged in
        clearTimers();
        setWarning(false);
        startInactivityWarning();
    }, [user, clearTimers, startInactivityWarning]); // Added user dependency

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    // --- UPDATED: useEffect to depend on user object ---
    useEffect(() => {
        if (user) {
            const resetEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            resetEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { capture: true, passive: true }));
            handleUserActivity(); // Start timer immediately

            return () => {
                resetEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity, { capture: true }));
                clearTimers();
            };
        } else {
            clearTimers();
        }
    }, [user, handleUserActivity, clearTimers]);

    const { setSearchKey } = useSearchKey();

    useEffect(() => {
        if (!['customers', 'sales', 'products'].includes(currentPage)) {
            setSearchKey('');
        }
    }, [currentPage, setSearchKey]);

    // --- UPDATED: pages object with Guards and new Subscription page ---
    const pages = {
        dashboard: <DashboardPage setCurrentPage={setCurrentPage} />,
        products: <ProductsPage />,
        sales: <SalesPage />,
        customers: <CustomersPage />,
        payments: <PaymentsPage />,
        billing: <BillingPage />,
        reports: <PremiumGuard><ReportsPage /></PremiumGuard>, // Guarded
        profile: <UserProfilePage setSelectedPage={setCurrentPage} />, // Passed prop
        analytics: <PremiumGuard><AnalyticsPage /></PremiumGuard>, // Guarded
        terms: <TermsPage />,
        privacy: <PrivacyPage />,
        help: <HelpPage />,
        notifications: <Notification />,
        settings: <SettingsPage />,
        chat: <ChatPage />,
        subscribe: <SubscriptionPage setSelectedPage={setCurrentPage} />, // NEW PAGE
    };

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
    }

    return (
        <AlertProvider>
            <AlertDialog />
            <Router>
                {/* --- NEW: Global Premium Modal --- */}
                <PremiumModal setSelectedPage={setCurrentPage} />

                <Routes>
                    <Route
                        path="/login"
                        element={
                            !user // Use user object for auth check
                                ? <LoginPage onLogin={handleLogin} />
                                : <Navigate to="/" replace />
                        }
                    />
                    <Route
                        path="/*"
                        element={
                            user // Use user object for auth check
                                ? <MainLayout
                                    onLogout={handleLogout}
                                    theme={theme}
                                    toggleTheme={toggleTheme}
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                    pages={pages}
                                    username={user?.username} // Pass username from user object
                                />
                                : <Navigate to="/login" replace />
                        }
                    />
                </Routes>
            </Router>
            <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
        </AlertProvider>
    );
}

// --- NEW: App component now just wraps providers ---
function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AlertProvider>
                <PremiumProvider>
                    <PremiumModalProvider>
                        <AppContent />
                    </PremiumModalProvider>
                </PremiumProvider>
            </AlertProvider>
        </QueryClientProvider>
    );
}

export default App;