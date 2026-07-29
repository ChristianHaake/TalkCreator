import { StrictMode } from 'react';
import { LocaleProvider } from './i18n';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import './index.css';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { ContentPage } from './pages/ContentPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/:pageId" element={<ContentPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LocaleProvider>
  </StrictMode>,
);
