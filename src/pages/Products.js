// src/pages/Products.js

import React, { useContext, useEffect, useMemo, useState } from "react";
import { getCartItems, getCartTotal } from "../utils/cartUtils";
import { getWarehouses } from "../api/warehouse";
import { AuthContext } from "../api/auth";
import { getWarehouseItems } from "../api/item";
import { PRICES } from "../data/prices";
import {
  getBitrix24,
  getCurrentDealId,
  getCurrentDealOrderData,
} from "../utils/bitrix24";
import { ORDER_DATA_FIELD_ID } from "../api/const";

function Products() {
  const { token } = useContext(AuthContext);
  const [firstLoad, setFirstLoad] = useState(false);
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
  const cartItems = useMemo(
    () =>
      getCartItems(products, selectedPrice, userCart).filter(
        (item) => item.cartQty > 0,
      ),
    [products, selectedPrice, userCart],
  );

  const cartTotal = useMemo(
    () => getCartTotal(products, selectedPrice, userCart),
    [products, selectedPrice, userCart],
  );

  const placeOrder = async () => {
    const dealId = await getCurrentDealId();
    if (!dealId) {
      return;
    }

    const bx24 = getBitrix24();

    const updateOrderDataCallback = (result) => {
      if (result.error()) {
        console.error(result.error());
        alert("Nie udało się zapisać danych zamówienia. Szczegóły w konsoli");
      } else {
        alert("Dane zamówienia zapisane pomyślnie");
      }
    };

    let updateBody = {
      id: dealId,
      fields: {},
    };

    updateBody.fields[ORDER_DATA_FIELD_ID] = JSON.stringify({
      userCart: Object.entries(userCart).reduce((acc, [key, value]) => {
        if (value > 0) {
          acc[key] = value;
        }

        return acc;
      }, {}),
      selectedPrice,
      selectedWarehouse,
    });

    // Update deal order data
    bx24.callMethod("crm.deal.update", updateBody, updateOrderDataCallback);
  };

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
          setFirstLoad(true);
        }
      });
    }
  }, [token, selectedWarehouse]);

  useEffect(() => {
    getCurrentDealOrderData().then((dealData) => {
      if (dealData) {
        const {
          userCart: cart,
          selectedPrice: price,
          selectedWarehouse: warehouse,
        } = dealData;

        if (cart && price) {
          setUserCart(cart);
          setSelectedPrice(price);
          setSelectedWarehouse(warehouse);
        }
      } else {
        setFirstLoad(true);
      }
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        {firstLoad ? (
          <>
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
                        {(
                          item.prices[selectedPrice].value * item.cartQty
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h2>Łączna kwota: zł{cartTotal.toFixed(2)}</h2>
            <button className="place-order" onClick={() => placeOrder()}>
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
          </>
        ) : (
          <h1>Ładowanie danych zamówienia...</h1>
        )}
      </header>
    </div>
  );
}

export default Products;
