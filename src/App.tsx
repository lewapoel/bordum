import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SplitOrder from './pages/SplitOrder';
import Order from './pages/Order/Order.tsx';
import { AuthProvider } from './components/AuthProvider.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Packaging from './pages/Packaging.tsx';
import ReleaseDocuments from './pages/ReleaseDocuments.tsx';
import CreateOrder from './pages/Order/CreateOrder.tsx';
import { ToastContainer } from 'react-toastify';
import Verification from './pages/Verification.tsx';
import Return from './pages/Return.tsx';
import './App.css';

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
      <ToastContainer />
      <ReactQueryDevtools initialIsOpen={false} />
      <AuthProvider>
        <Router>
          <div className='app'>
            <header className='app-header'>
              <Routes>
                <Route path='/split-order' element={<SplitOrder />} />
                <Route path='/order' element={<Order />} />
                <Route path='/create-order' element={<CreateOrder />} />
                <Route path='/packaging' element={<Packaging />} />
                <Route path='/verification' element={<Verification />} />
                <Route
                  path='/release-documents'
                  element={<ReleaseDocuments />}
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
