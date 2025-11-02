// context/BillingContext.js
import { createContext, useContext, useState, useCallback, useMemo } from "react";

const BillingContext = createContext();
export const useBilling = () => useContext(BillingContext);

export const BillingProvider = ({ children }) => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [products, setProducts] = useState([]); // store products with stock
    const [payingAmount, setPayingAmount] = useState(0);
    const [isPayingAmountManuallySet, setIsPayingAmountManuallySet] = useState(false);

    // --- All context functions are now wrapped in useCallback ---

    const loadProducts = useCallback((productList) => {
        setProducts(productList);
    }, []);

    const addProduct = useCallback((product) => {
        if (product.stock <= 0) return; // no stock, no adding

        // Note: Stock is now managed within the product data itself,
        // so we don't need to manage a separate `products` list state here.
        // The stock check is sufficient.

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                // Increment quantity if item exists
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            // Add new item to cart
            return [...prev, { ...product, quantity: 1, details: product.details || '' }];
        });
    }, []);

    const removeProduct = useCallback((productId) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    }, []);

    const updateCartItem = useCallback((productId, changes) => {
        setCart(prev => prev.map(item => item.id === productId ? { ...item, ...changes } : item));
    }, []);

    const clearBill = useCallback(() => {
        setSelectedCustomer(null);
        setCart([]);
        setPaymentMethod('CASH');
        setPayingAmount(0);
        setIsPayingAmountManuallySet(false);
    }, []);

    // --- The context value is wrapped in useMemo for performance ---
    // This ensures the value object is not recreated on every render
    const value = useMemo(() => ({
        selectedCustomer,
        setSelectedCustomer,
        cart,
        addProduct,
        removeProduct,
        paymentMethod,
        setPaymentMethod,
        clearBill,
        products,
        loadProducts,
        updateCartItem,
        // --- Add these four new values ---
        payingAmount,
        setPayingAmount,
        isPayingAmountManuallySet,
        setIsPayingAmountManuallySet
    }), [
        selectedCustomer,
        cart,
        paymentMethod,
        products,
        // --- Add the 4 new values to the dependency array ---
        payingAmount,
        isPayingAmountManuallySet,
        addProduct,
        removeProduct,
        clearBill,
        loadProducts,
        updateCartItem
    ]);

    return (
        <BillingContext.Provider value={value}>
            {children}
        </BillingContext.Provider>
    );
};