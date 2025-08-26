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
import { Fullscreen } from 'lucide-react';
import { useCallback, useState } from 'react';

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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleToggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      const elem = document.documentElement;

      if (elem.requestFullscreen) {
        void elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }

      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }

      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer />
      <ReactQueryDevtools initialIsOpen={false} />
      <AuthProvider>
        <Router>
          <div className='app'>
            <header className='app-header'>
              <Fullscreen
                onClick={() => handleToggleFullscreen()}
                width={50}
                height={50}
                className='cursor-pointer absolute top-2 left-2'
              />

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
