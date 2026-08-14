import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Icons, served from our own origin rather than a CDN.
 *
 * The CDN <link> this replaces was a single point of failure for all 31 icons: any
 * blocked request (extension, filtered DNS, offline, or a captive network) rendered
 * every icon as a tofu box, because the stylesheet's PUA glyphs have no fallback.
 * Bundling makes the icons as available as the app itself. Also removes ~70 KB of
 * external blocking request on first paint (P2-08).
 *
 * Imported BEFORE index.css so our own tokens and utilities win any collision.
 */
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
