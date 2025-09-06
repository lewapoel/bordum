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
import { useLayoutEffect, useRef, useState } from 'react';

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

  useLayoutEffect(() => {
    function updateZoom() {
      if (!contentRef.current) {
        return;
      }

      // Adjust for padding
      const offsetWidth = contentRef.current.offsetWidth + 80;
      if (offsetWidth === 0) {
        return;
      }

      const newZoom = Math.min(1, window.innerWidth / offsetWidth);
      setZoom(newZoom);
    }

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
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
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
                step='0.1'
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
              <span>{(zoom * 100).toFixed(0)}%</span>
            </div>

            <header
              ref={contentRef}
              style={{ scale: zoom }}
              className='app-header w-max origin-top-left mx-auto'
            >
              <Routes>
                <Route path='/split-order' element={<SplitOrder />} />
                <Route path='/order' element={<Order />} />
                <Route path='/create-order' element={<CreateOrder />} />
                <Route path='/packaging' element={<Packaging />} />
                <Route path='/verification' element={<Verification />} />
                <Route path='/client-balance' element={<ClientBalances />} />
                <Route
                  path='/single-client-balance'
                  element={<ClientBalance />}
                />
                <Route path='/return' element={<Return />} />
              </Routes>
            </header>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
