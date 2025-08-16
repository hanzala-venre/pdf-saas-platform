import { User } from "@prisma/client"

export function isAdmin(user: any): boolean {
  return user?.role === 'ADMIN'
}

export function isAdminSession(session: any): boolean {
  return session?.user?.role === 'ADMIN'
}

export function requireAdmin(user: any): void {
  if (!isAdmin(user)) {
    throw new Error('Admin access required')
  }
}

// Server-side admin check for API routes
export async function checkAdminAccess(session: any) {
  if (!session?.user?.email) {
    return { error: 'Unauthorized', status: 401 }
  }

  if (!isAdminSession(session)) {
    return { error: 'Admin access required', status: 403 }
  }

  return null // No error, user is admin
}
