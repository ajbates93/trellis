export default defineEventHandler(async (event) => {
  // Only check admin routes
  const adminRoutes = ['/api/admin']
  const path = event.path

  if (!adminRoutes.some(route => path.startsWith(route))) {
    return
  }

  // Check if user has admin role (user should be attached from auth middleware)
  const user = event.context.user

  if (!user || user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Forbidden - Admin access required',
    })
  }
})
