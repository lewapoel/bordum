// src/pages/SplitOrder.js

import { useContext, useEffect, useState } from "react";
import { getCartItems, getCartTotal } from "../utils/cartUtils";
import {
  getBitrix24,
  getCurrentPlacementId,
  getCurrentDealOrderData,
} from "../utils/bitrix24";
import { AuthContext } from "../api/auth";
import { useGetItems } from "../api/item";
import { ORDER_DATA_FIELD_ID } from "../api/const";

function SplitOrder() {
  const dealId = getCurrentPlacementId();
  const { token } = useContext(AuthContext);
  const [allProducts, setAllProducts] = useState<any>(null);

  const itemsQuery = useGetItems(token);

  const [cartItems, setCartItems] = useState<any>(null);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  // 2) The subOrder for partial picks.
  const [subOrder, setSubOrder] = useState<any>(null);

  // 3) Convert cartItems -> array
  const dummyCartItems = getCartItems(allProducts, selectedPrice, cartItems); // includes 0 if any
  const dummyTotal = getCartTotal(allProducts, selectedPrice, cartItems);

  // 4) Convert subOrder -> array
  const subOrderItems = getCartItems(allProducts, selectedPrice, subOrder); // includes 0 if any
  const subOrderTotal = getCartTotal(allProducts, selectedPrice, subOrder);

  // Let user choose up to the original cartItems’s qty
  const updateSubOrderItem = (productId: any, value: any) => {
    setSubOrder((prev: any) => {
      const numericId = parseInt(productId, 10);
      const product = allProducts.find((p: any) => p.id === numericId);
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

    if (!dealId) {
      alert("Nie można pobrać ID aktualnego dealu");
      return;
    }

    const bx24 = getBitrix24();

    const addDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się utworzyć zamówienia. Szczegóły w konsoli");
      } else {
        alert("Nowe zamówienie utworzone pomyślnie");
      }
    };

    const editDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się zaktualizować zamówienia. Szczegóły w konsoli");
      } else {
        alert("Zamówienie zaktualizowane pomyślnie");
      }
    };

    const getDealCallback = (result: any) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się pobrać danych zamówienia. Szczegóły w konsoli");
      } else {
        const dealData = result.data();
        delete dealData.ID; // Not needed for creating new deal

        dealData[ORDER_DATA_FIELD_ID] = JSON.stringify({
          userCart: Object.entries(subOrder).reduce(
            (acc: any, [key, value]: any) => {
              if (value > 0) {
                acc[key] = value;
              }

              return acc;
            },
            {},
          ),
          selectedPrice,
          selectedWarehouse,
        });

        // Add new deal
        bx24.callMethod("crm.deal.add", { fields: dealData }, addDealCallback);

        const updateBody: any = {
          id: dealId,
          fields: {},
        };

        updateBody.fields[ORDER_DATA_FIELD_ID] = JSON.stringify({
          userCart: Object.entries(cartItems).reduce(
            (acc: any, [key, value]: any) => {
              if (
                value > 0 &&
                (!Object.keys(subOrder).includes(key) || subOrder[key] === 0)
              ) {
                acc[key] = value;
              }

              return acc;
            },
            {},
          ),
          selectedPrice,
          selectedWarehouse,
        });

        // Update deal order data
        bx24.callMethod("crm.deal.update", updateBody, editDealCallback);
      }
    };

    // Fetch deal data
    bx24.callMethod("crm.deal.get", { id: dealId }, getDealCallback);
  };

  useEffect(() => {
    if (itemsQuery.data) {
      setAllProducts(itemsQuery.data);
    }
  }, [itemsQuery]);

  useEffect(() => {
    if (dealId) {
      getCurrentDealOrderData().then((dealData: any) => {
        if (dealData) {
          const {
            userCart: cart,
            selectedPrice: price,
            selectedWarehouse: warehouse,
          } = dealData;

          if (cart && price && warehouse) {
            setSubOrder(
              Object.fromEntries(Object.entries(cart).map(([id]) => [id, 0])),
            );
            setSelectedWarehouse(warehouse);
            setSelectedPrice(price);
            setCartItems(cart);
          } else {
            // Mark that the order doesn't exist
            setCartItems([]);
          }
        } else {
          // Mark that the order doesn't exist
          setCartItems([]);
        }
      });
    }
  }, [dealId]);

  return (
    <>
      {cartItems &&
      Object.keys(cartItems)?.length > 0 &&
      selectedPrice &&
      allProducts ? (
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
        <>
          {!cartItems || !allProducts ? (
            <h1>Ładowanie zamówienia...</h1>
          ) : (
            <>
              <h1>Brak danych zamówienia</h1>
              <button
                className="place-order"
                onClick={() => window.location.reload()}
              >
                Odśwież
              </button>
            </>
          )}
        </>
      )}
    </>
  );
}

export default SplitOrder;
