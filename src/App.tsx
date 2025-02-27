// src/App.js

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Products from "./pages/Products";
import SplitOrder from "./pages/SplitOrder";
import Order from "./pages/Order/Order.tsx";
import { AuthProvider } from "./components/AuthProvider.tsx";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <AuthProvider>
        <Router>
          <div className="App">
            <header className="App-header">
              <Routes>
                {/* These routes are never shown inside the pages themselves */}
                <Route path="/products" element={<Products />} />
                <Route path="/split-order" element={<SplitOrder />} />
                <Route path="/order" element={<Order />} />
              </Routes>
            </header>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
