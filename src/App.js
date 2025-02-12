// src/App.js

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Products from "./pages/Products";
import SplitOrder from "./pages/SplitOrder";
import { AuthProvider } from "./api/auth";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* These routes are never shown inside the pages themselves */}
            <Route path="/products" element={<Products />} />
            <Route path="/split-order" element={<SplitOrder />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
