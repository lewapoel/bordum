// src/pages/Products.js

import React, { useContext, useEffect, useMemo, useState } from "react";
import { getCartItems, getCartTotal } from "../utils/cartUtils";
import { getWarehouses } from "../api/warehouse";
import { AuthContext } from "../api/auth";
import { getWarehouseItems } from "../api/item";
import { PRICES } from "../data/prices";

function Products() {
  const { token } = useContext(AuthContext);
  const [warehouses, setWarehouses] = useState(null);
  const [products, setProducts] = useState([]);

  const [userCart, setUserCart] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState();
  const [selectedPrice, setSelectedPrice] = useState("zakupu");

  // Filter warehouse products by name
  const filteredProducts = useMemo(
    () =>
      products?.filter?.((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [products, searchTerm],
  );

  // Update local cart
  const onUpdateUserCartItem = (productId, value) => {
    setUserCart((prevCart) => {
      const numericId = parseInt(productId, 10);
      const product = products.find((p) => p.id === numericId);
      if (!product) return prevCart;

      const newQuantity = Math.min(
        product.quantity,
        Math.max(0, Number(value)),
      );
      return { ...prevCart, [productId]: newQuantity };
    });
  };

  // For the summary, hide items with qty=0
  const cartItems = getCartItems(products, selectedPrice, userCart).filter(
    (item) => item.cartQty > 0,
  );
  const cartTotal = getCartTotal(products, selectedPrice, userCart);

  useEffect(() => {
    if (token) {
      getWarehouses(token).then((warehousesData) => {
        if (warehousesData) {
          setWarehouses(warehousesData);
        }
      });
    }
  }, [token]);

  useEffect(() => {
    if (token && selectedWarehouse) {
      getWarehouseItems(selectedWarehouse, token).then((items) => {
        if (items) {
          setProducts(items);
        }
      });
    }
  }, [token, selectedWarehouse]);

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
                  <td>{item.prices[selectedPrice].value}</td>
                  <td>{item.unit}</td>
                  <td>{item.cartQty}</td>
                  <td>
                    {(item.prices[selectedPrice].value * item.cartQty).toFixed(
                      2,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Łączna kwota: zł{cartTotal.toFixed(2)}</h2>
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
          {warehouses ? (
            warehouses.map((warehouse) => (
              <button
                key={warehouse.id}
                onClick={() => {
                  if (selectedWarehouse !== warehouse.id) {
                    setProducts(null);
                    setSelectedWarehouse(warehouse.id);
                  }
                }}
              >
                {warehouse.name}
              </button>
            ))
          ) : (
            <h1>Ładowanie magazynów...</h1>
          )}
        </div>

        <input
          type="text"
          placeholder="Wyszukaj surowiec..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="searchbar"
        />

        <select
          className="prices"
          value={selectedPrice}
          onChange={(e) => setSelectedPrice(e.target.value)}
        >
          {PRICES.map((price, idx) => (
            <option value={price} key={idx}>
              {price}
            </option>
          ))}
        </select>

        {/* ============== Main table for selected warehouse ============== */}
        {products ? (
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
                    <td>{product.prices[selectedPrice].value}</td>
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
                    <td>
                      {(
                        product.prices[selectedPrice].value * currentQty
                      ).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <h1>Ładowanie produktów...</h1>
        )}
      </header>
    </div>
  );
}

export default Products;
