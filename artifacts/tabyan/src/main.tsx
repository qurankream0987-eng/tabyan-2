import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installWebDesignTokens } from './lib/design-tokens';
import './index.css';

installWebDesignTokens();

// Dev-only: visual QA helpers — ?dark=1 forces dark mode, ?demo=student|teacher|admin logs in as demo
if (import.meta.env.DEV) {
  const params = new URLSearchParams(location.search);
  if (params.has('dark')) document.documentElement.classList.add('dark');
  const demo = params.get('demo');
  if (demo === 'student' || demo === 'teacher' || demo === 'admin') {
    localStorage.setItem('tabyan_token', `demo-${demo}`);
    localStorage.setItem('tabyan_role', demo);
    localStorage.setItem('tabyan_name', demo === 'student' ? 'طالب تجريبي' : demo === 'teacher' ? 'معلم تجريبي' : 'أبو تبيان');
  } else if (localStorage.getItem('tabyan_token')?.startsWith('demo-')) {
    // لا تترك وضع العرض عالقاً بعد مغادرة رابط ?demo=...
    localStorage.removeItem('tabyan_token');
    localStorage.removeItem('tabyan_role');
    localStorage.removeItem('tabyan_name');
  }
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
