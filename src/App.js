import React, { useState } from "react";
import "./App.css";

const initialProducts = [
  { id: 1, name: "Laptop", price: 2500, quantity: 1 },
  { id: 2, name: "Smartphone", price: 1200, quantity: 1 },
  { id: 3, name: "Headphones", price: 300, quantity: 1 },
  { id: 4, name: "Keyboard", price: 150, quantity: 1 },
];

function App() {
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
        <button className="split-button">Split Order</button>
      </header>
    </div>
  );
}

export default App;
