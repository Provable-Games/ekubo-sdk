import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EkuboProvider } from 'ekubo-sdk/react'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EkuboProvider>
      <App />
    </EkuboProvider>
  </StrictMode>,
)
