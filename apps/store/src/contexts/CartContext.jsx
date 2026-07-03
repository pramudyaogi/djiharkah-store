import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('djiharkah_cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        const now = new Date().getTime();
        const THIRTY_MINS = 30 * 60 * 1000;
        return parsedCart.filter(item => (now - item.addedAt) < THIRTY_MINS);
      } catch (error) {
        console.error("Failed to parse cart:", error);
      }
    }
    return [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // Save to local storage whenever cart changes
  useEffect(() => {
    localStorage.setItem('djiharkah_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Set interval to automatically clear expired items every 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCartItems(prevItems => {
        const now = new Date().getTime();
        const THIRTY_MINS = 30 * 60 * 1000;
        const validItems = prevItems.filter(item => (now - item.addedAt) < THIRTY_MINS);
        if (validItems.length !== prevItems.length) {
          return validItems;
        }
        return prevItems;
      });
    }, 60 * 1000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const addToCart = (product, quantity, promoQty = 0, promoPrice = 0, normalQty = 0, normalPrice = 0) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      const addedAt = new Date().getTime();
      
      if (existingIndex >= 0) {
        // Update existing item
        const newItems = [...prev];
        const existingItem = newItems[existingIndex];
        
        // Recalculate if there is promo (simple sum logic, in reality we might need complex promo check, but we pass it from ProductDetail)
        newItems[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + quantity,
          addedAt,
          promoQty: existingItem.promoQty + promoQty,
          promoPrice: promoPrice || existingItem.promoPrice,
          normalQty: existingItem.normalQty + normalQty,
          normalPrice: normalPrice || existingItem.normalPrice
        };
        return newItems;
      } else {
        // Add new item
        return [...prev, { product, quantity, addedAt, promoQty, promoPrice, normalQty, normalPrice }];
      }
    });
    // setIsCartOpen(true); // User wants only the floating popup to show
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prev => prev.map(item => {
      if (item.product.id === productId) {
        // Recalculate split if promo exists
        const isPromoActive = !!item.product.promo_type;
        const promoStockAvailable = isPromoActive ? (item.product.stock || 0) : 0;
        const pQty = isPromoActive ? Math.min(newQuantity, promoStockAvailable) : 0;
        const nQty = isPromoActive ? Math.max(0, newQuantity - promoStockAvailable) : newQuantity;

        return { 
          ...item, 
          quantity: newQuantity,
          promoQty: pQty,
          normalQty: nQty,
          addedAt: new Date().getTime() // refresh timer on update
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartTotalItems
    }}>
      {children}
    </CartContext.Provider>
  );
}
