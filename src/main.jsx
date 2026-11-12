import React from 'react';
import { createRoot } from 'react-dom/client';
import LunchRadar from './LunchRadar.jsx';
import './corporate.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LunchRadar />
  </React.StrictMode>,
);