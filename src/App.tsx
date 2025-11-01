import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SplitOrder from './pages/SplitOrder';
import Order from './pages/Order/Order.tsx';
import { AuthProvider } from './components/AuthProvider.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Packaging from './pages/Packaging.tsx';
import CreateOrder from './pages/Order/CreateOrder.tsx';
import { ToastContainer } from 'react-toastify';
import Verification from './pages/Verification.tsx';
import ClientBalances from './pages/ClientBalance/ClientBalances.tsx';
import Return from './pages/Return.tsx';
import './App.css';
import ClientBalance from './pages/ClientBalance/ClientBalance.tsx';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Calculator from '@/pages/Calculator/Calculator.tsx';
import AcceptPayment from '@/pages/AcceptPayment.tsx';
import CreateDealOrder from '@/pages/Order/CreateDealOrder.tsx';

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
  const contentRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1);
  const zoomOverride = useRef(false);

  const updateZoom = useCallback(() => {
    if (!contentRef.current) {
      return;
    }

    const contentWidth = contentRef.current.offsetWidth + 100;
    const newZoom = Math.min(1, window.innerWidth / contentWidth);

    if (!zoomOverride.current) {
      setZoom((prev) => {
        const delta = Math.abs(prev - newZoom);

        if (delta >= 0.01) {
          return newZoom;
        }

        return prev;
      });
    } else {
      zoomOverride.current = false;
    }
  }, []);

  useLayoutEffect(() => {
    updateZoom();

    // Track content resize
    const ro = new ResizeObserver(updateZoom);
    if (contentRef.current) {
      ro.observe(contentRef.current);
    }

    // Track window resize
    window.addEventListener('resize', updateZoom);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateZoom);
    };
  }, [updateZoom]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer closeButton={false} />
      <ReactQueryDevtools initialIsOpen={false} />
      <AuthProvider>
        <Router>
          <div className='app p-4'>
            <div className='flex items-center gap-2 text-2xl'>
              <label htmlFor='zoom'>Zoom:</label>
              <input
                id='zoom'
                type='range'
                min='0.1'
                max='1'
                step='0.01'
                value={zoom}
                onChange={(e) => {
                  zoomOverride.current = true;
                  setZoom(parseFloat(e.target.value));
                }}
              />
              <span>{(zoom * 100).toFixed(0)}%</span>
            </div>

            <header
              ref={contentRef}
              style={{ zoom: zoom }}
              className='app-header w-max mx-auto'
            >
              <Routes>
                <Route path='/split-order' element={<SplitOrder />} />
                <Route path='/order' element={<Order />} />
                <Route path='/create-order' element={<CreateOrder />} />
                <Route
                  path='/create-deal-order'
                  element={<CreateDealOrder />}
                />
                <Route path='/packaging' element={<Packaging />} />
                <Route path='/verification' element={<Verification />} />
                <Route path='/client-balance' element={<ClientBalances />} />
                <Route
                  path='/single-client-balance'
                  element={<ClientBalance />}
                />
                <Route path='/return' element={<Return />} />
                <Route path='/calculator' element={<Calculator />} />
                <Route path='/accept-payment' element={<AcceptPayment />} />
              </Routes>
            </header>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
