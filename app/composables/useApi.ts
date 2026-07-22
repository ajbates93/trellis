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
import type {
  ExtractedRouteMethod,
  NitroFetchOptions,
  NitroFetchRequest,
  TypedInternalResponse,
} from "nitropack/types";
import type { AsyncData, UseFetchOptions } from "#app";

// Mirrors nuxt's internal KeysOf/PickFrom (not exported from "#app").
type KeysOf<T> = Array<
  T extends T ? (keyof T extends string ? keyof T : never) : never
>;
type PickFrom<T, K extends Array<string>> = T extends Array<unknown>
  ? T
  : T extends Record<string, unknown>
    ? keyof T extends K[number]
      ? T
      : K[number] extends never
        ? T
        : Pick<T, K[number]>
    : T;

const BASE_URL = "/api";

// Paths where we deliberately don't want a toast on error (caller handles it).
const SILENT_ERROR_PATHS = ["/auth/", "/admin/onboard/import"];

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

/**
 * Because useApi/$api apply `baseURL: "/api"` at runtime, callers pass paths
 * WITHOUT the prefix ("/users/my-buddies") while Nitro's generated route types
 * (InternalApi) are keyed by the full path ("/api/users/my-buddies"). The
 * factories can't see through baseURL, so left alone every response degrades
 * to `{}`. These signatures re-attach the prefix at the type level only.
 */
type ApiResponse<
  P extends string,
  M extends string = "get",
> = TypedInternalResponse<
  `/api${P}`,
  unknown,
  M extends import("h3").RouterMethod ? M : "get"
>;

interface UseApiFn {
  <
    ResT = never,
    P extends string = string,
    Method extends string = "get",
    _ResT = [ResT] extends [never] ? ApiResponse<P, Lowercase<Method>> : ResT,
    DataT = _ResT,
    PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
    DefaultT = undefined,
  >(
    url: P | Ref<P> | (() => P),
    options?: Omit<
      UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, NitroFetchRequest>,
      "method"
    > & { method?: Method },
  ): AsyncData<
    PickFrom<DataT, PickKeys> | DefaultT,
    FetchError | undefined
  >;
}

interface ApiFetchFn {
  <
    T = never,
    P extends string = string,
    O extends NitroFetchOptions<NitroFetchRequest> = NitroFetchOptions<NitroFetchRequest>,
  >(
    request: P,
    opts?: O,
  ): Promise<
    [T] extends [never]
      ? TypedInternalResponse<
          `/api${P}`,
          unknown,
          // No options given -> assume GET (mirrors nitropack's Base$Fetch),
          // otherwise multi-method routes produce a union of all responses.
          NitroFetchOptions<NitroFetchRequest> extends O
            ? "get"
            : ExtractedRouteMethod<NitroFetchRequest, O>
        >
      : T
  >;
}

export const useApi = createUseFetch({
  baseURL: BASE_URL,
  credentials: "same-origin",
  onResponseError({ error }) {
    if (error) handleFetchError(error as FetchError);
  },
}) as unknown as UseApiFn;

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
}) as unknown as ApiFetchFn;
