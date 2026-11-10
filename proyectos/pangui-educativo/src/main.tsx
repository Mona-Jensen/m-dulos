import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css' // Esta es la línea que causaba el error
import './config/i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)