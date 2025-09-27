// context/BillingContext.js
import { createContext, useContext, useState } from "react";

const BillingContext = createContext();
export const useBilling = () => useContext(BillingContext);

export const BillingProvider = ({ children }) => {
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [products, setProducts] = useState([]); // store products with stock

    const loadProducts = (productList) => setProducts(productList);

    const addProduct = (product) => {
        if (product.stock <= 0) return; // no stock, no adding
        setProducts(prev =>
            prev.map(p =>
                p.id === product.id ? { ...p, stock: p.stock - 1 } : p
            )
        );
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            return existing
                ? prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
                : [...prev, { ...product, quantity: 1, details: product.details || '' }];
        });
    };

    const removeProduct = (productId) => {
        const removedItem = cart.find(item => item.id === productId);
        if (removedItem) {
            // return stock to product list
            setProducts(prev =>
                prev.map(p =>
                    p.id === removedItem.id ? { ...p, stock: p.stock + removedItem.quantity } : p
                )
            );
        }
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    // new: update cart item fields (quantity, details, sellingPrice, etc.)
    const updateCartItem = (productId, changes) => {
        setCart(prev => prev.map(item => item.id === productId ? { ...item, ...changes } : item));
    };

    const clearBill = () => {
        setSelectedCustomer(null);
        setCart([]);
        setPaymentMethod('CASH');
        // optional: reset product stocks to original by refetching
    };

    return (
        <BillingContext.Provider
            value={{
                selectedCustomer, setSelectedCustomer,
                cart, addProduct, removeProduct,
                paymentMethod, setPaymentMethod,
                clearBill, products, loadProducts,
                updateCartItem
            }}
        >
            {children}
        </BillingContext.Provider>
    );
};
