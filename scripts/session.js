import config from './config.js';
import { getMetadata } from './aem.js';

/**
 * Path of the login page, authored as `login-page` page metadata.
 * @returns {string}
 */
export function getLoginPath() {
  return getMetadata('login-page') || '/login-page';
}

/*
 * JWT session handling. The login API returns a JWT which is kept in a cookie written by this
 * script and sent as `Authorization: Bearer` on API calls. The cookie is Secure, SameSite=Strict
 * and expires with the token, but it is not HttpOnly (a script cannot set that), so any script
 * on the page can still read it. The payload is decoded here only to read the user and expiry;
 * the signature can only be verified by the server. Anything served by Edge Delivery is public,
 * so protect data in the API, never rely on client-side checks.
 */

const { cookieName } = config.session;

function readStorage() {
  const prefix = `${cookieName}=`;
  const entry = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function decodePayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    return null;
  }
}

/**
 * Removes the stored token.
 */
export function clearToken() {
  document.cookie = `${cookieName}=; Path=/; Max-Age=0; Secure; SameSite=Strict`;
}

/**
 * Stores a JWT in a cookie. Returns false when it is malformed, expired or cannot be stored.
 * @param {string} token
 */
export function setToken(token) {
  const payload = typeof token === 'string' ? decodePayload(token) : null;
  if (!payload || (payload.exp && payload.exp * 1000 <= Date.now())) return false;
  const expires = payload.exp ? `; Expires=${new Date(payload.exp * 1000).toUTCString()}` : '';
  const cookie = `${cookieName}=${encodeURIComponent(token)}; Path=/${expires}; Secure; SameSite=Strict`;
  // browsers silently drop cookies over ~4KB
  if (cookie.length > 4000) return false;
  document.cookie = cookie;
  return !!readStorage();
}

/**
 * Returns the stored JWT, or null when missing or expired.
 * @returns {string|null}
 */
export function getToken() {
  const token = readStorage();
  if (!token) return null;
  const payload = decodePayload(token);
  if (!payload || (payload.exp && payload.exp * 1000 <= Date.now())) {
    clearToken();
    return null;
  }
  return token;
}

/**
 * Returns the claims of the current JWT (e.g. sub, email, exp), or null when signed out.
 * @returns {object|null}
 */
export function getSession() {
  const token = getToken();
  return token ? decodePayload(token) : null;
}

/**
 * Only same-origin paths are allowed as redirect targets (prevents open redirects).
 * @param {string} target
 * @param {string} fallback
 */
export function safeRedirect(target, fallback) {
  if (target && target.startsWith('/') && !target.startsWith('//') && !target.includes('\\')) {
    return target;
  }
  return fallback;
}

/**
 * Sends the visitor to the login page, remembering where they were headed.
 */
export function redirectToLogin() {
  const { pathname, search, hash } = window.location;
  const back = encodeURIComponent(`${pathname}${search}${hash}`);
  window.location.replace(`${getLoginPath()}?redirect=${back}`);
}

/**
 * fetch() with the JWT attached. A 401 response ends the session and sends the visitor to login.
 * @param {string} url
 * @param {RequestInit} [options]
 */
export async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) {
    clearToken();
    redirectToLogin();
  }
  return resp;
}

/**
 * Ends the session by discarding the token (the backend has no logout endpoint, so the
 * token simply expires on its own) and returns to the login page.
 */
export function logout() {
  clearToken();
  window.location.assign(getLoginPath());
}
