// --- Entry point ---
// This is the very first file React runs. It mounts the entire app onto the
// single <div id="root"> in index.html.
//
// QueryClientProvider wraps everything so any component can use useQuery()
// to fetch data from the server.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';

// QueryClient holds the cache of all server data fetched by the app.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,  // data is "fresh" for 30 seconds before re-fetching
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
