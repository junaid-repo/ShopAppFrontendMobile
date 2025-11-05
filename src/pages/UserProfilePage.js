import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from "jwt-decode";
import { useConfig } from "./ConfigProvider";
import toast, { Toaster } from 'react-hot-toast'; // Using this for blur handlers
// --- ADDED ---
import { FaCrown, FaStar } from 'react-icons/fa';
import EditIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';

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

// --- HELPER FUNCTIONS (from desktop) ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};
const calculateRemainingDays = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return 0; // Expired
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
const getTotalDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 1; // Avoid division by zero
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    const totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return totalDays <= 0 ? 1 : totalDays; // ensure it's at least 1
};
const getBarColor = (days) => {
    if (days === null || days > 10) return 'green';
    if (days <= 5) return 'red';
    if (days <= 10) return 'yellow';
    return 'green';
};
// --- END HELPER FUNCTIONS ---

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
        marginBottom: '1rem',
    },

    // --- NEW: Section Header ---
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e0f7ff',
        paddingBottom: '0.5rem',
        marginTop: '1rem',
    },
    sectionTitle: { // Replaces h3 for sections
        fontSize: '1.25rem',
        color: '#00aaff',
        margin: 0,
    },
    iconBtn: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#00aaff',
    },
    // --- NEW: Section Actions ---
    sectionActions: {
        display: 'flex',
        gap: '1rem',
        marginTop: '1.5rem',
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
        overflowX: 'auto', // Allow scrolling on small screens
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
        whiteSpace: 'nowrap', // Prevent wrapping
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
        marginBottom: '1rem', // Add space between groups
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

    // --- NEW: Subscription Panel Styles ---
    subscriptionPanel: {
        padding: '1rem',
        borderRadius: '15px',
        border: '1px solid rgba(224, 247, 255, 0.8)',
        background: 'rgba(240, 248, 255, 0.9)',
        marginBottom: '1.5rem',
    },
    nonPremium: {
        textAlign: 'center',
    },
    premiumBadgeHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        borderRadius: '20px 20px 0 0',
        backgroundColor: '#00aaff',
        color: 'white',
        fontWeight: 'bold',
        margin: '-1rem -1rem 1rem -1rem',
    },
    upcomingBadge: {
        backgroundColor: '#ffc107',
        color: '#333',
    },
    subscriptionDetailsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        margin: '1.5rem 0',
    },
    gridItem: { // Helper for grid
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    gridLabel: {
        fontSize: '0.85rem',
        color: '#586069',
        fontWeight: '600',
    },
    gridValue: {
        fontSize: '1rem',
        fontWeight: 'bold',
        color: '#333',
    },
    statusActive: {
        backgroundColor: '#d1f7e4',
        color: '#0b532e',
        padding: '3px 8px',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '0.9em',
        width: 'fit-content',
    },
    statusUpcoming: {
        backgroundColor: '#ffecb3',
        color: '#664d00',
        padding: '3px 8px',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '0.9em',
        width: 'fit-content',
    },
    progressTitle: {
        fontSize: '1rem',
        fontWeight: 'bold',
        color: '#333',
        margin: '1.5rem 0 0.5rem 0',
    },
    progressBarContainer: {
        width: '100%',
        height: '20px',
        backgroundColor: '#e0f7ff',
        borderRadius: '10px',
        overflow: 'hidden',
    },
    progressBarInner: {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        color: 'white',
        fontWeight: 'bold',
        transition: 'width 0.5s ease',
    },
    barGreen: { backgroundColor: '#4CAF50' },
    barYellow: { backgroundColor: '#FFC107' },
    barRed: { backgroundColor: '#F44336' },
    // --- End Subscription Panel Styles ---

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

// --- ADDED setSelectedPage prop ---
const UserProfilePage = ({ setSelectedPage }) => {
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
    // --- REPLACED isEditing ---
    const [sectionEdit, setSectionEdit] = useState({ user: false, basic: false, finance: false, others: false });
    const [errors, setErrors] = useState({});
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1);
    const [userSource, setUserSource] = useState("email");
    const [activeTab, setActiveTab] = useState('user'); // 'user' or 'shop' or 'subscription'

    // --- NEW Subscription State ---
    const [subscription, setSubscription] = useState([]);
    const [isLoadingSub, setIsLoadingSub] = useState(true);

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
    // --- EFFECTS ---
    useEffect(() => {
        // Removed mockUser setup, as API call will handle it
    }, []);

    // --- NEW: Fetch Subscriptions useEffect ---
    useEffect(() => {
        if (!apiUrl) return;

        const fetchSubscriptionDetails = async () => {
            setIsLoadingSub(true);
            try {
                const res = await fetch(`${apiUrl}/api/shop/subscription/details`, {
                    method: "GET",
                    credentials: 'include',
                });
                if (res.status === 404) {
                    setSubscription([]);
                    return;
                }
                if (!res.ok) {
                    throw new Error(`Subscription fetch failed (${res.status})`);
                }
                const data = await res.json();
                const sortedData = data.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                setSubscription(sortedData);
            } catch (err) {
                console.error("Error loading subscription details:", err);
                setSubscription([]);
            } finally {
                setIsLoadingSub(false);
            }
        };

        fetchSubscriptionDetails();
    }, [apiUrl]);

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

    // --- NEW: Section Edit Toggle ---
    const handleSectionEdit = (section) => {
        // When turning one on, turn others off (optional, but good for mobile)
        const newEditState = { user: false, basic: false, finance: false, others: false };
        newEditState[section] = !sectionEdit[section]; // Toggle the clicked one

        // If we are cancelling, revert form data for that section
        if (sectionEdit[section]) {
            setFormData(user); // Revert all data
            setProfilePicPreview(user.profilePic);
            setShopLogoPreview(user.shopLogo);
        }
        setSectionEdit(newEditState);
    };

    // --- REPLACED handleCancel ---
    const handleCancel = (section) => {
        setFormData(user);
        setProfilePicPreview(user.profilePic || profilePicPreview);
        setShopLogoPreview(user.shopLogo || shopLogoPreview);
        setProfilePicFile(null);
        setShopLogoFile(null);
        setErrors({});
        setSectionEdit(prev => ({ ...prev, [section]: false }));
    };

    // --- REPLACED validateForm ---
    const validateForm = (section) => {
        const newErrors = {};
        if (section === 'user') {
            if (!formData.name?.trim()) newErrors.name = 'Name is required';
            if (!formData.email?.includes('@')) newErrors.email = 'Invalid email';
            if (!formData.phone?.match(/^\+?(\d[\s-]?){10,12}$/)) newErrors.phone = 'Invalid phone number';
            if (!formData.address?.trim()) newErrors.address = 'Address is required';
        }
        if (section === 'basic') {
            if (!formData.shopName?.trim()) newErrors.shopName = 'Shop name is required';
            if (!formData.shopAddress?.trim()) newErrors.shopAddress = 'Shop address is required';
            if (!formData.gstin?.trim()) newErrors.gstin = 'GSTIN is required';
        }
        // Add finance/others validation if needed

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // --- NEW: User Save Function ---
    const handleUserSave = async () => {
        if (!validateForm('user')) {
            toast.error('Please fix errors in the form');
            return;
        }
        try {
            const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: "GET",
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error('Could not get user session');
            const { username } = await userRes.json();

            // Update text details
            const detailsResponse = await fetch(`${apiUrl}/api/shop/user/edit/${username}`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData), // Send full form data
            });
            if (!detailsResponse.ok) throw new Error("Failed to update user details");

            // Update profile picture if a new one was selected
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

            setUser({ ...formData, profilePic: profilePicPreview });
            setSectionEdit(prev => ({...prev, user: false}));
            setProfilePicFile(null);
            toast.success("User profile updated!");

        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Something went wrong while updating user details.");
        }
    };

    // --- NEW: Shop Section Save Function (with GST/PAN fix) ---
    const handleSectionSave = async (section) => {
        if (!validateForm(section)) {
            toast.error('Please fix errors in the form');
            return;
        }
        try {
            const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: "GET",
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error('Could not get user session');

            if (section === 'basic') {
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
                const basicPayload = {
                    shopName: formData.shopName,
                    shopAddress: formData.shopAddress,
                    shopEmail: formData.shopEmail,
                    shopPhone: formData.shopPhone,
                    shopSlogan: formData.shopSlogan,
                    shopPincode: formData.shopPincode,
                    shopCity: formData.shopCity,
                    shopState: formData.shopState,
                    gstin: formData.gstin || formData.gstNumber,
                    panNumber: formData.pan
                };
                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/basic`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(basicPayload),
                });
                if (!resp.ok) throw new Error('Failed to update basic shop details');

                toast.success('Basic shop details updated');
                setShopLogoFile(null);
                setUser(prev => ({ ...prev, ...basicPayload, shopLogo: shopLogoPreview }));
            }

            if (section === 'finance') {
                const financePayload = {
                    upi: formData.upi,
                    bankHolder: formData.bankHolder,
                    bankAccount: formData.bankAccount,
                    bankIfsc: formData.bankIfsc,
                    bankName: formData.bankName,
                    bankAddress: formData.bankAddress,
                    // BUG FIX: Include GST/PAN
                    gstin: formData.gstin || formData.gstNumber,
                    panNumber: formData.pan
                };
                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/finance`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(financePayload),
                });
                if (!resp.ok) throw new Error('Failed to update finance details');

                toast.success('Finance details updated');
                setUser(prev => ({ ...prev, ...financePayload }));
            }

            if (section === 'others') {
                const othersPayload = {
                    terms1: formData.terms1,
                    terms2: formData.terms2,
                    terms3: formData.terms3,
                    // BUG FIX: Include GST/PAN
                    gstin: formData.gstin || formData.gstNumber,
                    panNumber: formData.pan
                };
                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/others`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(othersPayload),
                });
                if (!resp.ok) throw new Error('Failed to update other details');

                toast.success('Other details updated');
                setUser(prev => ({ ...prev, ...othersPayload }));
            }

            // Close edit mode for the saved section
            setSectionEdit(prev => ({ ...prev, [section]: false }));

        } catch (err) {
            console.error('Section save failed:', err);
            toast.error('Something went wrong while saving');
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

    const getInputStyle = (fieldHasError, section) => ({
        ...themeStyles.input,
        ...(!sectionEdit[section] && styles.inputDisabled), // Use sectionEdit state
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

            {/* --- UPDATED TAB HEADER --- */}
            <div style={styles.tabHeader}>
                <button style={getTabStyle('user')} onClick={() => setActiveTab('user')}>User Details</button>
                <button style={getTabStyle('shop')} onClick={() => setActiveTab('shop')}>Shop Details</button>
                <button style={getTabStyle('subscription')} onClick={() => setActiveTab('subscription')}>Subscription</button>
            </div>

            {/* --- USER TAB (Refactored) --- */}
            {activeTab === 'user' && (
                <div>
                    <div style={{...styles.sectionHeader, borderBottom: 'none'}}>
                        <h3 style={styles.sectionTitle}>User Details</h3>
                        <button
                            style={{...styles.iconBtn, color: themeStyles.colors.primary}}
                            onClick={() => handleSectionEdit('user')}
                        >
                            {sectionEdit.user ? <CancelOutlinedIcon /> : <EditIcon />}
                        </button>
                    </div>

                    <div style={styles.avatarContainer}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleProfilePicChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                            disabled={!sectionEdit.user || isGoogleUser}
                        />
                        <Hoverable hoverStyle={sectionEdit.user && !isGoogleUser ? styles.avatarHover : {}}>
                            <img
                                src={profilePicPreview || 'https://placehold.co/150x150/e0f7ff/00aaff?text=No+Img'}
                                alt="Profile"
                                style={themeStyles.avatar}
                                onClick={() => { if (sectionEdit.user && !isGoogleUser) fileInputRef.current.click(); }}
                            />
                        </Hoverable>
                        {sectionEdit.user && !isGoogleUser && <small style={{color: themeStyles.colors.textMuted}}>Click image to change</small>}
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
                                    disabled={!sectionEdit.user || isGoogleUser}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{
                                        ...getInputStyle(errors.name, 'user'),
                                        cursor: isGoogleUser ? 'not-allowed' : (sectionEdit.user ? 'text' : 'not-allowed'),
                                        backgroundColor: isGoogleUser ? '#f5f5f5' : (sectionEdit.user ? themeStyles.input.backgroundColor : '#f5f5f5'),
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
                                    style={{ ...getInputStyle(errors.email, 'user'), cursor: 'not-allowed', backgroundColor: '#f5f5f5', color: '#888' }}
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
                                    disabled={!sectionEdit.user}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    style={getInputStyle(errors.phone, 'user')}
                                />
                                {errors.phone && <div style={styles.errorMessage}>{errors.phone}</div>}
                            </div>

                            <div style={styles.formGroup}>
                                <label style={themeStyles.label}>Address</label>
                                <input
                                    type="text"
                                    value={formData.address || ''}
                                    disabled={!sectionEdit.user}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    style={getInputStyle(errors.address, 'user')}
                                />
                                {errors.address && <div style={styles.errorMessage}>{errors.address}</div>}
                            </div>
                        </div>
                    </div>

                    {/* --- NEW: Per-Section Save/Cancel --- */}
                    {sectionEdit.user && (
                        <div style={styles.sectionActions}>
                            <HoverButton onClick={handleUserSave} style={styles.btn} hoverStyle={styles.btnHover}>
                                Save User
                            </HoverButton>
                            <HoverButton onClick={() => handleCancel('user')} style={{ ...styles.btn, ...styles.btnCancel }} hoverStyle={styles.btnCancelHover}>
                                Cancel
                            </HoverButton>
                        </div>
                    )}

                    <hr style={{margin: '2rem 0', border: 'none', borderTop: `1px solid ${themeStyles.colors.borderColor}`}} />

                    {/* Update Password Button */}
                    {!isGoogleUser && (
                        <HoverButton
                            onClick={() => setShowPasswordModal(true)}
                            disabled={sectionEdit.user} // Disable if editing
                            style={styles.btn}
                            hoverStyle={styles.btnHover}
                        >
                            Update Password
                        </HoverButton>
                    )}
                </div>
            )}

            {/* --- SHOP TAB (Refactored) --- */}
            {activeTab === 'shop' && (
                <div style={styles.shopTabContent}>
                    {/* --- Basic Details --- */}
                    <div>
                        <div style={{...styles.sectionHeader, borderBottom: 'none'}}>
                            <h3 style={styles.sectionTitle}>Basic Details</h3>
                            <button
                                style={{...styles.iconBtn, color: themeStyles.colors.primary}}
                                onClick={() => handleSectionEdit('basic')}
                            >
                                {sectionEdit.basic ? <CancelOutlinedIcon /> : <EditIcon />}
                            </button>
                        </div>

                        <div style={styles.avatarContainer}>
                            <input
                                type="file"
                                ref={shopLogoInputRef}
                                onChange={handleShopLogoChange}
                                style={{ display: 'none' }}
                                accept="image/*"
                                disabled={!sectionEdit.basic}
                            />
                            <Hoverable hoverStyle={sectionEdit.basic ? styles.avatarHover : {}}>
                                <img
                                    src={shopLogoPreview || 'https://placehold.co/150x150/e0f7ff/00aaff?text=Shop+Logo'}
                                    alt="Shop Logo"
                                    style={{...styles.shopLogo, borderColor: themeStyles.colors.primary}}
                                    onClick={() => { if (sectionEdit.basic) shopLogoInputRef.current.click(); }}
                                />
                            </Hoverable>
                            {sectionEdit.basic && <small style={{color: themeStyles.colors.textMuted}}>Click image to change logo</small>}
                        </div>

                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>GSTIN</label>
                            <input type="text" value={formData.gstin || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, gstin: e.target.value })} onBlur={handleGstinBlur} style={getInputStyle(errors.gstin, 'basic')} />
                            {errors.gstin && <div style={styles.errorMessage}>{errors.gstin}</div>}
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>PAN</label>
                            <input type="text" value={formData.pan || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, pan: e.target.value })} style={getInputStyle(errors.pan, 'basic')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Shop Name</label>
                            <input type="text" value={formData.shopName || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopName: e.target.value })} style={getInputStyle(errors.shopName, 'basic')} />
                            {errors.shopName && <div style={styles.errorMessage}>{errors.shopName}</div>}
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Shop Address</label>
                            <input type="text" value={formData.shopAddress || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopAddress: e.target.value })} style={getInputStyle(errors.shopAddress, 'basic')} />
                            {errors.shopAddress && <div style={styles.errorMessage}>{errors.shopAddress}</div>}
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Pincode</label>
                            <input type="text" value={formData.shopPincode || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopPincode: e.target.value })} onBlur={handlePincodeBlur} style={getInputStyle(errors.shopPincode, 'basic')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>City</label>
                            <input type="text" value={formData.shopCity || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopCity: e.target.value })} style={getInputStyle(errors.shopCity, 'basic')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>State</label>
                            <input type="text" value={formData.shopState || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopState: e.target.value })} style={getInputStyle(errors.shopState, 'basic')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Shop Slogan</label>
                            <input type="text" value={formData.shopSlogan || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopSlogan: e.target.value })} style={getInputStyle(errors.shopSlogan, 'basic')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Shop Email</label>
                            <input type="email" value={formData.shopEmail || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopEmail: e.target.value })} style={getInputStyle(errors.shopEmail, 'basic')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Shop Phone</label>
                            <input type="text" value={formData.shopPhone || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopPhone: e.target.value })} style={getInputStyle(errors.shopPhone, 'basic')} />
                        </div>
                        {sectionEdit.basic && (
                            <div style={styles.sectionActions}>
                                <HoverButton onClick={() => handleSectionSave('basic')} style={styles.btn} hoverStyle={styles.btnHover}>
                                    Save Basic
                                </HoverButton>
                                <HoverButton onClick={() => handleCancel('basic')} style={{ ...styles.btn, ...styles.btnCancel }} hoverStyle={styles.btnCancelHover}>
                                    Cancel
                                </HoverButton>
                            </div>
                        )}
                    </div>

                    {/* --- Finance Details --- */}
                    <div>
                        <div style={{...styles.sectionHeader, borderBottom: 'none'}}>
                            <h3 style={styles.sectionTitle}>Finance Details</h3>
                            <button
                                style={{...styles.iconBtn, color: themeStyles.colors.primary}}
                                onClick={() => handleSectionEdit('finance')}
                            >
                                {sectionEdit.finance ? <CancelOutlinedIcon /> : <EditIcon />}
                            </button>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>UPI ID</label>
                            <input type="text" value={formData.upi || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, upi: e.target.value })} style={getInputStyle(errors.upi, 'finance')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Account Holder Name</label>
                            <input type="text" value={formData.bankHolder || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankHolder: e.target.value })} style={getInputStyle(errors.bankHolder, 'finance')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Account Number</label>
                            <input type="text" value={formData.bankAccount || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} style={getInputStyle(errors.bankAccount, 'finance')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>IFSC Code</label>
                            <input type="text" value={formData.bankIfsc || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankIfsc: e.target.value })} onBlur={handleIFSCBlur} style={getInputStyle(errors.bankIfsc, 'finance')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Bank Name</label>
                            <input type="text" value={formData.bankName || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankName: e.target.value })} style={getInputStyle(errors.bankName, 'finance')} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>Bank Address</label>
                            <input type="text" value={formData.bankAddress || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankAddress: e.target.value })} style={getInputStyle(errors.bankAddress, 'finance')} />
                        </div>
                        {sectionEdit.finance && (
                            <div style={styles.sectionActions}>
                                <HoverButton onClick={() => handleSectionSave('finance')} style={styles.btn} hoverStyle={styles.btnHover}>
                                    Save Finance
                                </HoverButton>
                                <HoverButton onClick={() => handleCancel('finance')} style={{ ...styles.btn, ...styles.btnCancel }} hoverStyle={styles.btnCancelHover}>
                                    Cancel
                                </HoverButton>
                            </div>
                        )}
                    </div>

                    {/* --- Other Details --- */}
                    <div>
                        <div style={{...styles.sectionHeader, borderBottom: 'none'}}>
                            <h3 style={styles.sectionTitle}>Other Details</h3>
                            <button
                                style={{...styles.iconBtn, color: themeStyles.colors.primary}}
                                onClick={() => handleSectionEdit('others')}
                            >
                                {sectionEdit.others ? <CancelOutlinedIcon /> : <EditIcon />}
                            </button>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={themeStyles.label}>
                                Terms & Conditions
                                <span style={{...styles.labelHelper, color: themeStyles.colors.textMuted}}> (Separate with ## for multiple)</span>
                            </label>
                            <textarea
                                value={formData.terms1 || ''}
                                disabled={!sectionEdit.others}
                                onChange={e => setFormData({ ...formData, terms1: e.target.value })}
                                style={{...styles.textarea, ...themeStyles.input, ...(!sectionEdit.others && styles.inputDisabled)}}
                            />
                        </div>
                        {sectionEdit.others && (
                            <div style={styles.sectionActions}>
                                <HoverButton onClick={() => handleSectionSave('others')} style={styles.btn} hoverStyle={styles.btnHover}>
                                    Save Others
                                </HoverButton>
                                <HoverButton onClick={() => handleCancel('others')} style={{ ...styles.btn, ...styles.btnCancel }} hoverStyle={styles.btnCancelHover}>
                                    Cancel
                                </HoverButton>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- NEW: SUBSCRIPTION TAB --- */}
            {activeTab === 'subscription' && (
                <SubscriptionPanel
                    subscription={subscription}
                    isLoading={isLoadingSub}
                    setSelectedPage={setSelectedPage}
                    styles={themeStyles} // Pass styles
                />
            )}

            {/* --- REMOVED Old Button Row --- */}

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

// --- NEW: SubscriptionPanel Component (adapted for inline styles) ---
const SubscriptionPanel = ({ subscription, isLoading, setSelectedPage, styles }) => {

    // 1. Loading State
    if (isLoading) {
        return <div style={{color: styles.colors.text}}>Loading Subscription Details...</div>;
    }

    // 2. Free Plan / No Subscription View
    if (!subscription || subscription.length === 0) {
        return (
            <div style={{ ...styles.subscriptionPanel, ...styles.nonPremium, background: styles.colors.glassBg, borderColor: styles.colors.borderColor }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '5px' }}>
                    <h3 style={{ ...styles.sectionTitle, color: styles.colors.text, border: 'none' }}>Your Plan</h3>
                    <button
                        style={{ ...styles.btn, padding: '4px 10px', margin: '0', backgroundColor: styles.colors.primary }}
                        onClick={() => setSelectedPage('subscribe')}
                    >
                        Update Subscription
                    </button>
                </div>
                <div style={{ padding: '20px 0' }}>
                    <FaStar size={48} style={{ color: '#ffc107' }} />
                    <h3 style={{color: styles.colors.text}}>You are on the Free Plan</h3>
                    <p style={{color: styles.colors.textMuted}}>Upgrade to Premium to unlock all features, including unlimited invoices and advanced analytics.</p>
                </div>
            </div>
        );
    }

    // 3. Active/Upcoming Plans View (Now a loop)
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginBottom: '0.5rem' }}>
                <button
                    style={{ ...styles.btn, padding: '4px 10px', margin: '0', backgroundColor: styles.colors.primary }}
                    onClick={() => setSelectedPage('subscribe')}
                >
                    Update Subscription
                </button>
            </div>

            {subscription.map((sub, index) => {
                const isUpcoming = new Date(sub.startDate) > new Date();
                return (
                    <SingleSubscriptionItem
                        key={sub.subscriptionId || index}
                        subscription={sub}
                        isUpcoming={isUpcoming}
                        styles={styles} // Pass styles down
                    />
                );
            })}
        </div>
    );
};

// --- NEW: SingleSubscriptionItem Component (adapted for inline styles) ---
const SingleSubscriptionItem = ({ subscription, isUpcoming, styles }) => {
    const { subscriptionId, status, planType, startDate, endDate } = subscription;

    const remainingDays = calculateRemainingDays(endDate);
    const totalDuration = getTotalDuration(startDate, endDate);
    const progressPercent = Math.max(0, Math.min(100, (remainingDays / totalDuration) * 100));
    const barColor = getBarColor(remainingDays);

    let displayStatus = isUpcoming ? "Upcoming" : status;
    let statusStyle = isUpcoming ? styles.statusUpcoming : (status === 'active' ? styles.statusActive : {}); // Add more statuses if needed

    // Theme-aware styles
    const panelStyle = {...styles.subscriptionPanel, background: styles.colors.glassBg, borderColor: styles.colors.borderColor};
    const badgeStyle = {
        ...styles.premiumBadgeHeader,
        backgroundColor: styles.colors.primary,
        ...(isUpcoming && {...styles.upcomingBadge, color: '#333'})
    };
    const gridLabelStyle = {...styles.gridLabel, color: styles.colors.textMuted};
    const gridValueStyle = {...styles.gridValue, color: styles.colors.text};
    const progressTitleStyle = {...styles.progressTitle, color: styles.colors.text};
    const progressBarContainerStyle = {...styles.progressBarContainer, backgroundColor: styles.colors.primaryLight};
    const progressBarStyle = {
        ...styles.progressBarInner,
        ...styles[`bar${barColor.charAt(0).toUpperCase() + barColor.slice(1)}`], // e.g., styles.barGreen
        width: `${progressPercent}%`
    };

    return (
        <div style={panelStyle}>
            <div style={badgeStyle}>
                {isUpcoming ? <FaStar /> : <FaCrown />}
                <span>{isUpcoming ? 'Upcoming Plan' : 'Premium Member'}</span>
            </div>

            <h3 style={{...styles.sectionTitle, color: styles.colors.text, border: 'none'}}>Plan Details</h3>

            <div style={styles.subscriptionDetailsGrid}>
                <div style={styles.gridItem}>
                    <label style={gridLabelStyle}>Subscription ID</label>
                    <span style={gridValueStyle}>{subscriptionId || 'N/A'}</span>
                </div>
                <div style={styles.gridItem}>
                    <label style={gridLabelStyle}>Status</label>
                    <span style={{...gridValueStyle, ...statusStyle}}>{displayStatus || 'N/A'}</span>
                </div>
                <div style={styles.gridItem}>
                    <label style={gridLabelStyle}>Plan Type</label>
                    <span style={gridValueStyle}>{planType || 'N/A'}</span>
                </div>
                <div style={styles.gridItem}>
                    <label style={gridLabelStyle}>Start Date</label>
                    <span style={gridValueStyle}>{formatDate(startDate)}</span>
                </div>
                <div style={styles.gridItem}>
                    <label style={gridLabelStyle}>End Date</label>
                    <span style={gridValueStyle}>{formatDate(endDate)}</span>
                </div>
                <div style={styles.gridItem}>
                    <label style={gridLabelStyle}>Remaining</label>
                    <span style={gridValueStyle}>{remainingDays} Days</span>
                </div>
            </div>

            {!isUpcoming && (
                <>
                    <h4 style={progressTitleStyle}>Plan Validity</h4>
                    <div style={progressBarContainerStyle}>
                        <div style={progressBarStyle}>
                            {remainingDays > 0 ? `${remainingDays} days left` : 'Expired'}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};


export default UserProfilePage;