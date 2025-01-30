// src/App.js

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

import Products from "./pages/Products";
import SplitOrder from "./pages/SplitOrder";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* These routes are never shown inside the pages themselves */}
          <Route path="/products" element={<Products />} />
          <Route path="/split-order" element={<SplitOrder />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
