const API_BASE = window.location.pathname.includes('/monitoring-dompet')
  ? '/monitoring-dompet/api.php'
  : '/api.php';

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('dompetku_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Format url path to match api.php routing: e.g. /api.php/auth/login or /monitoring-dompet/api.php/auth/login
  const normalizedPath = path.startsWith('/api') ? path.replace('/api', '') : path;
  const fullUrl = `${API_BASE}${normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('dompetku_token');
      localStorage.removeItem('dompetku_user');
      window.dispatchEvent(new Event('auth_change'));
    }
    const errorMsg = json?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return json?.data !== undefined ? json.data : json;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
