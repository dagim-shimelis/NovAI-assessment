export const DISPLAY_NAME_KEY = "novai-demo-name";
export const SESSION_KEY = "novai-assessment-token";

export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return "/companies";
  }
  try {
    const url = new URL(value, "http://local.test");
    if (url.origin !== "http://local.test" || (url.pathname !== "/companies" && url.pathname !== "/")) return "/companies";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/companies";
  }
}

export function signInPath(path: string): string {
  return `/sign-in?returnTo=${encodeURIComponent(safeReturnTo(path))}`;
}
