import React from 'react';
import ReactDOM from 'react-dom/client';
import { ToyFluidApp } from './ToyFluidApp';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToyFluidApp />
  </React.StrictMode>
);
