const API_URL = import.meta.env.VITE_API_URL || ''

export async function apiFetch(path, options = {}, getToken) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  if (getToken) {
    const token = await getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}
