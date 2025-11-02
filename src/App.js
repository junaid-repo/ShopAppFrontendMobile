import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import PaymentsPage from './pages/PaymentsPage';
import BillingPage from './pages/BillingPage';
// Removed BillingPage2 - Assuming it's desktop specific or replaced
import ReportsPage from './pages/ReportsPage';
import UserProfilePage from './pages/UserProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpPage from './pages/HelpPage';
import Notification from './pages/Notification';
import SettingsPage from './pages/SettingsPage'; // <-- ADDED
import ChatPage from './pages/ChatPage';       // <-- ADDED
// Removed AdminChatPage - Assuming mobile uses regular chat

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfig } from "./pages/ConfigProvider";
import { useSearchKey } from "./context/SearchKeyContext";
import { Toaster } from 'react-hot-toast'; // <-- ADDED
import { AlertProvider } from './context/AlertContext'; // <-- ADDED
import AlertDialog from './components/AlertDialog'; // <-- ADDED

const queryClient = new QueryClient();

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState(null); // Store basic user data
    const [isLoading, setIsLoading] = useState(true); // Added loading state
    const [warning, setWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const countdownRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const config = useConfig();
    const apiUrl = config?.API_URL || ""; // Use || for default

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        // If theme exists in localStorage, use it, otherwise default to 'light' for now
        return savedTheme || 'light';
    });

    // Default page state
    const [currentPage, setCurrentPage] = useState('dashboard');

    useEffect(() => {
        document.body.classList.remove('light-theme', 'dark-theme'); // Clear existing
        document.body.classList.add(theme === 'dark' ? 'dark-theme' : 'light-theme');
        localStorage.setItem('theme', theme);

        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            // Use more specific dark/light colors if available
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#10102a' : '#f0f8ff');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // --- UPDATED: Check session and fetch settings ---
    const checkSession = useCallback(async () => {
        setIsLoading(true);
        let initialAuth = false;
        let fetchedUserData = null;

        try {
            // 1. Check user session
            const sessionResponse = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: 'GET',
                credentials: 'include',
            });

            if (sessionResponse.ok) {
                fetchedUserData = await sessionResponse.json();
                console.log('User:', fetchedUserData?.username);
                setUserData(fetchedUserData);
                setIsAuthenticated(true);
                initialAuth = true; // Mark as initially authenticated for settings fetch
                handleUserActivity(); // Start/reset timer only on successful auth
            } else {
                if (sessionResponse.status === 401) {
                    console.log("Session check returned 401, user not authenticated.");
                } else {
                    console.error('Session check failed with status:', sessionResponse.status);
                }
                setIsAuthenticated(false);
                setUserData(null);
                clearTimers(); // Clear timers if session fails
            }
        } catch (error) {
            console.error('Error checking session:', error);
            setIsAuthenticated(false);
            setUserData(null);
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

                    // Apply theme default *only if* localStorage theme wasn't already set
                    const savedTheme = localStorage.getItem('theme');
                    if (!savedTheme && settingsData?.ui?.darkModeDefault) {
                        setTheme('dark');
                    } else if (!savedTheme) {
                        setTheme('light'); // Explicitly set light if no setting and no saved theme
                    }

                    // Apply default page *only if* current page is still the initial 'dashboard'
                    if (settingsData?.ui?.billingPageDefault && currentPage === 'dashboard') {
                        setCurrentPage('billing'); // Use 'billing', assuming 'billing2' is desktop only
                    }

                    // Save relevant settings to localStorage
                    localStorage.setItem('autoPrintInvoice', settingsData?.ui?.autoPrintInvoice || 'false');
                    localStorage.setItem('autoSendInvoice', settingsData?.billing?.autoSendInvoice || 'false');
                    localStorage.setItem('doParitalBilling', settingsData?.billing?.showPartialPaymentOption || 'true'); // Default to true?
                    localStorage.setItem('showRemarksOptions', settingsData?.billing?.showRemarksOnSummarySide || 'true'); // Default to true?
                    // Add other settings as needed

                } else {
                    console.warn("Could not fetch user settings. Using defaults.");
                    // Ensure defaults are set if fetch fails and no theme is saved
                    if (!localStorage.getItem('theme')) setTheme('light');
                }
            } catch (settingsError) {
                console.error('Error fetching user settings:', settingsError);
                if (!localStorage.getItem('theme')) setTheme('light'); // Ensure default on error
            }
        }
        setIsLoading(false); // Finish loading
    }, [apiUrl, currentPage]); // Added currentPage dependency for default page logic


    const handleLogin = () => {
        // After login, immediately check session and settings
        checkSession();
    };

    const handleLogout = async () => {
        try {
            await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) { console.error('Logout failed', e); }
        setIsAuthenticated(false);
        setUserData(null);
        setCurrentPage('dashboard'); // Reset page on logout
        clearTimers();
        setWarning(false);
        localStorage.removeItem('theme'); // Optional: clear theme on logout
        // Optionally clear other settings from localStorage if needed
        // localStorage.removeItem('autoPrintInvoice');
        // ...
    };

    // --- Inactivity Timer Logic (Kept Mobile's Simpler Version) ---
    const clearTimers = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        inactivityTimerRef.current = null;
        countdownRef.current = null;
    }, []); // No dependencies, safe to memoize


    const startInactivityWarning = useCallback(() => {
        clearTimers(); // Clear previous timers first
        inactivityTimerRef.current = setTimeout(() => {
            setWarning(true);
            let timeLeft = 60; // Mobile countdown duration
            setCountdown(timeLeft);

            countdownRef.current = setInterval(() => {
                timeLeft -= 1;
                setCountdown(timeLeft);
                if (timeLeft <= 0) {
                    clearTimers();
                    alert("Logged out due to inactivity."); // Use alert or AlertDialog
                    handleLogout(); // Trigger logout
                }
            }, 1000);
        }, 14 * 60 * 1000); // 14 minutes timeout
    }, [clearTimers]); // Include dependencies if handleLogout were used directly


    const handleUserActivity = useCallback(() => {
        if (!isAuthenticated) return; // Only run if logged in
        clearTimers(); // Clear both main timer and countdown (if active)
        setWarning(false); // Hide the warning
        startInactivityWarning(); // Restart the main timer
    }, [isAuthenticated, clearTimers, startInactivityWarning]); // Add dependencies

    // Effect 1: Check session on initial load
    useEffect(() => {
        checkSession();
    }, [checkSession]); // Run checkSession once on mount

    // Effect 2: Manage activity listeners
    useEffect(() => {
        if (isAuthenticated) {
            const resetEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
            resetEvents.forEach(evt => window.addEventListener(evt, handleUserActivity, { capture: true, passive: true }));
            handleUserActivity(); // Start timer immediately after auth confirmed

            return () => {
                resetEvents.forEach(evt => window.removeEventListener(evt, handleUserActivity, { capture: true }));
                clearTimers(); // Clear timers on logout/unmount
            };
        } else {
            clearTimers(); // Ensure timers cleared if not authenticated
        }
    }, [isAuthenticated, handleUserActivity, clearTimers]); // Rerun if auth status changes

    const { setSearchKey } = useSearchKey();

    // Clear search key when navigating away from relevant pages
    useEffect(() => {
        // Add other pages that use searchKey here if necessary
        if (!['customers', 'sales', 'products'].includes(currentPage)) {
            setSearchKey('');
        }
    }, [currentPage, setSearchKey]);

    // Define Pages
    const pages = {
        dashboard: <DashboardPage setCurrentPage={setCurrentPage} />,
        products: <ProductsPage />, // Removed setCurrentPage if not needed by component itself
        sales: <SalesPage />,
        customers: <CustomersPage />,
        payments: <PaymentsPage />,
        billing: <BillingPage />, // Removed setCurrentPage, context handles navigation
        reports: <ReportsPage />,
        profile: <UserProfilePage />,
        analytics: <AnalyticsPage />,
        terms: <TermsPage />,
        privacy: <PrivacyPage />,
        help: <HelpPage />,
        notifications: <Notification />,
        settings: <SettingsPage />, // <-- ADDED
        chat: <ChatPage />,       // <-- ADDED
    };

    if (isLoading) {
        // Optional: Add a more sophisticated loading screen later
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
    }

    return (
        <QueryClientProvider client={queryClient}>
            {/* --- WRAPPED WITH AlertProvider --- */}
            <AlertProvider>
                <AlertDialog /> {/* --- ADDED AlertDialog --- */}
                <Router>
                    <Routes>
                        <Route
                            path="/login"
                            element={
                                !isAuthenticated
                                    ? <LoginPage onLogin={handleLogin} />
                                    : <Navigate to="/" replace />
                            }
                        />
                        <Route
                            path="/*" // Handles all other paths including root "/"
                            element={
                                isAuthenticated
                                    ? <MainLayout
                                        onLogout={handleLogout}
                                        theme={theme}
                                        toggleTheme={toggleTheme}
                                        currentPage={currentPage}
                                        setCurrentPage={setCurrentPage}
                                        pages={pages}
                                        // Pass user data if MainLayout needs it (e.g., username for chat)
                                        username={userData?.username}
                                    />
                                    : <Navigate to="/login" replace />
                            }
                        />
                    </Routes>
                </Router>
                <Toaster position="top-center" toastOptions={{ duration: 2500 }} /> {/* --- ADDED Toaster --- */}
            </AlertProvider>
        </QueryClientProvider>
    );
}

export default App;