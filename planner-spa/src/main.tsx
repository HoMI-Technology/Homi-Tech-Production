import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// HōMI canon typography — self-hosted variable fonts, no CDN
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces/standard-italic.css'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
