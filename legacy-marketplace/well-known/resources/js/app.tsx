import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from './Lib/wagmi';
import { ThemeProvider } from './contexts/ThemeContext';

const queryClient = new QueryClient();

const appName = import.meta.env.VITE_APP_NAME || 'RWA Tokenization';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx')
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ThemeProvider defaultTheme="dark">
                <QueryClientProvider client={queryClient}>
                    <WagmiProvider config={wagmiConfig}>
                        <App {...props} />
                    </WagmiProvider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    },
    progress: {
        color: '#3b82f6',
    },
});
