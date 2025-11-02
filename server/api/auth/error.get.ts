export default defineEventHandler((event) => {
  // Get error from query params
  const query = getQuery(event);
  const error = query.error as string;

  // Redirect to login page with error message
  const encodedError = encodeURIComponent(error || "Authentication failed");
  return sendRedirect(event, `/login?error=${encodedError}`, 302);
});
