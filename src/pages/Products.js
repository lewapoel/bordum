// src/pages/Products.js

import React, { useState } from "react";
import { warehouses, allProducts } from "../data/warehouses";
import { getCartItems, getCartTotal } from "../utils/cartUtils";

function Products() {
  const [userCart, setUserCart] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("Ogrodzenia");

  const products = warehouses[selectedWarehouse] || [];

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const dealId = urlParams.get("dealId");
  console.log(dealId);

  // Filter warehouse products by name
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update local cart
  const onUpdateUserCartItem = (productId, value) => {
    setUserCart((prevCart) => {
      const numericId = parseInt(productId, 10);
      const product = allProducts.find((p) => p.id === numericId);
      if (!product) return prevCart;

      const newQuantity = Math.min(
        product.quantity,
        Math.max(0, Number(value))
      );
      return { ...prevCart, [productId]: newQuantity };
    });
  };

  // For the summary, hide items with qty=0
  const cartItems = getCartItems(userCart).filter((item) => item.cartQty > 0);
  const cartTotal = getCartTotal(userCart);

  return (
    <div className="App">
      <header className="App-header">
        {/* ====================== SUMMARY (no 0-qty) ====================== */}
        <h1>Zamówienie</h1>
        {cartItems.length === 0 ? (
          <p>Brak wybranych produktów.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Cena (zł)</th>
                <th>Jednostka</th>
                <th>Ilość</th>
                <th>Razem (zł)</th>
              </tr>
            </thead>
            <tbody>
              {cartItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.price}</td>
                  <td>{item.unit}</td>
                  <td>{item.cartQty}</td>
                  <td>{item.price * item.cartQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Łączna kwota: zł{cartTotal}</h2>
        <button
          className="place-order"
          onClick={() => alert("Złóż zamówienie")}
        >
          Złóż zamówienie
        </button>

        <hr />
        <h2>Magazyn</h2>

        {/* ============== Warehouse selection + search ============== */}
        <div className="warehouses">
          {Object.keys(warehouses).map((warehouseName) => (
            <button
              key={warehouseName}
              onClick={() => setSelectedWarehouse(warehouseName)}
            >
              {warehouseName}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Wyszukaj surowiec..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="searchbar"
        />

        {/* ============== Main table for selected warehouse ============== */}
        <table>
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Cena (zł)</th>
              <th>Dostępność</th>
              <th>Jednostka</th>
              <th>Ilość</th>
              <th>Razem (zł)</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const currentQty = userCart[product.id] || 0;
              return (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.price}</td>
                  <td>{product.quantity}</td>
                  <td>{product.unit}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={product.quantity}
                      value={currentQty}
                      onChange={(e) =>
                        onUpdateUserCartItem(product.id, e.target.value)
                      }
                    />
                  </td>
                  <td>{product.price * currentQty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </header>
    </div>
  );
}

export default Products;
