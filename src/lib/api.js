const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';
const TOKEN_KEY = 'sorteo.admin.token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
};

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, opts = {}) {
  const { method = 'GET', body, headers = {}, auth = true, form = false } = opts;
  const init = { method, headers: { Accept: 'application/json', ...headers } };

  if (auth) {
    const t = getToken();
    if (t) init.headers.Authorization = `Bearer ${t}`;
  }
  if (body !== undefined) {
    if (form) init.body = body;
    else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    throw new ApiError(0, 'network', 'No se pudo conectar con el servidor.');
  }

  const raw = await res.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const e = data?.error || {};
    throw new ApiError(res.status, e.code || 'error', e.message || 'Ocurrió un error', e.details);
  }
  return data;
}

/** Sube una imagen al endpoint de admin y devuelve { url }. */
export async function uploadImage(file, folder = 'raffles') {
  const fd = new FormData();
  fd.append('image', file);
  return api(`/admin/media?folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    body: fd,
    form: true,
  });
}
