import React from 'react';
import { createRoot } from 'react-dom/client';
import LibraryWidget from './LibraryWidget';
import { createLibraryBridge } from './bridge';
import './widget.css';

const element = document.getElementById('biblioteca-widget');
if (!element) throw new Error('No se encontró el panel de Biblioteca.');
const bridge = createLibraryBridge();
createRoot(element).render(<LibraryWidget bridge={bridge} />);
