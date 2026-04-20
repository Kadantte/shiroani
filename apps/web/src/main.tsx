import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

// Bundled typography — avoids CSP round-trips to fonts.googleapis.com and
// keeps the app readable offline. DM Sans + JetBrains Mono ship as variable
// fonts; Shippori Mincho ships as per-weight files (we only use 700 + 800).
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/shippori-mincho/700.css';
import '@fontsource/shippori-mincho/800.css';

import './styles/globals.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <TooltipProvider delayDuration={300}>
      <App />
      <Toaster />
    </TooltipProvider>
  </StrictMode>
);
