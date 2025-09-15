// src/pages/LoginPage.js
import React, { useState, useEffect  } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { useConfig } from "./ConfigProvider";

const LoginPage = ({ onLogin }) => {
    // Login
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    // Unified modal controller: null | 'forgot' | 'otp' | 'result'
    const [modal, setModal] = useState(null);

    // Forgot password flow
    const [forgotInput, setForgotInput] = useState('');
    const [forgotMessage, setForgotMessage] = useState('');
    const [forgotAttempts, setForgotAttempts] = useState(0); // limit 5 per session

    // OTP + reset flow
    const [otp, setOtp] = useState('');
    const [otpAttempts, setOtpAttempts] = useState(0); // limit 3 wrong tries
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Final result
    const [resultMessage, setResultMessage] = useState('');

    const navigate = useNavigate();
    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || "";
    const [resendTimer, setResendTimer] = useState(60);
    const [retryCount, setRetryCount] = useState(null);

// --- NEW STATES FOR REGISTER FLOW ---
    const [registerData, setRegisterData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });
    const [registerMessage, setRegisterMessage] = useState("");
    const [registeringUser, setRegisteringUser] = useState(null); // stores email/username after register

// --- HELPERS TO OPEN/CLOSE ---
    const openRegisterModal = () => {
        setRegisterData({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
        setRegisterMessage("");
        setModal("register");
    };
    const closeRegisterModal = () => {
        setModal(null);
        setRegisterMessage("");
    };

    // ⏱ Start timer + fetch retry count when registerOtp modal opens
    useEffect(() => {
        let interval;
        if (modal === "registerOtp") {
            setResendTimer(120); // reset to 60 seconds
            interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Fetch retry count from API
            const fetchRetry = async () => {
                try {
                    const res = await fetch(authApiUrl + `/auth/otp-retry-count?username=${registeringUser}`);
                    const data = await res.json();
                    setRetryCount(data.retryLeft ?? null);
                } catch (err) {
                    console.error("Retry count fetch error:", err);
                    setRetryCount(null);
                }
            };
            fetchRetry();
        }
        return () => clearInterval(interval);
    }, [modal, registeringUser, authApiUrl]);

// 🔄 Resend OTP handler
    const handleResendOtp = async () => {
        try {
            const res = await fetch(authApiUrl + "/auth/resend-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: registeringUser })
            });
            const data = await res.json();
            if (data.success) {
                setResendTimer(60); // restart timer
            } else {
                setResultMessage("❌ " + (data.message || "Failed to resend OTP"));
                openResultModal("❌ " + (data.message || "Failed to resend OTP"));
            }
        } catch (err) {
            openResultModal("❌ Error: " + err.message);
        }
    };

// --- HANDLE REGISTER API CALL ---
    const handleRegister = async () => {
        const { fullName, email, phone, password, confirmPassword } = registerData;
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            setRegisterMessage("❌ All fields are required");
            return;
        }
        if (password !== confirmPassword) {
            setRegisterMessage("❌ Passwords do not match");
            return;
        }
        //  alert(registerData)

        try {
            const res = await fetch(authApiUrl + "/auth/register/newuser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(registerData)
            });
            const data = await res.json();

            if (data.success) {
                setRegisterMessage("✅ Registration successful, please verify OTP");
                setRegisteringUser(data.username || email); // store username/email for OTP
                setModal(null);
                setOtp("");
                setModal("registerOtp"); // open OTP modal for register
            } else {
                setRegisterMessage("❌ " + (data.message || "Registration failed"));
            }
        } catch (err) {
            setRegisterMessage("❌ Error: " + err.message);
        }
    };

// --- HANDLE REGISTER OTP VERIFY ---
    const handleRegisterOtp = async () => {
        if (!otp || otp.length !== 6) {
            setResultMessage("❌ Enter valid 6-digit OTP");
            setIsSuccess(false);
            openResultModal("❌ Enter valid 6-digit OTP");
            return;
        }

        const payload = { username: registeringUser, otp };
        try {
            const res = await fetch(authApiUrl + "/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                setIsSuccess(true);
                openResultModal("✅ " + (data.message || "Registration complete! Your username is "||data.username ||" Please login with this username and password to use the system."));
            } else {
                setIsSuccess(false);
                openResultModal("❌ " + (data.message || "Invalid OTP"));
                // keep OTP modal open if failed
                setModal("registerOtp");
            }
        } catch (err) {
            openResultModal("❌ Error: " + err.message);
        }
    };

    // ---------- LOGIN ----------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(authApiUrl + "/auth/authenticate", {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!response.ok) throw new Error('Login failed');
            const token = await response.text();
            if (token) {
                // localStorage.setItem('jwt_token', token);
                onLogin(true);
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'An error occurred during login');
        }
    };

    // Helpers to open/close specific modals (ensures messages reset properly)
    const openForgotModal = () => {
        setForgotMessage('');
        setModal('forgot');
    };

    const closeForgotModal = () => {
        setForgotMessage('');
        setModal(null);
    };

    const openOtpModal = () => {
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpAttempts(0);
        setModal('otp');
    };

    const closeOtpModal = () => {
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpAttempts(0);
        setModal(null);
    };

    const openResultModal = (message) => {
        setResultMessage(message);
        setModal('result');
    };

    const closeResultModal = () => {
        setResultMessage('');
        setModal(null);
    };

    // ---------- FORGOT PASSWORD ----------
    const handleForgotPassword = async () => {
        if (!forgotInput) {
            setForgotMessage("❌ Please enter Email or UserId");
            return;
        }

        if (forgotAttempts >= 5) {
            setForgotMessage("❌ Too many attempts. Please try again later.");
            return;
        }

        setForgotAttempts(prev => prev + 1);

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotInput);
        const payload = {
            emailId: isEmail ? forgotInput : "",
            userId: !isEmail ? forgotInput : ""
        };

        try {
            const res = await fetch(authApiUrl + "/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.status) {
                // Move to OTP modal
                setForgotMessage("✅ OTP sent to your email address");
                setModal(null);          // ensure no overlap
                openOtpModal();          // now only OTP modal is open
            } else {
                setForgotMessage(`❌ ${data.message || "Invalid request"}`);
            }
        } catch (err) {
            setForgotMessage("❌ Error: " + err.message);
        }
    };

    // ---------- RESET PASSWORD ----------
    const handlePasswordReset = async () => {
        // basic checks
        if (!otp || !newPassword || !confirmPassword) {
            openResultModal("❌ All fields are required");
            return;
        }
        if (newPassword !== confirmPassword) {
            openResultModal("❌ Passwords do not match");
            return;
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotInput);
        const payload = {
            otp,
            newPassword,
            emailId: isEmail ? forgotInput : "",
            userId: !isEmail ? forgotInput : ""
        };

        try {
            const res = await fetch(authApiUrl + "/auth/update-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                // ✅ SUCCESS: close ALL other modals, only show final green message
                setResultMessage("✅ Password updated successfully");
                setIsSuccess(true);
                setForgotMessage('');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setOtpAttempts(0);

                // Make sure nothing else is open
                setModal(null);
                // Now open just the result modal
                openResultModal("✅ Password updated successfully");
            } else {
                // Wrong OTP or other failure
                setResultMessage("❌ " + (data.message || "Failed to update password"));
                setIsSuccess(false);
                const msg = "❌ " + (data.message || "Wrong OTP, try again");
                const nextAttempts = otpAttempts + 1;
                setOtpAttempts(nextAttempts);

                if (nextAttempts >= 3) {
                    // Close OTP modal and ask to resend
                    setModal(null);
                    openResultModal("❌ Too many wrong OTP attempts. Please resend OTP.");
                } else {
                    // Keep OTP modal open, show error in result modal
                    openResultModal(msg);
                }
            }
        } catch (err) {
            openResultModal("❌ Error: " + err.message);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box glass-card">
                <h1 className="login-logo">Clear Bill</h1>
                <h2>Admin Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" className="btn login-btn">Login</button>
                </form>

                {/* Forgot Password Button */}
                <div style={{ marginTop: "1rem" }}>
                    <button className="btn same-size-btn" onClick={openForgotModal}>
                        Forgot Password?
                    </button>
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                    <button className="btn same-size-btn" onClick={openRegisterModal}>
                        Register
                    </button>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {modal === 'forgot' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Forgot Password</h2>
                            <button className="close-btn" onClick={closeForgotModal}>×</button>
                        </div>
                        <div className="form-group">
                            <label>Enter Email or User ID</label>
                            <input
                                type="text"
                                value={forgotInput}
                                onChange={(e) => setForgotInput(e.target.value)}
                                placeholder="Email or UserId"
                            />
                        </div>
                        {forgotMessage && (
                            <p
                                className="error-message"
                                style={{
                                    color: forgotMessage.startsWith("✅") ? "green" : "red",
                                    marginTop: "0.25rem"
                                }}
                            >
                                {forgotMessage}
                            </p>
                        )}
                        <div className="form-actions">
                            <button className="btn" onClick={handleForgotPassword}>Send OTP</button>
                        </div>
                    </div>
                </div>
            )}

            {modal === "register" && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Register</h2>
                            <button className="close-btn" onClick={closeRegisterModal}>×</button>
                        </div>
                        <div className="form-group"><input type="text" placeholder="Full Name"
                                                           value={registerData.fullName}
                                                           onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                        /></div>
                        <div className="form-group"><input type="email" placeholder="Email"
                                                           value={registerData.email}
                                                           onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        /></div>
                        <div className="form-group"><input type="text" placeholder="Phone"
                                                           value={registerData.phone}
                                                           onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        /></div>
                        <div className="form-group"><input type="password" placeholder="Password"
                                                           value={registerData.password}
                                                           onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        /></div>
                        <div className="form-group"><input type="password" placeholder="Confirm Password"
                                                           value={registerData.confirmPassword}
                                                           onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        /></div>

                        {registerMessage && (
                            <p className="error-message" style={{ color: registerMessage.startsWith("✅") ? "green" : "red" }}>
                                {registerMessage}
                            </p>
                        )}
                        <div className="form-actions">
                            <button className="btn" onClick={handleRegister}>Register</button>
                        </div>
                    </div>
                </div>
            )}
            {modal === "registerOtp" && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Verify OTP</h2>
                            <button className="close-btn" onClick={() => setModal(null)}>×</button>
                        </div>

                        <div className="form-group">
                            <label>Enter OTP</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "0.5rem" }}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            />
                            {retryCount !== null && (
                                <small style={{ display: "block", marginTop: "0.5rem", color: "gray" }}>
                                    Retry attempts left: {retryCount}
                                </small>
                            )}
                        </div>

                        <div className="form-actions" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <button className="btn" onClick={handleRegisterOtp}>Submit</button>

                            <button
                                className="btn"
                                disabled={resendTimer > 0}
                                onClick={handleResendOtp}
                            >
                                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* OTP & Reset Modal */}
            {modal === 'otp' && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Reset Password</h2>
                            <button className="close-btn" onClick={closeOtpModal}>×</button>
                        </div>
                        <div className="form-group">
                            <label>Enter 6-digit OTP</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                style={{
                                    textAlign: "center",
                                    fontSize: "1.2rem",
                                    letterSpacing: "0.5rem"
                                }}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            />
                            <small style={{ opacity: 0.7 }}>
                                Attempts left: {Math.max(0, 3 - otpAttempts)}
                            </small>
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        <div className="form-actions">
                            <button className="btn" onClick={handlePasswordReset}>Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Modal (exclusive) */}
            {modal === 'result' && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ textAlign: "center" }}>
                        <h2 style={{ color: isSuccess ? "green" : "red" }}>
                            {resultMessage}
                        </h2>
                        <div className="form-actions" style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
                            {/* If too many wrong OTPs, offer a quick path to resend */}
                            {resultMessage.includes("Too many wrong OTP") && (
                                <button
                                    className="btn"
                                    onClick={() => {
                                        closeResultModal();
                                        openForgotModal();
                                    }}
                                >
                                    Resend OTP
                                </button>
                            )}
                            <button className="btn" onClick={closeResultModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
