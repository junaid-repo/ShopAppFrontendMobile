import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from "jwt-decode";
import { useConfig } from "./ConfigProvider";
import toast, { Toaster } from 'react-hot-toast'; // Using this for blur handlers

// Mock data, assuming it's in a separate file like '../mockUserData'
var mockUser = {
    profilePic: 'https://placehold.co/150x150/00aaff/FFFFFF?text=JD',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 9876543210',
    address: '123 Tech Park, Bangalore, India',
    shopOwner: 'John Doe',
    shopLocation: 'Main Street, Bangalore', // Will be mapped to shopAddress
    gstNumber: '29ABCDE1234F1Z5', // Will be mapped to gstin
};

const getThemeStyles = () => {
    const isDark = document.body.classList.contains("dark-theme");

    return {
        colors: {
            primary: "#00aaff",
            primaryLight: isDark ? "rgba(0,170,255,0.15)" : "#e0f7ff",
            background: isDark ? "#0d1117" : "#f0f8ff",
            glassBg: isDark ? "rgba(22,27,34,0.75)" : "rgba(240, 248, 255, 0.9)",
            borderColor: isDark ? "rgba(139, 148, 158, 0.3)" : "rgba(224, 247, 255, 0.8)",
            shadow: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)",
            text: isDark ? "#c9d1d9" : "#333",
            textMuted: isDark ? "#8b949e" : "#586069",
            error: "#ff6b6b",
            errorBg: "rgba(255, 107, 107, 0.15)",
        },
        // ... other theme styles
    };
};

// --- STYLES OBJECT (derived from your index.css) ---
// --- UPDATED with new styles for tabs, shop, etc. ---
const styles = {
    // Color Palette from :root
    colors: {
        primary: '#00aaff',
        primaryLight: '#e0f7ff',
        background: '#f0f8ff',
        glassBg: 'rgba(240, 248, 255, 0.9)',
        borderColor: 'rgba(224, 247, 255, 0.8)',
        shadow: 'rgba(0, 0, 0, 0.15)',
        text: '#333',
        textMuted: '#586069',
        error: '#ff6b6b',
        errorBg: 'rgba(255, 107, 107, 0.15)',
    },

    // Main container
    dashboard: {
        padding: '1rem', // Smaller padding for mobile
        backgroundColor: '#ffffff',
        color: '#0a0087',
        fontFamily: "'lemon_milk_pro_regular_webfont', sans-serif",
    },
    h2: {
        textAlign: 'center',
        marginBottom: '1.5rem',
        fontSize: '2rem', // Smaller for mobile
        color: '#0a0087',
    },
    h3: { // Section titles
        fontSize: '1.25rem',
        color: '#00aaff',
        borderBottom: '1px solid #e0f7ff',
        paddingBottom: '0.5rem',
        marginTop: '1rem',
    },

    // Glassmorphism Card
    glassCard: {
        background: 'rgba(240, 248, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px', // Slightly smaller radius
        border: '1px solid rgba(224, 247, 255, 0.8)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        padding: '1.5rem', // Smaller padding
        marginTop: '1rem', // Reduced top margin
    },

    // --- NEW: Tab Styles ---
    tabHeader: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(224, 247, 255, 0.8)',
    },
    tabButton: {
        padding: '0.75rem 1rem',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '1rem',
        color: '#333',
        opacity: 0.7,
        fontWeight: '600',
    },
    tabButtonActive: {
        color: '#00aaff',
        borderBottom: '3px solid #00aaff',
        opacity: 1,
        fontWeight: 'bold',
    },

    // --- NEW: Shop Tab Layout ---
    shopTabContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem', // This creates the 1-column stack
    },

    // Layout
    twoColumn: {
        display: 'flex',
        gap: '1.5rem', // Smaller gap
        flexWrap: 'wrap',
    },
    column: {
        flex: 1,
        minWidth: '280px', // Ensures it stacks on small screens
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },

    // Form Elements
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    label: {
        fontWeight: 'bold',
        color: '#0a0087',
        fontSize: '0.9rem',
    },
    labelHelper: {
        fontStyle: "italic",
        fontSize: "0.8em",
        color: "#586069",
        fontWeight: 'normal'
    },
    input: {
        width: '100%',
        padding: '0.75rem 1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '1rem',
        backgroundColor: '#fff',
        color: '#333',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        boxSizing: 'border-box', // Added for proper width
    },
    textarea: {
        width: '100%',
        minHeight: '80px',
        padding: '0.75rem 1rem',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '1rem',
        backgroundColor: '#fff',
        color: '#333',
        fontFamily: 'inherit',
        resize: 'vertical',
        boxSizing: 'border-box',
    },
    inputDisabled: {
        backgroundColor: '#f5f5f5',
        cursor: 'not-allowed',
        color: '#888',
    },
    inputError: {
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
    },
    errorMessage: {
        color: '#ff6b6b',
        fontSize: '0.85rem',
        marginTop: '-0.5rem',
    },

    // Profile Picture Specific
    avatarContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
    },
    avatar: {
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid rgba(0, 170, 255, 0.5)',
        cursor: 'pointer',
        transition: 'transform 0.3s ease',
    },
    avatarHover: {
        transform: 'scale(1.05)',
        boxShadow: '0 4px 20px rgba(0, 170, 255, 0.4)',
    },
    // --- NEW: Shop Logo Style ---
    shopLogo: {
        width: '120px',
        height: '120px',
        borderRadius: '12px', // Square-ish
        objectFit: 'cover',
        border: '2px dashed rgba(0, 170, 255, 0.5)',
        cursor: 'pointer',
        transition: 'transform 0.3s ease',
        backgroundColor: '#f0f8ff'
    },


    // Buttons
    buttonRow: {
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginTop: '2rem',
    },
    btn: {
        padding: '0.75rem 1.5rem',
        border: 'none',
        borderRadius: '25px',
        backgroundColor: '#00aaff',
        color: 'white',
        fontSize: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontWeight: 'bold',
    },
    btnHover: {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 15px rgba(0, 170, 255, 0.4)',
    },
    btnCancel: {
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
        border: '1px solid rgba(255, 107, 107, 0.4)',
        color: '#ff6b6b',
    },
    btnCancelHover: {
        backgroundColor: 'rgba(255, 107, 107, 0.25)',
        boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
    },
    btnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
        transform: 'none',
        boxShadow: 'none',
    },

    // Modal
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        background: 'white',
        padding: '1.5rem', // Smaller padding
        borderRadius: '15px',
        width: '90%',
        maxWidth: '500px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    modalTitle: {
        color: '#00aaff',
        textAlign: 'center',
        margin: 0,
    },
};

// Helper component for hoverable elements
const Hoverable = ({ onHover, offHover, children, style, hoverStyle }) => {
    const [hover, setHover] = useState(false);
    const combinedStyle = { ...style, ...(hover ? hoverStyle : {}) };
    return (
        <div
            style={combinedStyle}
            onMouseEnter={() => { setHover(true); if(onHover) onHover(); }}
            onMouseLeave={() => { setHover(false); if(offHover) offHover(); }}
        >
            {children}
        </div>
    );
};

const UserProfilePage = () => {
    // --- STATE ---
    const [themeStyles, setThemeStyles] = React.useState(() => {
        // Combine static styles with dynamic theme
        const dynamicStyles = getThemeStyles();
        return {
            ...styles,
            ...dynamicStyles,
            // Deep merge specific objects if needed
            colors: { ...styles.colors, ...dynamicStyles.colors },
            glassCard: { ...styles.glassCard, ...dynamicStyles.glassCard },
            input: { ...styles.input, ...dynamicStyles.input },
        };
    });

    React.useEffect(() => {
        const observer = new MutationObserver(() => {
            const dynamicStyles = getThemeStyles();
            setThemeStyles({
                ...styles,
                ...dynamicStyles,
                colors: { ...styles.colors, ...dynamicStyles.colors },
                glassCard: { ...styles.glassCard, ...dynamicStyles.glassCard },
                input: { ...styles.input, ...dynamicStyles.input },
            });
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);


    const [user, setUser] = useState({});
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1);
    const [userSource, setUserSource] = useState("email");
    const [activeTab, setActiveTab] = useState('user'); // 'user' or 'shop'

    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || "";

    // File states
    const [profilePicFile, setProfilePicFile] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [shopLogoFile, setShopLogoFile] = useState(null);
    const [shopLogoPreview, setShopLogoPreview] = useState(null);

    // File refs
    const fileInputRef = useRef(null);
    const shopLogoInputRef = useRef(null);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // --- EFFECTS ---
    useEffect(() => {
        setUser(mockUser);
        setFormData({
            ...mockUser,
            gstin: mockUser.gstNumber, // Map old fields
            shopAddress: mockUser.shopLocation // Map old fields
        });
        setProfilePicPreview(mockUser.profilePic);
    }, []);


    useEffect(() => {
        let profilePicObjectUrl = null;
        let shopLogoObjectUrl = null;

        const loadProfile = async () => {
            if (!apiUrl) return;
            try {
                // 1) Get session (username)
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });
                if (!userRes.ok) throw new Error(`User session fetch failed (${userRes.status})`);
                const { username } = await userRes.json();

                // 2) Get full user details
                const detailsRes = await fetch(`${apiUrl}/api/shop/user/get/userprofile/${username}`, {
                    method: "GET",
                    credentials: 'include',
                    headers: { Accept: "application/json" },
                });
                if (!detailsRes.ok) throw new Error(`User details fetch failed (${detailsRes.status})`);
                const details = await detailsRes.json();

                // Map legacy fields if they exist
                const mappedDetails = {
                    ...details,
                    gstin: details.gstin || details.gstNumber,
                    shopAddress: details.shopAddress || details.shopLocation,
                };

                setUser(mappedDetails);
                setFormData(mappedDetails);
                setUserSource(details.userSource || 'email');

                // 3) Fetch profile pic
                try {
                    const picRes = await fetch(`${apiUrl}/api/shop/user/${username}/profile-pic`, {
                        method: "GET",
                        credentials: 'include',
                    });
                    if (picRes.ok) {
                        const blob = await picRes.blob();
                        if (blob && blob.size > 0) {
                            profilePicObjectUrl = URL.createObjectURL(blob);
                            setProfilePicPreview(profilePicObjectUrl);
                        }
                    }
                } catch (picErr) {
                    console.warn('Profile pic fetch error:', picErr);
                }

                // 4) Fetch shop logo
                try {
                    const logoRes = await fetch(`${apiUrl}/api/shop/user/${username}/shop-logo`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    if (logoRes.ok) {
                        const blob = await logoRes.blob();
                        if (blob && blob.size > 0) {
                            shopLogoObjectUrl = URL.createObjectURL(blob);
                            setShopLogoPreview(shopLogoObjectUrl);
                        }
                    }
                } catch (logoErr) {
                    console.warn('Shop logo fetch error:', logoErr);
                }

            } catch (err) {
                console.error("Error loading profile:", err);
                alert("Something went wrong while loading your profile.");
            }
        };

        loadProfile();

        return () => {
            if (profilePicObjectUrl) URL.revokeObjectURL(profilePicObjectUrl);
            if (shopLogoObjectUrl) URL.revokeObjectURL(shopLogoObjectUrl);
        };
    }, [apiUrl]);

    // --- API HELPERS (from Desktop) ---

    const handleIFSCBlur = async () => {
        const ifsc = (formData.bankIfsc || '').trim();
        if (!ifsc) return;
        try {
            const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
            if (!res.ok) {
                toast.error('IFSC code not found');
                return;
            }
            const data = await res.json();
            const bankNameFromApi = data.NAME || data.BANK || '';
            const bankAddressFromApi = data.ADDRESS || '';
            setFormData(prev => ({ ...prev, bankName: bankNameFromApi, bankAddress: bankAddressFromApi }));
            toast.success('Bank details populated!');
        } catch (err) {
            console.error('IFSC lookup failed:', err);
        }
    };

    const fetchPincodeDetails = async (pincode) => {
        if (!pincode) return null;
        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            if (!res.ok) {
                toast.error('Invalid Pincode');
                return null;
            }
            const data = await res.json();
            if (!data || !Array.isArray(data) || data.length === 0 || data[0].Status !== 'Success') {
                toast.error('No details found for this Pincode');
                return null;
            }
            const postOffice = data[0].PostOffice && data[0].PostOffice[0];
            if (!postOffice) {
                toast.error('No post office details found');
                return null;
            }
            return {
                shopState: postOffice.State || '',
                shopCity: postOffice.District || ''
            };
        } catch (err) {
            console.error('Pincode lookup failed:', err);
            return null;
        }
    };

    const handleGstinBlur = async () => {
        const gstin = (formData.gstin || '').trim();
        if (!gstin) return;
        try {
            // NOTE: Replace with your actual GSTIN API if this one is not suitable
            const res = await fetch(`https://gst-return-status.p.rapidapi.com/free/gstin/${gstin}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-rapidapi-key": "1a05818094mshaeae5bbb1e2604dp153414jsn8fad5fb302a1", // This key may be public/expired. Use your own.
                    "x-rapidapi-host": "gst-return-status.p.rapidapi.com"
                }
            });
            if (!res.ok) {
                toast.error('GSTIN not found or API error');
                return;
            }
            const data = await res.json();
            if (!data.data) {
                toast.error('Invalid GSTIN details received');
                return;
            }

            let updates = {
                shopName: data.data.tradeName || data.lgnm || '',
                pan: data.data.pan || '',
                shopAddress: data.data.adr || '',
                shopPincode: data.data.pincode || ''
            };

            if (updates.shopPincode) {
                const pincodeDetails = await fetchPincodeDetails(updates.shopPincode);
                if (pincodeDetails) {
                    updates = { ...updates, ...pincodeDetails };
                }
            }
            setFormData(prev => ({ ...prev, ...updates }));
            toast.success('Shop details populated from GSTIN!');
        } catch (err) {
            console.error('GSTIN lookup failed:', err);
            alert('Failed to fetch GSTIN details. Check API key or network.');
        }
    };

    const handlePincodeBlur = async () => {
        const pincode = (formData.shopPincode || '').trim();
        if (!pincode) return;
        const pincodeDetails = await fetchPincodeDetails(pincode);
        if (pincodeDetails) {
            setFormData(prev => ({ ...prev, ...pincodeDetails }));
            toast.success('City and State populated!');
        }
    };

    // --- FORM HANDLERS ---

    const handleCancel = () => {
        setFormData(user);
        setProfilePicPreview(user.profilePic); // Revert to original loaded pic
        setShopLogoPreview(user.shopLogo);   // Revert to original loaded logo
        setProfilePicFile(null); // Clear pending file
        setShopLogoFile(null);   // Clear pending file
        setErrors({});
        setIsEditing(false);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name?.trim()) newErrors.name = 'Name is required';
        if (!formData.email?.includes('@')) newErrors.email = 'Invalid email';
        if (!formData.phone?.match(/^\+?(\d[\s-]?){10,12}$/)) newErrors.phone = 'Invalid phone number'; // Looser validation
        if (!formData.address?.trim()) newErrors.address = 'Address is required';
        if (!formData.shopName?.trim()) newErrors.shopName = 'Shop name is required';
        if (!formData.shopAddress?.trim()) newErrors.shopAddress = 'Shop address is required';
        if (!formData.gstin?.trim()) newErrors.gstin = 'GSTIN is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleEditToggle = async () => {
        if (isEditing) {
            if (!validateForm()) {
                alert('Please fix the errors in the form.');
                return;
            }
            try {
                // 1. Get username
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });
                if (!userRes.ok) throw new Error('Failed to get user session');
                const { username } = await userRes.json();

                // 2. Update text details (send ALL form data)
                const detailsResponse = await fetch(`${apiUrl}/api/shop/user/edit/${username}`, {
                    method: "PUT",
                    credentials: 'include',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData), // Send the whole form
                });
                if (!detailsResponse.ok) throw new Error("Failed to update user details");

                // 3. Update profile picture (if changed)
                if (profilePicFile) {
                    const picForm = new FormData();
                    picForm.append("profilePic", profilePicFile, profilePicFile.name);
                    const picResponse = await fetch(`${apiUrl}/api/shop/user/edit/profilePic/${username}`, {
                        method: "PUT",
                        credentials: 'include',
                        body: picForm,
                    });
                    if (!picResponse.ok) throw new Error("Failed to update profile picture");
                }

                // 4. Update shop logo (if changed)
                if (shopLogoFile) {
                    const logoForm = new FormData();
                    logoForm.append('shopLogo', shopLogoFile, shopLogoFile.name);
                    const logoResp = await fetch(`${apiUrl}/api/shop/user/edit/details/shopLogo`, {
                        method: 'PUT',
                        credentials: 'include',
                        body: logoForm,
                    });
                    if (!logoResp.ok) throw new Error('Failed to upload shop logo');
                }

                // Success
                setUser({ ...formData, profilePic: profilePicPreview, shopLogo: shopLogoPreview });
                setIsEditing(false);
                setProfilePicFile(null);
                setShopLogoFile(null);
                alert("Profile updated successfully!");

            } catch (error) {
                console.error("Error updating user:", error);
                alert(`Something went wrong: ${error.message}`);
            }
        } else {
            setIsEditing(true);
        }
    };

    const handleProfilePicChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setProfilePicPreview(URL.createObjectURL(file));
            setProfilePicFile(file);
        }
    };

    const handleShopLogoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setShopLogoPreview(URL.createObjectURL(file));
            setShopLogoFile(file);
        }
    };

    // Password submit (unchanged)
    const handlePasswordSubmit = async () => {
        if (passwordStep === 1) {
            try {
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });
                if (!userRes.ok) throw new Error('Failed to fetch user data');
                const { username } = await userRes.json();

                const response = await fetch(authApiUrl+"/auth/authenticate", {
                    method: "POST",
                    credentials: 'include',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: username,
                        password: passwordData.currentPassword,
                    }),
                });
                if (!response.ok) {
                    alert("Invalid current password. Please try again.");
                    return;
                }
                const data = await response.text();
                if (data) {
                    setPasswordStep(2);
                } else {
                    alert("Password validation failed.");
                }
            } catch (error) {
                console.error("Error validating password:", error);
                alert("Something went wrong while validating password.");
            }
        } else {
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                alert("New passwords do not match. Please try again.");
                return;
            }
            if (passwordData.newPassword.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }
            try {
                const response = await fetch(apiUrl+"/api/shop/user/updatepassword", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify({ password: passwordData.newPassword }),
                });
                if (!response.ok) {
                    alert("Failed to update password.");
                    return;
                }
                alert("Password updated successfully!");
                setShowPasswordModal(false);
                setPasswordStep(1);
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } catch (error) {
                console.error("Error updating password:", error);
                alert("Something went wrong while updating password.");
            }
        }
    };

    // --- RENDER HELPERS ---

    const getInputStyle = (fieldHasError) => ({
        ...themeStyles.input,
        ...(!isEditing && styles.inputDisabled),
        ...(fieldHasError && styles.inputError),
    });

    const getTabStyle = (tabName) => ({
        ...styles.tabButton,
        ...(activeTab === tabName ? styles.tabButtonActive : {}),
        // Apply theme colors
        color: activeTab === tabName ? themeStyles.colors.primary : themeStyles.colors.text,
        borderBottom: activeTab === tabName ? `3px solid ${themeStyles.colors.primary}` : 'none',
    });

    const isGoogleUser = userSource === 'google';

    // Custom hoverable button
    const HoverButton = ({ onClick, disabled, children, style, hoverStyle }) => {
        const [hover, setHover] = useState(false);
        const combinedStyle = {
            ...style,
            ...(hover && !disabled ? hoverStyle : {}),
            ...(disabled ? styles.btnDisabled : {}),
        };
        return (
            <button
                style={combinedStyle}
                onClick={onClick}
                disabled={disabled}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
            >
                {children}
            </button>
        );
    };

    return (
        <div className="glass-card" style={themeStyles.glassCard}>
            <Toaster position="top-center" />
            <h2 style={{...styles.h2, color: themeStyles.colors.text}}>User Profile</h2>

            <div style={styles.tabHeader}>
                <button style={getTabStyle('user')} onClick={() => setActiveTab('user')}>User Details</button>
                <button style={getTabStyle('shop')} onClick={() => setActiveTab('shop')}>Shop Details</button>
            </div>

            {/* --- USER TAB --- */}
            {activeTab === 'user' && (
                <div>
                    <div style={styles.avatarContainer}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleProfilePicChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                            disabled={!isEditing || isGoogleUser}
                        />
                        <Hoverable hoverStyle={isEditing && !isGoogleUser ? styles.avatarHover : {}}>
                            <img
                                src={profilePicPreview || 'https://placehold.co/150x150/e0f7ff/00aaff?text=No+Img'}
                                alt="Profile"
                                style={themeStyles.avatar}
                                onClick={() => { if (isEditing && !isGoogleUser) fileInputRef.current.click(); }}
                            />
                        </Hoverable>
                        {isEditing && !isGoogleUser && <small style={{color: themeStyles.colors.textMuted}}>Click image to change</small>}
                    </div>

                    <div className="ribbon">
                        <span style={{ alignItems: 'left' }}>Account Source: {userSource}</span>
                    </div>
                    {isGoogleUser && <span style={{ fontSize: '12px', color: 'blue', marginTop:'1px', display: 'block' }}>* You cannot update Name, Email and Profile Photo if source is google</span>}

                    <div style={styles.twoColumn}>
                        <div style={styles.column}>
                            <div style={styles.formGroup}>
                                <label style={themeStyles.label}>Name</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    disabled={!isEditing || isGoogleUser}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        ...getInputStyle(errors.name),
                                        cursor: isGoogleUser ? 'not-allowed' : (isEditing ? 'text' : 'not-allowed'),
                                        backgroundColor: isGoogleUser ? '#f5f5f5' : (isEditing ? themeStyles.input.backgroundColor : '#f5f5f5'),
                                        color: isGoogleUser ? '#888' : themeStyles.input.color,
                                    }}
                                />
                                {errors.name && <div style={styles.errorMessage}>{errors.name}</div>}
                            </div>
                            <div style={styles.formGroup}>
                                <label style={themeStyles.label}>Email</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    disabled
                                    style={{ ...getInputStyle(errors.email), cursor: 'not-allowed', backgroundColor: '#f5f5f5', color: '#888' }}
                                />
                                {errors.email && <div style={styles.errorMessage}>{errors.email}</div>}
                            </div>
                        </div>
                        <div style={styles.column}>
                            <div style={styles.formGroup}>
                                <label style={themeStyles.label}>Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone || ''}
                                    disabled={!isEditing}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    style={getInputStyle(errors.phone)}
                                />
                                {errors.phone && <div style={styles.errorMessage}>{errors.phone}</div>}
                            </div>

                            <div style={styles.formGroup}>
                                <label style={themeStyles.label}>Address</label>
                                <input
                                    type="text"
                                    value={formData.address || ''}
                                    disabled={!isEditing}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    style={getInputStyle(errors.address)}
                                />
                                {errors.address && <div style={styles.errorMessage}>{errors.address}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SHOP TAB --- */}
            {activeTab === 'shop' && (
                <div style={styles.shopTabContent}>
                    {/* --- Basic Details --- */}
                    <h3 style={{...styles.h3, color: themeStyles.colors.primary}}>Basic Details</h3>
                    <div style={styles.avatarContainer}>
                        <input
                            type="file"
                            ref={shopLogoInputRef}
                            onChange={handleShopLogoChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                            disabled={!isEditing}
                        />
                        <Hoverable hoverStyle={isEditing ? styles.avatarHover : {}}>
                            <img
                                src={shopLogoPreview || 'https://placehold.co/150x150/e0f7ff/00aaff?text=Shop+Logo'}
                                alt="Shop Logo"
                                style={{...styles.shopLogo, borderColor: themeStyles.colors.primary}}
                                onClick={() => { if (isEditing) shopLogoInputRef.current.click(); }}
                            />
                        </Hoverable>
                        {isEditing && <small style={{color: themeStyles.colors.textMuted}}>Click image to change logo</small>}
                    </div>

                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>GSTIN</label>
                        <input type="text" value={formData.gstin || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, gstin: e.target.value })} onBlur={handleGstinBlur} style={getInputStyle(errors.gstin)} />
                        {errors.gstin && <div style={styles.errorMessage}>{errors.gstin}</div>}
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>PAN</label>
                        <input type="text" value={formData.pan || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, pan: e.target.value })} style={getInputStyle(errors.pan)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Shop Name</label>
                        <input type="text" value={formData.shopName || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopName: e.target.value })} style={getInputStyle(errors.shopName)} />
                        {errors.shopName && <div style={styles.errorMessage}>{errors.shopName}</div>}
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Shop Address</label>
                        <input type="text" value={formData.shopAddress || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopAddress: e.target.value })} style={getInputStyle(errors.shopAddress)} />
                        {errors.shopAddress && <div style={styles.errorMessage}>{errors.shopAddress}</div>}
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Pincode</label>
                        <input type="text" value={formData.shopPincode || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopPincode: e.target.value })} onBlur={handlePincodeBlur} style={getInputStyle(errors.shopPincode)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>City</label>
                        <input type="text" value={formData.shopCity || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopCity: e.target.value })} style={getInputStyle(errors.shopCity)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>State</label>
                        <input type="text" value={formData.shopState || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopState: e.target.value })} style={getInputStyle(errors.shopState)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Shop Slogan</label>
                        <input type="text" value={formData.shopSlogan || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopSlogan: e.target.value })} style={getInputStyle(errors.shopSlogan)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Shop Email</label>
                        <input type="email" value={formData.shopEmail || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopEmail: e.target.value })} style={getInputStyle(errors.shopEmail)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Shop Phone</label>
                        <input type="text" value={formData.shopPhone || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopPhone: e.target.value })} style={getInputStyle(errors.shopPhone)} />
                    </div>

                    {/* --- Finance Details --- */}
                    <h3 style={{...styles.h3, color: themeStyles.colors.primary}}>Finance Details</h3>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>UPI ID</label>
                        <input type="text" value={formData.upi || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, upi: e.target.value })} style={getInputStyle(errors.upi)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Account Holder Name</label>
                        <input type="text" value={formData.bankHolder || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, bankHolder: e.target.value })} style={getInputStyle(errors.bankHolder)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Account Number</label>
                        <input type="text" value={formData.bankAccount || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} style={getInputStyle(errors.bankAccount)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>IFSC Code</label>
                        <input type="text" value={formData.bankIfsc || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, bankIfsc: e.target.value })} onBlur={handleIFSCBlur} style={getInputStyle(errors.bankIfsc)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Bank Name</label>
                        <input type="text" value={formData.bankName || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, bankName: e.target.value })} style={getInputStyle(errors.bankName)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>Bank Address</label>
                        <input type="text" value={formData.bankAddress || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, bankAddress: e.target.value })} style={getInputStyle(errors.bankAddress)} />
                    </div>

                    {/* --- Other Details --- */}
                    <h3 style={{...styles.h3, color: themeStyles.colors.primary}}>Other Details</h3>
                    <div style={styles.formGroup}>
                        <label style={themeStyles.label}>
                            Terms & Conditions
                            <span style={{...styles.labelHelper, color: themeStyles.colors.textMuted}}> (Separate with ## for multiple)</span>
                        </label>
                        <textarea
                            value={formData.terms1 || ''}
                            disabled={!isEditing}
                            onChange={e => setFormData({ ...formData, terms1: e.target.value })}
                            style={{...styles.textarea, ...themeStyles.input, ...(!isEditing && styles.inputDisabled)}}
                        />
                    </div>
                </div>
            )}


            {/* --- BUTTONS (Common) --- */}
            <div style={styles.buttonRow}>
                <HoverButton
                    onClick={handleEditToggle}
                    style={styles.btn}
                    hoverStyle={styles.btnHover}
                >
                    {isEditing ? 'Submit' : 'Edit Profile'}
                </HoverButton>

                {isEditing && (
                    <HoverButton
                        onClick={handleCancel}
                        style={{ ...styles.btn, ...styles.btnCancel }}
                        hoverStyle={styles.btnCancelHover}
                    >
                        Cancel
                    </HoverButton>
                )}

                {userSource !== 'google' && (
                    <HoverButton
                        onClick={() => setShowPasswordModal(true)}
                        disabled={isEditing}
                        style={styles.btn}
                        hoverStyle={styles.btnHover}
                    >
                        Update Password
                    </HoverButton>
                )}
            </div>

            {/* Password Modal (Unchanged) */}
            {showPasswordModal && (
                <div style={{...styles.modalOverlay, background: themeStyles.colors.shadow}}>
                    <div style={{...styles.modalContent, background: themeStyles.colors.background}}>
                        <h3 style={{...styles.modalTitle, color: themeStyles.colors.primary}}>
                            {passwordStep === 1 ? 'Enter Current Password' : 'Set New Password'}
                        </h3>

                        {passwordStep === 1 ? (
                            <div style={styles.formGroup}>
                                <label style={themeStyles.label}>Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    style={themeStyles.input}
                                />
                            </div>
                        ) : (
                            <>
                                <div style={styles.formGroup}>
                                    <label style={themeStyles.label}>New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        style={themeStyles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={themeStyles.label}>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        style={themeStyles.input}
                                    />
                                </div>
                            </>
                        )}

                        <div style={styles.buttonRow}>
                            <HoverButton
                                onClick={handlePasswordSubmit}
                                style={styles.btn}
                                hoverStyle={styles.btnHover}
                            >
                                {passwordStep === 1 ? 'Validate' : 'Submit'}
                            </HoverButton>
                            <HoverButton
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setPasswordStep(1);
                                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                }}
                                style={{ ...styles.btn, ...styles.btnCancel }}
                                hoverStyle={styles.btnCancelHover}
                            >
                                Cancel
                            </HoverButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfilePage;