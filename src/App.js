import React, { useState, useEffect, useRef } from 'react';
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfig } from "./pages/ConfigProvider";
import {useSearchKey} from "./context/SearchKeyContext";
const queryClient = new QueryClient();

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [warning, setWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const countdownRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const config = useConfig();
    let apiUrl = "";
    if (config) {
        apiUrl = config.API_URL;
    }

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    });

    useEffect(() => {
        // update body class
        document.body.classList.remove('dark-theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        localStorage.setItem('theme', theme);

        // 🔹 update theme-color meta tag
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            if (theme === 'dark') {
                metaThemeColor.setAttribute('content', '#04041b'); // hardcoded dark color
            } else {
                metaThemeColor.setAttribute('content', '#f0f8ffd9'); // hardcoded light color
            }
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // 🔹 New: Check session from backend instead of decoding local token
    const checkSession = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/shop/user/profile`,  {
                method: 'GET',
                credentials: 'include', // include the cookie
            });

            if (response.ok) {
                const data = await response.json();
                console.log('User:', data.username);
                setIsAuthenticated(true);
                resetInactivityTimer();
            } else {
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error('Error checking session:', error);
            setIsAuthenticated(false);
        }
    };

    const handleLogin = () => {
        setIsAuthenticated(true);
        resetInactivityTimer();
    };

    const handleLogout = async () => {
        try {
            await fetch(`${apiUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            console.error('Logout failed', e);
        }
        setIsAuthenticated(false);
        clearTimers();
    };

    const resetInactivityTimer = () => {
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
                    alert("You have been logged out due to inactivity.");
                    handleLogout();
                }
            }, 1000);
        }, 14 * 60 * 1000);
    };

    const clearTimers = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };
    const { searchKey, setSearchKey } = useSearchKey();

    useEffect(() => {
        const resetEvents = ['mousemove', 'keydown', 'click'];
        const resetHandler = () => resetInactivityTimer();

        resetEvents.forEach(evt => window.addEventListener(evt, resetHandler));
        return () => resetEvents.forEach(evt => window.removeEventListener(evt, resetHandler));
    }, []);

    useEffect(() => {
        checkSession();
    }, []);



    const [currentPage, setCurrentPage] = useState('dashboard');

    useEffect(() => {
        if (currentPage !== 'customers') {
            setSearchKey('');
        }
    }, [currentPage, setSearchKey]);

    const pages = {
        dashboard: <DashboardPage setCurrentPage={setCurrentPage} />,
        products: <ProductsPage setCurrentPage={setCurrentPage} />,
        sales: <SalesPage setCurrentPage={setCurrentPage} />,
        customers: <CustomersPage setCurrentPage={setCurrentPage} />,
        payments: <PaymentsPage setCurrentPage={setCurrentPage} />,
        billing: <BillingPage setCurrentPage={setCurrentPage} />,
        reports: <ReportsPage setCurrentPage={setCurrentPage} />,
        profile: <UserProfilePage setCurrentPage={setCurrentPage} />,
        analytics: <AnalyticsPage setCurrentPage={setCurrentPage} />,
        terms: <TermsPage setCurrentPage={setCurrentPage} />,
        privacy: <PrivacyPage setCurrentPage={setCurrentPage} />,
        help: <HelpPage setCurrentPage={setCurrentPage} />,
        notifications: <Notification  setCurrentPage={setCurrentPage} />,
    };

    return (
        <QueryClientProvider client={queryClient}>
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
                        path="/*"
                        element={
                            isAuthenticated
                                ? <MainLayout
                                    onLogout={handleLogout}
                                    theme={theme}
                                    toggleTheme={toggleTheme}
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                    pages={pages}
                                />
                                : <Navigate to="/login" replace />
                        }
                    />
                </Routes>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
