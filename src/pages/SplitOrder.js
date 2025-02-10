// src/pages/SplitOrder.js

import React, { useState } from "react";
import { allProducts } from "../data/warehouses";
import { getCartItems, getCartTotal } from "../utils/cartUtils";
import { getBitrix24 } from "../utils/bitrix24";

function SplitOrder() {
  // 1) The dummyCart (read-only, “actual order”).
  const [dummyCart] = useState({
    3: 2, // e.g., "Garden Railing"
    12: 1, // e.g., "Metal Rod"
    28: 3, // e.g., "Reinforced Concrete"
  });

  // 2) The subOrder for partial picks. Initialize with the same IDs but 0 qty.
  const initialSubOrder = Object.fromEntries(
    Object.entries(dummyCart).map(([id]) => [id, 0]),
  );
  const [subOrder, setSubOrder] = useState(initialSubOrder);

  // 3) Convert dummyCart -> array
  const dummyCartItems = getCartItems(dummyCart); // includes 0 if any
  const dummyTotal = getCartTotal(dummyCart);

  // 4) Convert subOrder -> array
  const subOrderItems = getCartItems(subOrder); // includes 0 if any
  const subOrderTotal = getCartTotal(subOrder);

  // Let user choose up to the original dummyCart’s qty
  const updateSubOrderItem = (productId, value) => {
    setSubOrder((prev) => {
      const numericId = parseInt(productId, 10);
      const product = allProducts.find((p) => p.id === numericId);
      if (!product) return prev;

      const maxAllowed = dummyCart[productId] || 0;
      const newQty = Math.min(maxAllowed, Math.max(0, Number(value)));
      return { ...prev, [productId]: newQty };
    });
  };

  // 5) Podziel zamówienie
  const handleSplitOrder = () => {
    if (subOrderTotal === dummyTotal) {
      alert(
        "Nie można podzielić zamówienia, podzamówienie ma taką samą wartość jak zamówienie główne",
      );
      return;
    }

    const bx24 = getBitrix24();

    // Error alert is shown in `getBitrix24`
    if (!bx24) {
      return;
    }
    if (bx24) {
      const dealId = bx24.placement?.info?.()?.options?.ID;
      if (!dealId) {
        alert("Nie można pobrać ID aktualnego dealu");
        return;
      }

      const addDealCallback = (result) => {
        if (result.error()) {
          console.error(result.error());
          alert("Nie udało się utworzyć dealu. Szczegóły w konsoli");
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
          bx24.callMethod(
            "crm.deal.add",
            { fields: dealData },
            addDealCallback,
          );
        }

        result.error()
          ? console.error(result.error())
          : console.info(result.data());
      };

      // Fetch deal data
      bx24.callMethod("crm.deal.get", { id: dealId }, getDealCallback);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* ============== 1) The read-only dummyCart ============== */}
        <h2>Zamówienie</h2>
        <p>Łączna kwota zamówienia: zł{dummyTotal}</p>
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
                  <td>{item.price}</td>
                  <td>{item.unit}</td>
                  <td>{item.cartQty}</td>
                  <td>{item.price * item.cartQty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <hr />

        {/* ============== 2) The subOrder table (user picks partial) ============== */}
        <h2>Podzamówienie</h2>
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
                  <td>{item.price}</td>
                  <td>{item.unit}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={dummyCart[item.id]} // can't exceed original quantity
                      value={item.cartQty}
                      onChange={(e) =>
                        updateSubOrderItem(item.id, e.target.value)
                      }
                    />
                  </td>
                  <td>{item.price * item.cartQty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Button to finalize the sub-order split */}
        <button className="place-order" onClick={handleSplitOrder}>
          Podziel zamówienie
        </button>
      </header>
    </div>
  );
}

export default SplitOrder;
