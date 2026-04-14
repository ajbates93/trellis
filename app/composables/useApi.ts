/**
 * Typed API composables for Trellis.
 *
 * Built on Nuxt 4.4's createUseFetch / createUseAsyncData factories, these
 * wrappers centralise:
 *   - baseURL (`/api`) so callers can drop the prefix
 *   - credentials + content-type defaults
 *   - 401 handling (redirect to login)
 *   - toast surfacing for unhandled server errors
 *
 * Usage:
 *   const { data } = await useApi('/feedback/received')
 *   await $api('/feedback', { method: 'POST', body })
 *   const { data } = useAsyncApi('users', () => $api('/users'))
 */

import type { FetchError } from "ofetch";

const BASE_URL = "/api";

// Paths where we deliberately don't want a toast on error (caller handles it).
const SILENT_ERROR_PATHS = ["/auth/"];

function shouldSurfaceError(path: string, status: number | undefined): boolean {
  if (status === 401) return false; // handled by redirect
  return !SILENT_ERROR_PATHS.some((p) => path.includes(p));
}

function handleFetchError(error: FetchError) {
  const status = error.response?.status;
  const url = (error.request as string) ?? "";

  if (status === 401 && import.meta.client) {
    // Session expired or not logged in — kick to login.
    // Using window.location to guarantee a clean state flush.
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return;
  }

  if (import.meta.client && shouldSurfaceError(url, status)) {
    const toast = useToast();
    const message =
      (error.data as { message?: string } | undefined)?.message ||
      error.statusMessage ||
      "Something went wrong. Please try again.";
    toast.add({
      title: "Request failed",
      description: message,
      color: "error",
      icon: "i-heroicons-exclamation-triangle",
    });
  }
}

export const useApi = createUseFetch({
  baseURL: BASE_URL,
  credentials: "same-origin",
  onResponseError({ error }) {
    if (error) handleFetchError(error as FetchError);
  },
});

export const useAsyncApi = createUseAsyncData({});

/**
 * Imperative API fetch. Same shape as $fetch but with baseURL + error handling.
 */
export const $api = $fetch.create({
  baseURL: BASE_URL,
  credentials: "same-origin",
  onResponseError({ error }) {
    if (error) handleFetchError(error as FetchError);
  },
});
