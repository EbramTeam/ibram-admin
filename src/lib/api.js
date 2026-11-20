// Small client for the IBRAM API (Laravel + Sanctum bearer tokens).
// In development Vite forwards /api to the server (see vite.config.js), so no CORS setup is needed.
// In production set VITE_API_URL, e.g. https://ibram.apps.taqat.academy

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const KEY = 'ibram-admin-token';

function store(remember) {
  try {
    return remember ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getToken() {
  try {
    return window.sessionStorage.getItem(KEY) || window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token, remember) {
  clearToken();
  try {
    store(remember)?.setItem(KEY, token);
  } catch {
    /* storage blocked: the session only lasts until the tab closes */
  }
}

export function clearToken() {
  try {
    window.sessionStorage.removeItem(KEY);
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = body || {};
    this.errors = body?.errors || {};
  }
}

// listeners for "the token is no longer valid" (401 on a signed-in request)
const onUnauthorized = new Set();
export const whenUnauthorized = (fn) => {
  onUnauthorized.add(fn);
  return () => onUnauthorized.delete(fn);
};

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, { message: 'network' });
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      clearToken();
      onUnauthorized.forEach((fn) => fn());
    }
    throw new ApiError(res.status, data);
  }
  return data;
}

// Arabic message for an API error shown on the screen
export function errorText(err) {
  if (!(err instanceof ApiError)) return 'حدث خطأ غير متوقع، حاول مرة أخرى';
  if (err.status === 0) return 'تعذّر الاتصال بالخادم، تحقق من الاتصال وحاول مرة أخرى';
  if (err.status === 429) return 'محاولات كثيرة، يرجى المحاولة بعد دقيقة';
  if (err.status === 403) return 'ليس لديك صلاحية لهذا الإجراء';
  if (err.status >= 500) return 'حدث خطأ في الخادم، حاول لاحقاً';
  return 'تعذّر تنفيذ الطلب';
}
