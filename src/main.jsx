import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Teste de sinal de vida
const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.innerHTML = '<div style="color: white; background: red; padding: 20px; font-weight: bold; text-align: center;">CARREGANDO PLATAFORMA... (Se você vê isso, o código está rodando)</div>';
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
