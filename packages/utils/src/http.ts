export function getIpAddress(headers: Headers) {
  const VERCEL_IP_HEADER_NAME = "x-real-ip";
  const FORWARDED_FOR_HEADER_NAME = "x-forwarded-for";

  return (
    headers.get(VERCEL_IP_HEADER_NAME) ??
    headers.get(FORWARDED_FOR_HEADER_NAME)?.split(",")[0]?.trim()
  );
}

export function parseQueryParams<T extends Record<string, string>>(
  url: string
): T {
  const params: T = {} as T;
  const queryString = url.split("?")[1];

  if (!queryString) return params;

  const searchParams = new URLSearchParams(queryString);
  for (const [key, value] of searchParams.entries()) {
    params[key as keyof T] = value as T[keyof T];
  }

  return params;
}

export function getRedirectUrlFromQueryParams(searchParams: URLSearchParams) {
  const redirectUrl = searchParams.get("redirectTo");
  if (!redirectUrl) return null;

  if (redirectUrl.startsWith("/")) {
    const sanitizedUrl = redirectUrl
      .replace(/\0/g, "")
      .replace(/\/+/g, "/")
      .split("/")
      .filter((segment) => segment !== "..")
      .join("/");

    return sanitizedUrl.startsWith("/") ? sanitizedUrl : `/${sanitizedUrl}`;
  }

  if (!redirectUrl.includes(":")) {
    return `/${redirectUrl.replace(/^\/+/, "")}`;
  }

  return null;
}

export function createRedirectResponse(
  redirectUrl: string,
  errorCode?: string
) {
  const url = errorCode
    ? `/login?error=${errorCode}&redirectTo=${encodeURIComponent(redirectUrl)}`
    : redirectUrl;

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
    },
  });
}

export function createRateLimitResponse(retryAfterSeconds = 60) {
  return new Response("Rate limit exceeded. Please try again later.", {
    status: 429,
    headers: {
      "Retry-After": retryAfterSeconds.toString(),
      "Content-Type": "text/plain",
    },
  });
}
