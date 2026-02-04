import axios from 'axios';

// Глобальный перехватчик ошибок axios:
// - для сетевых ошибок (ECONNREFUSED и т.п.)
// - и для 5xx от сервера
// показываем пользователю модальное окно ошибки (через window event).

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status as number | undefined;

    // 401/403, 400 и т.п. обрабатываются локально в компонентах, не перенаправляем на общую ошибку
    if (!status || status >= 500) {
      window.dispatchEvent(
        new CustomEvent('global-api-error', {
          detail: {
            status: status ?? null,
          },
        })
      );
    }

    return Promise.reject(error);
  }
);

export {}; // модуль без экспортов, важен только side-effect

