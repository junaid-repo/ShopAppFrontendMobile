// src/pages/LoginPage.js
import React, { useState, useEffect  } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { useConfig } from "./ConfigProvider";

import { GoogleLogin } from '@react-oauth/google';

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
    // new state for Google error feedback
    const [googleError, setGoogleError] = useState('');

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


    // --- New States for Policy Modal ---
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [policyContent, setPolicyContent] = useState({ title: '', content: '' });


    // --- Generic Policy Content ---
    const termsText = (
        <>
            <p className="font-bold mb-2">Last Updated: 19 September 2025</p>
            <p className="mb-4">Welcome to Clear Bill! These terms and conditions outline the rules and regulations for the use of our services.</p>
            <h3 className="text-lg font-bold mb-2">1. Acceptance of Terms</h3>
            <p className="mb-4">By accessing and using our service, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
            <h3 className="text-lg font-bold mb-2">2. User Accounts</h3>
            <p className="mb-4">You are responsible for safeguarding your account details, and you are responsible for all activities that occur under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>
            <h3 className="text-lg font-bold mb-2">3. Limitation of Liability</h3>
            <p>Our service is provided "as is." We do not warrant that the service will be uninterrupted, secure, or error-free. In no event shall Clear Bill be liable for any indirect, incidental, special, consequential or punitive damages.</p>
        </>
    );

    const privacyText = (
        <>
            <p className="font-bold mb-2">Last Updated: 19 September 2025</p>
            <p className="mb-4">Your privacy is important to us. It is Clear Bill's policy to respect your privacy regarding any information we may collect from you across our website.</p>
            <h3 className="text-lg font-bold mb-2">1. Information We Collect</h3>
            <p className="mb-4">We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
            <h3 className="text-lg font-bold mb-2">2. Use of Information</h3>
            <p className="mb-4">We use the information we collect to operate, maintain, and provide the features and functionality of the service, as well as to communicate directly with you, such as to send you email messages and push notifications.</p>
            <h3 className="text-lg font-bold mb-2">3. Data Security</h3>
            <p>We use commercially acceptable means to protect your Personal Information, but remember that no method of transmission over the internet, or method of electronic storage, is 100% secure and reliable.</p>
        </>
    );

    // --- Handlers for Policy Modal ---
    const openPolicyModal = (type) => {
        if (type === 'terms') {
            setPolicyContent({ title: 'Terms of Service', content: termsText });
        } else {
            setPolicyContent({ title: 'Privacy Policy', content: privacyText });
        }
        setShowPolicyModal(true);
    };

    const closePolicyModal = () => setShowPolicyModal(false);

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

    // ---------- GOOGLE LOGIN HANDLER -------------
    const handleGoogleSuccess = async (credentialResponse) => {
        // credentialResponse.credential contains the ID token from Google
        const idToken = credentialResponse?.credential;
        console.log("The returned token from google ", idToken);
        if (!idToken) {
            setGoogleError("Google did not return a credential/token");
            return;
        }
        try {
            // Optional: decode to show user info or debugging
            // const decoded = jwt_decode(idToken);
            // console.log("Google user decoded:", decoded);

            // Send to your backend to verify and/or create a user
            const resp = await fetch(authApiUrl + "/auth/new/google/user", {
                method: "POST",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                // backend verifies Google token, creates or finds user, returns your app's auth token or sets session
                onLogin(true);
                navigate('/');
            } else {
                // error from backend
                setGoogleError(data.message || "Google Login failed");
            }
        } catch (err) {
            setGoogleError("Google Login error: " + err.message);
        }
    };

    const handleGoogleError = () => {
        setGoogleError("Google Login was cancelled or failed");
    };

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

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const textResponse = await response.text();

            if (textResponse === "Please login using google login") {
                // treat this as an error even though status is 200
                setError(textResponse);
                return;
            }

            if (textResponse) {
                // localStorage.setItem('jwt_token', textResponse);
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
                <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group" >
                        <input
                            type="text"
                            placeholder="Username"
                            style={{borderRadius: "30px", maringLeft: '10px', width: "80%"}}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    {/* --- MODIFIED: Password Input with Forgot Password Link --- */}
                    <div className="input-group">
                        <input
                            type="password"
                            placeholder="Password"
                            style={{borderRadius: "30px", width: "80%"}}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <a
                            href="#"
                            onClick={openForgotModal}
                            className="forgot-password-link"
                            style={{
                                position: 'absolute',
                                right: '60px',
                                top: '50%',
                                transform: 'translateY(20%)',
                                fontSize: '0.8rem',
                                color: '#007bff',
                                textDecoration: 'none',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Forgot password?
                        </a>
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    {/* --- NEW: Terms and Policy Text --- */}
                    <div style={{ padding: '0 0px', margin: '1rem 0 0.5rem 0', marginTop: '60px', marginBottom: '20px', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: '#929db6' }}>
                            By logging in, you agree to the{' '}
                            <span
                                onClick={() => openPolicyModal('terms')}
                                style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Terms of Service
                            </span>
                            {' '}and{' '}
                            <span
                                onClick={() => openPolicyModal('privacy')}
                                style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Privacy Policy
                            </span>.
                        </p>
                    </div>

                    <button type="submit" className="btn login-btn">Login</button>
                </form>

                {/* --- MODIFIED: Side-by-side Buttons --- */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center',

                    marginTop: '2.9rem',
                    gap: '1rem'
                }}>
                    <button
                        className="btn same-size-btn"
                        onClick={openRegisterModal}
                        style={{ flex: 1, minWidth: '120px' }}
                    >
                        Register
                    </button>

                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        shape="pill"
                    />
                </div>

                {googleError && (
                    <p className="error-message" style={{ marginTop: "0.5rem", textAlign: 'center' }}>
                        {googleError}
                    </p>
                )}

                {/* --- REMOVED: Old Forgot Password and Register buttons moved from here --- */}
            </div>

            {/* --- NEW: Policy Modal --- */}
            {showPolicyModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2>{policyContent.title}</h2>
                            <button className="close-btn" onClick={closePolicyModal}>×</button>
                        </div>
                        <div style={{ padding: '20px', textAlign: 'left', overflowY: 'auto', flexGrow: 1, lineHeight: '1.6' }}>
                            {policyContent.content}
                        </div>
                    </div>
                </div>
            )}

            {modal === 'forgot' && (
                <div className="modal-overlay" onClick={closeForgotModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Forgot Password</h2>
                            <button className="close-btn" onClick={closeForgotModal}>&times;</button>
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
                            <p className="error-message" style={{ color: forgotMessage.startsWith("✅") ? "green" : "red" }}>
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
