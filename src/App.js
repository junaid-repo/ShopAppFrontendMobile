// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/MainLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfig } from "./pages/ConfigProvider";

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

    // 🔹 Initialize theme from localStorage or default to 'light'
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme || 'light';
    });

    // 🔹 Effect to apply theme + update <meta name="theme-color">
    useEffect(() => {
        document.body.classList.remove('dark-theme');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        localStorage.setItem('theme', theme);

        // Update browser UI (Chrome mobile, Android status bar, etc.)
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute(
                'content',
                theme === 'dark' ? '#0d1117' : '#f0f8ff' // hardcoded for now
            );
        }

        // iOS Safari status bar (limited options: default, black, black-translucent)
        let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (!appleStatusBar) {
            appleStatusBar = document.createElement('meta');
            appleStatusBar.name = "apple-mobile-web-app-status-bar-style";
            document.head.appendChild(appleStatusBar);
        }
        appleStatusBar.setAttribute(
            "content",
            theme === 'dark' ? "black" : "default"
        );
    }, [theme]);

    // 🔹 Function to toggle the theme
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const checkSession = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/shop/user/profile`,  {
                method: 'GET',
                credentials: 'include',
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

    const checkToken = () => {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            setIsAuthenticated(false);
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
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

    const handleLogin = () => {
        setIsAuthenticated(true);
        resetInactivityTimer();
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
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

    useEffect(() => {
        const resetEvents = ['mousemove', 'keydown', 'click'];
        const resetHandler = () => resetInactivityTimer();

        resetEvents.forEach(evt => window.addEventListener(evt, resetHandler));
        return () => resetEvents.forEach(evt => window.removeEventListener(evt, resetHandler));
    }, []);

    useEffect(() => {
        checkSession();
        window.addEventListener("storage", checkToken);
        return () => window.removeEventListener("storage", checkToken);
    }, []);

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
