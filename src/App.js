import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";

const initialProducts = [
  { id: 1, name: "Laptop", price: 2500, quantity: 1 },
  { id: 2, name: "Smartphone", price: 1200, quantity: 1 },
  { id: 3, name: "Headphones", price: 300, quantity: 1 },
  { id: 4, name: "Keyboard", price: 150, quantity: 1 },
];

function Products() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Products List</h1>
        <div className="product-list">
          {initialProducts.map((product) => (
            <div key={product.id} className="product-item">
              <span>
                {product.name} - ${product.price}
              </span>
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

function SplitOrder() {
  const [products, setProducts] = useState(initialProducts);

  const updateQuantity = (id, delta) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === id
          ? { ...product, quantity: Math.max(1, product.quantity + delta) }
          : product
      )
    );
  };

  const total = products.reduce(
    (acc, product) => acc + product.price * product.quantity,
    0
  );

  return (
    <div className="App">
      <header className="App-header">
        <h1>Order Summary</h1>
        <div className="product-list">
          {products.map((product) => (
            <div key={product.id} className="product-item">
              <span>
                {product.name} - ${product.price}
              </span>
              <div className="quantity-controls">
                <button onClick={() => updateQuantity(product.id, -1)}>
                  -
                </button>
                <span>{product.quantity}</span>
                <button onClick={() => updateQuantity(product.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <h2>Total: ${total}</h2>
        <button onClick={() => alert("podzial zamowienia")}>
          Podziel zamówienie
        </button>
      </header>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/products" element={<Products />} />
          <Route path="/split-order" element={<SplitOrder />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
