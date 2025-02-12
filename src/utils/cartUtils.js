// src/utils/cartUtils.js

// Calculate sum for a given cart object
export function getCartTotal(products, selectedPrice, cart) {
  return Object.entries(cart)
    .reduce((acc, [id, qty]) => {
      const product = products.find((p) => p.id === parseInt(id, 10));
      return acc + (product?.prices[selectedPrice].value || 0) * qty;
    }, 0)
    .toFixed(2);
}

// Return array of { ...product, cartQty } from the cart object
export function getCartItems(products, selectedPrice, cart) {
  return Object.entries(cart)
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === parseInt(id, 10));
      if (!product) return null;
      // Keep the item even if qty=0
      return { ...product, cartQty: qty };
    })
    .filter((item) => item !== null);
}
