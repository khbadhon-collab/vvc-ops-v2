import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export const ROLES = {
  admin: { label: 'Admin / CEO', color: '#0F4C81', pages: ['*'] },
  sales: { label: 'Sales Assistant', color: '#059669', pages: ['/', 'cases', 'cases/new', 'comms', 'marketing', 'social', 'templates'] },
  accounting: { label: 'Accounting', color: '#D97706', pages: ['/', 'invoices', 'finance'] },
}

export function hasAccess(role, path) {
  if (!role || role === 'admin') return true
  const perms = ROLES[role]?.pages || []
  if (perms.includes('*')) return true
  const clean = path.replace(/^\//, '').split('/')[0] || ''
  return perms.some(p => p === '/' ? clean === '' : p === clean || p.startsWith(clean))
}
