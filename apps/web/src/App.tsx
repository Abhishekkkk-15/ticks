import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Features } from './pages/Features'
import { Docs } from './pages/Docs'
import { Download } from './pages/Download'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="features" element={<Features />} />
          <Route path="docs" element={<Docs />} />
          <Route path="download" element={<Download />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
