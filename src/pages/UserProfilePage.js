import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from "jwt-decode";
import { useConfig } from "./ConfigProvider";
// Mock data, assuming it's in a separate file like '../mockUserData'
var mockUser = {
    profilePic: 'https://placehold.co/150x150/00aaff/FFFFFF?text=JD',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 9876543210',
    address: '123 Tech Park, Bangalore, India',
    shopOwner: 'John Doe',
    shopLocation: 'Main Street, Bangalore',
    gstNumber: '29ABCDE1234F1Z5',
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
            error: "#ff6b6b",
            errorBg: "rgba(255, 107, 107, 0.15)",
        },

        dashboard: {
            padding: "2rem",
            backgroundColor: isDark ? "#161b22" : "#ffffff",
            color: isDark ? "#c9d1d9" : "#0a0087",
            fontFamily: "'lemon_milk_pro_regular_webfont', sans-serif",
        },
        h2: {
            textAlign: "center",
            marginBottom: "2rem",
            fontSize: "2.5rem",
            color: isDark ? "#00aaff" : "#0a0087",
        },

        glassCard: {
            background: isDark ? "rgba(22,27,34,0.85)" : "rgba(240, 248, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "30px",
            border: `1px solid ${isDark ? "rgba(139, 148, 158, 0.3)" : "rgba(224, 247, 255, 0.8)"}`,
            boxShadow: `0 4px 30px ${isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)"}`,
            padding: "2rem",
        },

        label: {
            fontWeight: "bold",
            color: isDark ? "#c9d1d9" : "#0a0087",
        },

        input: {
            width: "100%",
            padding: "0.75rem 1rem",
            border: `1px solid ${isDark ? "#444c56" : "#ddd"}`,
            borderRadius: "8px",
            fontSize: "1rem",
            backgroundColor: isDark ? "#0d1117" : "#fff",
            color: isDark ? "#c9d1d9" : "#333",
            transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        },

        modalContent: {
            background: isDark ? "#161b22" : "white",
            padding: "2rem",
            borderRadius: "15px",
            width: "90%",
            maxWidth: "500px",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
        },

        modalTitle: {
            color: "#00aaff",
            textAlign: "center",
            margin: 0,
        },
    };
};

// --- STYLES OBJECT (derived from your index.css) ---
const styles = {
    // Color Palette from :root
    colors: {
        primary: '#00aaff',
        primaryLight: '#e0f7ff',
        background: '#f0f8ff',
        glassBg: 'rgba(240, 248, 255, 0.9)', // Slightly more opaque for readability
        borderColor: 'rgba(224, 247, 255, 0.8)',
        shadow: 'rgba(0, 0, 0, 0.15)',
        text: '#333',
        error: '#ff6b6b',
        errorBg: 'rgba(255, 107, 107, 0.15)',
    },

    // Main container
    dashboard: {
        padding: '2rem',
        backgroundColor: '#ffffff', // As per .main-content
        color: '#0a0087',
        fontFamily: "'lemon_milk_pro_regular_webfont', sans-serif",
    },
    h2: {
        textAlign: 'center',
        marginBottom: '2rem',
        fontSize: '2.5rem',
        color: '#0a0087',
    },

    // Glassmorphism Card
    glassCard: {
        background: 'rgba(240, 248, 255, 0.9)', // Using a slightly more opaque version for form readability
        backdropFilter: 'blur(10px)',
        borderRadius: '30px',
        border: '1px solid rgba(224, 247, 255, 0.8)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.15)',
        padding: '2rem',
        marginTop: '10rem',
    },

    // Layout
    twoColumn: {
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
    },
    column: {
        flex: 1, // This ensures columns are distributed equally
        minWidth: '300px', // For responsiveness
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
    },
    inputDisabled: {
        backgroundColor: '#f5f5f5',
        cursor: 'not-allowed',
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
        width: '100px',       // Medium size (fits well inside card)
        height: '100px',
        borderRadius: '50%',  // Round shape
        objectFit: 'cover',
        border: '2px solid rgba(0, 170, 255, 0.5)',
        cursor: 'pointer',
        transition: 'transform 0.3s ease',
    },
    avatarHover: {
        transform: 'scale(1.05)',
        boxShadow: '0 4px 20px rgba(0, 170, 255, 0.4)',
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
        padding: '2rem',
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
    const [themeStyles, setThemeStyles] = React.useState(getThemeStyles());
    const mergedStyles = { ...styles, ...themeStyles };


    React.useEffect(() => {
        const observer = new MutationObserver(() => {
            setThemeStyles(getThemeStyles()); // Recompute when body class changes
        });
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    const [user, setUser] = useState({});
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1);

    const [userSource, setUserSource]=useState("email");

    //const [userName, setUserName] = useState('');
    const config = useConfig();
    console.log("the config", config);

    var apiUrl="";
    if(config){
        console.log(config.API_URL);
        apiUrl=config.API_URL;
    }

    const authApiUrl = config?.AUTH_API_URL || "";

    const [profilePicFile, setProfilePicFile] = useState(null);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    // State for image preview
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    // Ref for file input
    const fileInputRef = useRef(null);

    useEffect(() => {
        setUser(mockUser);
        setFormData(mockUser);
        setProfilePicPreview(mockUser.profilePic);
    }, []);


    useEffect(() => {
        let objectUrlToRevoke = null;

        const loadProfile = async () => {
            try {

                var username="";

                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    //alert(userData.username);
                    username=userData.username; // Assuming your backend sends the username
                } else {
                    console.error('Failed to fetch user data:', userRes.statusText);
                }


                // ======= API CALL #1 (GET JSON user details) =======
                // Example: GET /api/shop/user/{username}
                const detailsRes = await fetch(`${apiUrl}/api/shop/user/get/userprofile/${username}`, {
                    method: "GET",
                    credentials: 'include',
                    headers: {
                        Accept: "application/json",

                    },
                });
                if (!detailsRes.ok) throw new Error(`User details fetch failed (${detailsRes.status})`);
                const details = await detailsRes.json();
                console.log(details);
                setUser(details);
                setFormData(details);
                setUserSource(details.userSource);

                // ======= API CALL #2 (GET profile pic) =======
                // Choose one of these server behaviors:
                //  A) returns raw image bytes -> we read as Blob and createObjectURL
                //  B) returns JSON with {url: "..."} or {base64: "..."} -> handle accordingly
                //
                // Example: GET /api/shop/user/{username}/profile-pic
                const picRes = await fetch(`${apiUrl}/api/shop/user/${username}/profile-pic`, {
                    method: "GET",
                    credentials: 'include',
                    headers: {

                    },
                });

                if (picRes.ok) {
                    const contentType = picRes.headers.get("Content-Type") || "";

                    if (contentType.includes("application/json")) {
                        // Server sends JSON (e.g. { url: "https://...", base64: "..." })
                        const payload = await picRes.json();
                        if (payload.url) {
                            setProfilePicPreview(payload.url);
                        } else if (payload.base64) {
                            //setProfilePicPreview(`data:image/*;base64,${payload.base64}`);
                        } else {
                            setProfilePicPreview(null);
                        }
                    } else {
                        // Server sends image bytes
                        const blob = await picRes.blob();
                        if (blob && blob.size > 0) {
                            const objUrl = URL.createObjectURL(blob);
                            objectUrlToRevoke = objUrl;
                            setProfilePicPreview(objUrl);
                        } else {
                            setProfilePicPreview(null);
                        }
                    }
                } else if (picRes.status === 404) {
                    // No picture uploaded yet
                    setProfilePicPreview(null);
                } else {
                    throw new Error(`Profile pic fetch failed (${picRes.status})`);
                }
            } catch (err) {
                console.error("Error loading profile:", err);
                alert("Something went wrong while loading your profile.");
            }
        };

        loadProfile();

        // Cleanup any object URL we created for the image
        return () => {
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
        };
    }, []);



    const handleCancel = () => {
        setFormData(user);
        setProfilePicPreview(user.profilePic);
        setErrors({});
        setIsEditing(false);
    };

    function logWithLineNumber(message) {
        const e = new Error();
        const stackLine = e.stack.split("\n")[2]; // caller line
        console.log(`${message} (${stackLine.trim()})`);
    }

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name?.trim()) newErrors.name = 'Name is required';
        if (!formData.email?.includes('@')) newErrors.email = 'Invalid email';
        if (!formData.phone?.match(/^\+91\s?\d{10}$/)) newErrors.phone = 'Invalid phone number';
        if (!formData.address?.trim()) newErrors.address = 'Address is required';
        if (!formData.shopOwner?.trim()) newErrors.shopOwner = 'Shop owner is required';
        if (!formData.shopLocation?.trim()) newErrors.shopLocation = 'Shop location is required';
        if (!formData.gstNumber?.trim()) newErrors.gstNumber = 'GST number is required';
        if (!formData.shopName?.trim()) newErrors.gstNumber = 'Shop name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleEditToggle = async () => {
        if (isEditing) {

            if (!validateForm()) return;
            try {
                console.log("Debug here");
                const formDataToSend = new FormData();
                console.log("Debug here");
                // append JSON as a Blob
                const userJson = JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    shopOwner: formData.shopOwner,
                    shopLocation: formData.shopLocation,
                    gstNumber: formData.gstNumber,
                    shopEmail: formData.shopEmail,
                    shopPhone: formData.shopPhone,
                    shopName: formData.shopName
                });
                formDataToSend.append("user", new Blob([userJson], { type: "application/json" }));
                console.log("Debug here", formDataToSend);

                // append profile picture if selected
                if (profilePicPreview) {
                    formDataToSend.append("profilePic", profilePicPreview);
                }
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });

                if (!userRes.ok) {
                    console.error('Failed to fetch user data:', userRes.statusText);
                    return;
                }

                const userData = await userRes.json();
                const username = userData.username;

                console.log("Decoded username:", username);
                // ---- API CALL 1: Update user details (JSON only) ----
                const detailsResponse = await fetch(`${apiUrl}/api/shop/user/edit/${username}`, {
                    method: "PUT",
                    credentials: 'include',
                    headers: {
                        "Content-Type": "application/json",

                    },
                    body: JSON.stringify(formData),
                });

                if (!detailsResponse.ok) throw new Error("Failed to update user details");
                console.log(profilePicFile);

                // ---- API CALL 2: Upload profile picture (only if file selected) ----
                if (profilePicFile) {
                    const picForm = new FormData();
                    picForm.append("profilePic", profilePicFile, profilePicFile.name);


                    console.log("Uploading profile picture...");

                    const picResponse = await fetch(`${apiUrl}/api/shop/user/edit/profilePic/${username}`, {
                        method: "PUT",
                        credentials: 'include',

                        body: picForm,
                    });

                    if (!picResponse.ok) throw new Error("Failed to update profile picture");
                }




                //alert("Profile pic updated successfully!");
                setUser({ ...formData, profilePic: profilePicPreview });
                setIsEditing(false);
                // alert("User details updated successfully!");
            } catch (error) {
                console.error("Error updating user:", error);
                alert("Something went wrong while updating user details.");
            }
            console.log('Updating user:', formData);
            const updatedUser = { ...formData, profilePic: profilePicPreview };
            setUser(updatedUser);
            setFormData(updatedUser);
            setIsEditing(false);
            // alert('User details updated successfully!');
        } else {
            setIsEditing(true);
        }
    };

    const handleProfilePicChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Create a URL for previewing the image
            setProfilePicPreview(URL.createObjectURL(file));
            // Store the file object itself for potential upload
            setFormData({ ...formData, profilePicFile: file });
            setProfilePicFile(file);
        }
    };

    const handlePasswordSubmit = async () => {
        if (passwordStep === 1) {
            try {
                // 1. Get token from localStorage


                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });

                if (!userRes.ok) {
                    console.error('Failed to fetch user data:', userRes.statusText);
                    return;
                }

                const userData = await userRes.json();
                const username = userData.username;

                // 2. Decode token to extract username

                // 3. Call generateToken API with username + entered currentPassword
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

                //const data = await response.json();
                const data = await response.text();
                if (data) {
                    console.log("Password validated successfully");
                    setPasswordStep(2); // move to next step
                } else {
                    alert("Password validation failed.");
                }
            } catch (error) {
                console.error("Error validating password:", error);
                alert("Something went wrong while validating password.");
            }
        } else {
            // Step 2: Update password
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                alert("New passwords do not match. Please try again.");
                return;
            }
            if (passwordData.newPassword.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            try {
                const storedToken = localStorage.getItem("jwt_token");
                const decoded = jwtDecode(storedToken);
                const username = decoded.sub;

                const response = await fetch(apiUrl+"/api/shop/user/updatepassword", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        credentials: 'include'// send old token for authentication
                    },
                    body: JSON.stringify({
                        username: username,
                        password: passwordData.newPassword,
                    }),
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

    const getInputStyle = (fieldHasError) => ({
        ...styles.input,
        ...(!isEditing && styles.inputDisabled),
        ...(fieldHasError && styles.inputError),
    });

    // Custom hoverable button to avoid creating a separate component
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
        <div className="glass-card" style={{ position: 'relative', padding: '20px' }}>

            <h2 style={styles.h2}>User Profile</h2>
            <div>
                <div style={styles.avatarContainer}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleProfilePicChange}
                        style={{ display: 'none' }}
                        accept="image/*"
                        disabled={!isEditing}
                    />
                    <Hoverable hoverStyle={isEditing && userSource !== 'google' ? styles.avatarHover : {}}>
                        <img
                            src={
                                profilePicPreview ||
                                'https://placehold.co/150x150/e0f7ff/00aaff?text=No+Img'
                            }
                            alt="Profile"
                            style={mergedStyles.avatar}
                            onClick={() => {
                                if (isEditing && userSource !== 'google') {
                                    fileInputRef.current.click();
                                }
                            }}
                        />
                    </Hoverable>

                    {isEditing && userSource !== 'google' && <small>Click image to change</small>}
                </div>
                <div style={styles.twoColumn}>
                    <div className="ribbon">
                        <span style={{  marginTop:'100px', alignItems: 'left' }}>Account Source: {userSource}</span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'blue', marginTop:'1px', alignItems: 'left' }}>* You cannot update Name, Email and Profile Photo if source is google</span>
                    <div style={styles.column}>

                        <div style={styles.formGroup}>
                            <label>Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                disabled={formData.userSource === 'google'}
                                readOnly={formData.userSource === 'google'}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                style={{
                                    ...getInputStyle(errors.name),
                                    cursor: userSource === 'google' ? 'not-allowed' : 'text',
                                    backgroundColor: userSource === 'google' ? '#f5f5f5' : 'white',
                                    color: userSource === 'google' ? '#888' : 'inherit'
                                }}
                            />
                            {errors.name && <div style={styles.errorMessage}>{errors.name}</div>}
                        </div>




                        <div style={styles.formGroup}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                disabled
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                style={{
                                    ...getInputStyle(errors.email),
                                    cursor: formData.userSource === 'google' ? 'not-allowed' : 'text',
                                    backgroundColor: formData.userSource === 'google' ? '#f5f5f5' : 'white',
                                    color: formData.userSource === 'google' ? '#888' : 'inherit'
                                }}
                            />
                            {errors.email && <div style={styles.errorMessage}>{errors.email}</div>}
                        </div>
                        <div style={styles.formGroup}>
                            <label>Phone</label>
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
                            <label>Address</label>
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

                    {/* Right Column */}
                    <div style={styles.column}>

                        <div style={styles.formGroup}>
                            <label>Shop Name</label>
                            <input
                                type="text"
                                value={formData.shopName || ''}
                                disabled={!isEditing}
                                onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                                style={getInputStyle(errors.shopName)}
                            />
                            {errors.shopOwner && <div style={styles.errorMessage}>{errors.shopName}</div>}
                        </div>

                        <div style={styles.formGroup}>
                            <label>Shop Owner</label>
                            <input
                                type="text"
                                value={formData.shopOwner || ''}
                                disabled={!isEditing}
                                onChange={e => setFormData({ ...formData, shopOwner: e.target.value })}
                                style={getInputStyle(errors.shopOwner)}
                            />
                            {errors.shopOwner && <div style={styles.errorMessage}>{errors.shopOwner}</div>}
                        </div>
                        <div style={styles.formGroup}>
                            <label>Shop Email</label>
                            <input
                                type="text"
                                value={formData.shopEmail || ''}
                                disabled={!isEditing}
                                onChange={e => setFormData({ ...formData, shopEmail: e.target.value })}
                                style={getInputStyle(errors.shopOwner)}
                            />
                            {errors.shopOwner && <div style={styles.errorMessage}>{errors.shopOwner}</div>}
                        </div>

                        <div style={styles.formGroup}>
                            <label>Shop Phone</label>
                            <input
                                type="number"
                                value={formData.shopPhone || ''}
                                disabled={!isEditing}
                                onChange={e => setFormData({ ...formData, shopPhone: e.target.value })}
                                style={getInputStyle(errors.shopOwner)}
                            />
                            {errors.shopOwner && <div style={styles.errorMessage}>{errors.shopOwner}</div>}
                        </div>


                        <div style={styles.formGroup}>
                            <label>Shop Location</label>
                            <input
                                type="text"
                                value={formData.shopLocation || ''}
                                disabled={!isEditing}
                                onChange={e => setFormData({ ...formData, shopLocation: e.target.value })}
                                style={getInputStyle(errors.shopLocation)}
                            />
                            {errors.shopLocation && <div style={styles.errorMessage}>{errors.shopLocation}</div>}
                        </div>

                        <div style={styles.formGroup}>
                            <label>GST Number</label>
                            <input
                                type="text"
                                value={formData.gstNumber || ''}
                                disabled={!isEditing}
                                onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                                style={getInputStyle(errors.gstNumber)}
                            />
                            {errors.gstNumber && <div style={styles.errorMessage}>{errors.gstNumber}</div>}
                        </div>
                    </div>
                </div>
            </div>

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

            {/* Password Modal */}
            {showPasswordModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>
                            {passwordStep === 1 ? 'Enter Current Password' : 'Set New Password'}
                        </h3>

                        {passwordStep === 1 ? (
                            <div style={styles.formGroup}>
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    style={styles.input}
                                />
                            </div>
                        ) : (
                            <>
                                <div style={styles.formGroup}>
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        style={styles.input}
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
