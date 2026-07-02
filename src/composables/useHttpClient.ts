import { ref } from "vue";
import { fetch } from "@tauri-apps/plugin-http";

type Primitive = string | number | boolean;
type QueryValue = Primitive | null | undefined;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface HttpRequest<TBody = unknown> {
  url: string;
  method?: HttpMethod;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  body?: TBody;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface HttpErrorShape {
  message: string;
  status?: number;
  statusText?: string;
  url?: string;
  method?: HttpMethod;
  details?: unknown;
}

type RequestInterceptor = <TBody>(
  config: HttpRequest<TBody>,
) => HttpRequest<TBody> | Promise<HttpRequest<TBody>>;

type ResponseInterceptor = <TResponse>(
  response: TResponse,
  config: HttpRequest,
) => TResponse | Promise<TResponse>;

type ErrorInterceptor = (
  error: HttpErrorShape,
  config: HttpRequest,
) => HttpErrorShape | Promise<HttpErrorShape>;

export interface UseHttpClientOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  getAuthToken?: (() => string | null | undefined) | null;
  requestInterceptor?: RequestInterceptor;
  responseInterceptor?: ResponseInterceptor;
  errorInterceptor?: ErrorInterceptor;
}

function withQuery(url: string, query?: Record<string, QueryValue>) {
  if (!query) {
    return url;
  }

  const requestUrl = new URL(url, "http://localhost");
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    requestUrl.searchParams.set(key, String(value));
  });

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return requestUrl.toString();
  }

  return `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`;
}

function resolveUrl(url: string, baseUrl?: string) {
  if (!baseUrl || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return new URL(url, baseUrl).toString();
}

function isJsonContent(contentType: string | null) {
  return contentType?.includes("application/json") ?? false;
}

function getDefaultHeaders(
  config: HttpRequest,
  options: UseHttpClientOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    ...options.defaultHeaders,
    ...config.headers,
  };

  const token = options.getAuthToken?.();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function buildHttpError(config: HttpRequest, message: string): HttpErrorShape {
  return {
    message,
    url: config.url,
    method: config.method ?? "GET",
  };
}

export function useHttpClient(options: UseHttpClientOptions = {}) {
  const isLoading = ref(false);
  const error = ref<HttpErrorShape | null>(null);

  async function request<TResponse, TBody = unknown>(
    config: HttpRequest<TBody>,
  ): Promise<TResponse> {
    isLoading.value = true;
    error.value = null;

    let finalConfig: HttpRequest<TBody> = {
      method: "GET",
      ...config,
    };

    if (options.requestInterceptor) {
      finalConfig = await options.requestInterceptor(finalConfig);
    }

    const method = finalConfig.method ?? "GET";
    const resolvedUrl = resolveUrl(finalConfig.url, options.baseUrl);
    const url = withQuery(resolvedUrl, finalConfig.query);
    const headers = getDefaultHeaders(finalConfig, options);

    let body: BodyInit | undefined;
    if (finalConfig.body !== undefined) {
      if (finalConfig.body instanceof FormData) {
        body = finalConfig.body;
      } else {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
        body = JSON.stringify(finalConfig.body);
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: finalConfig.signal,
        connectTimeout: finalConfig.timeoutMs,
      });

      if (!response.ok) {
        let err: HttpErrorShape = {
          message: `HTTP ${response.status} ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          url,
          method,
        };
        const contentType = response.headers.get("content-type");
        try {
          err.details = isJsonContent(contentType) ? await response.json() : await response.text();
        } catch {
          // ignore response parsing errors for error details
        }
        if (options.errorInterceptor) {
          err = await options.errorInterceptor(err, finalConfig);
        }
        error.value = err;
        throw err;
      }

      const contentType = response.headers.get("content-type");
      const hasEmptyBody =
        response.status === 204 || response.status === 205 || response.status === 304;
      if (hasEmptyBody) {
        return undefined as TResponse;
      }

      let result: TResponse;
      if (isJsonContent(contentType)) {
        result = (await response.json()) as TResponse;
      } else {
        result = (await response.text()) as TResponse;
      }

      if (options.responseInterceptor) {
        return await options.responseInterceptor(result, finalConfig);
      }

      return result;
    } catch (err) {
      if (!error.value) {
        let fallback = buildHttpError(
          finalConfig,
          err instanceof Error ? err.message : String(err),
        );
        if (options.errorInterceptor) {
          fallback = await options.errorInterceptor(fallback, finalConfig);
        }
        error.value = fallback;
      }
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function get<TResponse>(url: string, query?: Record<string, QueryValue>) {
    return request<TResponse>({ url, method: "GET", query });
  }

  function post<TResponse, TBody = unknown>(url: string, body?: TBody) {
    return request<TResponse, TBody>({ url, method: "POST", body });
  }

  function put<TResponse, TBody = unknown>(url: string, body?: TBody) {
    return request<TResponse, TBody>({ url, method: "PUT", body });
  }

  function patch<TResponse, TBody = unknown>(url: string, body?: TBody) {
    return request<TResponse, TBody>({ url, method: "PATCH", body });
  }

  function del<TResponse>(url: string, query?: Record<string, QueryValue>) {
    return request<TResponse>({ url, method: "DELETE", query });
  }

  return {
    isLoading,
    error,
    request,
    get,
    post,
    put,
    patch,
    del,
  };
}
