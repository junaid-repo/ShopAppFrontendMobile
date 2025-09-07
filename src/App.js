// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [warning, setWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const countdownRef = useRef(null);
    const inactivityTimerRef = useRef(null);

    // 🔹 Initialize theme from localStorage or default to 'light'
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    });

    // 🔹 Effect to apply the theme class to the body and save preference
    useEffect(() => {
        document.body.classList.remove('dark-theme'); // Clean up previous class
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // 🔹 Function to toggle the theme
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // 🔹 Check token validity
    const checkToken = () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            setIsAuthenticated(false);
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1])); // decode JWT payload
            const expiry = payload.exp * 1000; // convert to ms
            if (Date.now() >= expiry) {
                alert("Session expired. You have been logged out.");
                handleLogout();
            } else {
                setIsAuthenticated(true);
            }
        } catch (e) {
            console.error("Invalid token:", e);
            handleLogout();
        }
    };

    // 🔹 Handle login
    const handleLogin = () => {
        setIsAuthenticated(true);
        resetInactivityTimer();
    };

    // 🔹 Handle logout
    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        setIsAuthenticated(false);
        clearTimers();
    };

    // 🔹 Inactivity Timers
    const resetInactivityTimer = () => {
        clearTimers();
        // Start inactivity timer (15 mins = 900000 ms)
        inactivityTimerRef.current = setTimeout(() => {
            setWarning(true); // show warning at 14 min
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
        }, 14 * 60 * 1000); // warning at 14 mins
    };

    const clearTimers = () => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    // 🔹 Track user activity
    useEffect(() => {
        const resetEvents = ['mousemove', 'keydown', 'click'];
        const resetHandler = () => resetInactivityTimer();

        resetEvents.forEach(evt => window.addEventListener(evt, resetHandler));
        return () => resetEvents.forEach(evt => window.removeEventListener(evt, resetHandler));
    }, []);

    // 🔹 Run checks on load + storage change
    useEffect(() => {
        checkToken();
        window.addEventListener("storage", checkToken);
        return () => window.removeEventListener("storage", checkToken);
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <Routes>
                    {/* Login route */}
                    <Route
                        path="/login"
                        element={
                            !isAuthenticated
                                ? <LoginPage onLogin={handleLogin} />
                                : <Navigate to="/" replace />
                        }
                    />
                    {/* Protected route: always at root, no subroutes */}
                    <Route
                        path="/"
                        element={
                            isAuthenticated
                                ? <MainLayout onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
                                : <Navigate to="/login" replace />
                        }
                    />
                </Routes>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
