import type { UserRole } from '@/types'

/** Roles a user may choose on the public signup form */
export const SELF_SIGNUP_ROLE: UserRole = 'sales_rep'

/** All roles — selectable in demo only */
export const ALL_ROLES: UserRole[] = [
  'sales_rep',
  'technical',
  'finance',
  'sales_head',
  'admin',
]

/**
 * Resolves the role actually applied at signup.
 * Production: always Sales Rep (client cannot elevate privileges).
 * Demo: user-selected role for testing.
 */
export function resolveSignupRole(requestedRole: UserRole): UserRole {
  return requestedRole
}

export function canPickRoleOnSignup(): boolean {
  return false
}

export const ROLE_SIGNUP_HINTS: Record<UserRole, string> = {
  sales_rep: 'Create pricing deals and submit for approval',
  finance: 'Review margin and financial viability',
  technical: 'Review solution scope and technical feasibility',
  sales_head: 'Final approval on strategic deals',
  admin: 'Full access, user management, and settings',
}
