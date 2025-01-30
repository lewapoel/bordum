// src/utils/cartUtils.js
import { allProducts } from "../data/warehouses";

// Calculate sum for a given cart object
export function getCartTotal(cart) {
  return Object.entries(cart).reduce((acc, [id, qty]) => {
    const product = allProducts.find((p) => p.id === parseInt(id, 10));
    return acc + (product?.price || 0) * qty;
  }, 0);
}

// Return array of { ...product, cartQty } from the cart object
export function getCartItems(cart) {
  return Object.entries(cart)
    .map(([id, qty]) => {
      const product = allProducts.find((p) => p.id === parseInt(id, 10));
      if (!product) return null;
      // Keep the item even if qty=0
      return { ...product, cartQty: qty };
    })
    .filter((item) => item !== null);
}
