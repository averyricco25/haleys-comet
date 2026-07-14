import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ShowsProvider } from './context/ShowsContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ShowsProvider>
          <App />
        </ShowsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
