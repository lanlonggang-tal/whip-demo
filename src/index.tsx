import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import "@arco-design/web-react/dist/css/arco.css";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <div className="App-page">
    <App />
  </div>
);

