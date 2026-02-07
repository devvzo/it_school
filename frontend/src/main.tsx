import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './setupAxios';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProgressProvider } from './context/ProgressContext';
import { XpFlyProvider } from './context/XpFlyContext';

// Глобальные ограничения на копирование/контекстное меню.
// Оставляем нормальное поведение только в формах (input/textarea/contenteditable),
// чтобы не ломать ввод данных.
if (typeof document !== 'undefined') {
  const isFormElement = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      target.isContentEditable
    );
  };

  document.addEventListener(
    'contextmenu',
    (event) => {
      if (!isFormElement(event.target)) {
        event.preventDefault();
      }
    },
    { capture: true }
  );

  document.addEventListener(
    'copy',
    (event) => {
      if (!isFormElement(event.target)) {
        event.preventDefault();
      }
    },
    { capture: true }
  );

  document.addEventListener(
    'cut',
    (event) => {
      if (!isFormElement(event.target)) {
        event.preventDefault();
      }
    },
    { capture: true }
  );

  document.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const withModifier = event.ctrlKey || event.metaKey;
      if (!withModifier) return;

      // Блокируем самые типичные сочетания для копирования и просмотра кода:
      // Ctrl/Cmd + C, X, S, U, A (копирование, вырезание, сохранить, исходник, выделить всё)
      if (['c', 'x', 's', 'u', 'a'].includes(key) && !isFormElement(event.target)) {
        event.preventDefault();
      }
    },
    { capture: true }
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProgressProvider>
            <XpFlyProvider>
              <App />
            </XpFlyProvider>
          </ProgressProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);



