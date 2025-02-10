function createRedirectResponse(redirectUrl: string, errorCode?: string) {
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

export { createRedirectResponse };
