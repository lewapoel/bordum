// src/pages/SplitOrder.js

import React, { useContext, useEffect, useState } from "react";
import { getCartItems, getCartTotal } from "../utils/cartUtils";
import {
  getBitrix24,
  getCurrentDealId,
  getCurrentDealOrderData,
} from "../utils/bitrix24";
import { AuthContext } from "../api/auth";
import { getItems } from "../api/item";

function SplitOrder() {
  const { token } = useContext(AuthContext);
  const [allProducts, setAllProducts] = useState(null);

  const [cartItems, setCartItems] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(null);

  // 2) The subOrder for partial picks.
  const [subOrder, setSubOrder] = useState(null);

  // 3) Convert cartItems -> array
  const dummyCartItems = getCartItems(allProducts, selectedPrice, cartItems); // includes 0 if any
  const dummyTotal = getCartTotal(allProducts, selectedPrice, cartItems);

  // 4) Convert subOrder -> array
  const subOrderItems = getCartItems(allProducts, selectedPrice, subOrder); // includes 0 if any
  const subOrderTotal = getCartTotal(allProducts, selectedPrice, subOrder);

  // Let user choose up to the original cartItems’s qty
  const updateSubOrderItem = (productId, value) => {
    setSubOrder((prev) => {
      const numericId = parseInt(productId, 10);
      const product = allProducts.find((p) => p.id === numericId);
      if (!product) return prev;

      const maxAllowed = cartItems[productId] || 0;
      const newQty = Math.min(maxAllowed, Math.max(0, Number(value)));
      return { ...prev, [productId]: newQty };
    });
  };

  // 5) Podziel zamówienie
  const handleSplitOrder = () => {
    if (subOrderTotal === 0) {
      alert(
        "Nie można podzielić zamówienia, podzamówienie musi mieć minimum jedną ilość produktu",
      );
      return;
    }

    if (subOrderTotal === dummyTotal) {
      alert(
        "Nie można podzielić zamówienia, podzamówienie ma taką samą wartość jak zamówienie główne",
      );
      return;
    }

    const dealId = getCurrentDealId();
    if (!dealId) {
      return;
    }

    const bx24 = getBitrix24();

    const addDealCallback = (result) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się utworzyć deala. Szczegóły w konsoli");
      } else {
        alert("Zamówienie podzielone pomyślnie");
      }
    };

    const getDealCallback = (result) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się pobrać danych deala. Szczegóły w konsoli");
      } else {
        let dealData = result.data();
        delete dealData.ID; // Not needed for creating new deal

        // Add new deal
        bx24.callMethod("crm.deal.add", { fields: dealData }, addDealCallback);
      }
    };

    // Fetch deal data
    bx24.callMethod("crm.deal.get", { id: dealId }, getDealCallback);
  };

  useEffect(() => {
    if (token) {
      getItems(token).then((itemsData) => {
        if (itemsData) {
          setAllProducts(itemsData);
        }
      });
    }
  }, [token]);

  useEffect(() => {
    getCurrentDealOrderData().then(({ items, price }) => {
      setCartItems(items);
      setSelectedPrice(price);
      setSubOrder(
        Object.fromEntries(Object.entries(items).map(([id]) => [id, 0])),
      );
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {cartItems && selectedPrice && allProducts ? (
          <>
            {/* ============== 1) The read-only cartItems ============== */}
            <h2>Zamówienie</h2>
            <p>Rodzaj ceny: {selectedPrice}</p>
            <p>Łączna kwota zamówienia: zł{dummyTotal.toFixed(2)}</p>
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
                {dummyCartItems.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Brak wybranych produktów.</td>
                  </tr>
                ) : (
                  dummyCartItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.prices[selectedPrice].value}</td>
                      <td>{item.unit}</td>
                      <td>{item.cartQty}</td>
                      <td>
                        {(
                          item.prices[selectedPrice].value * item.cartQty
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <hr />

            {/* ============== 2) The subOrder table (user picks partial) ============== */}
            <h2>Podzamówienie</h2>
            <p>Rodzaj ceny: {selectedPrice}</p>
            <p>Łączna kwota podzamówienia: zł{subOrderTotal}</p>
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
                {subOrderItems.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Brak produktów do podziału.</td>
                  </tr>
                ) : (
                  subOrderItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.prices[selectedPrice].value}</td>
                      <td>{item.unit}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={cartItems[item.id]} // can't exceed original quantity
                          value={item.cartQty}
                          onChange={(e) =>
                            updateSubOrderItem(item.id, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        {(
                          item.prices[selectedPrice].value * item.cartQty
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {/* Button to finalize the sub-order split */}
            <button className="place-order" onClick={handleSplitOrder}>
              Podziel zamówienie
            </button>
          </>
        ) : (
          <h1>Ładowanie zamówienia...</h1>
        )}
      </header>
    </div>
  );
}

export default SplitOrder;
