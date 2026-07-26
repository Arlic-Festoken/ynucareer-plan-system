const runtimeApiBase = import.meta.env.VITE_API_BASE || "/api";

export function apiUrl(path: string, base = runtimeApiBase) {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function routerBasename(publicBase = import.meta.env.BASE_URL) {
  if (!publicBase || publicBase === "/" || publicBase === "./") return undefined;
  const normalized = publicBase.startsWith("/") ? publicBase : `/${publicBase}`;
  return normalized.replace(/\/+$/, "");
}
