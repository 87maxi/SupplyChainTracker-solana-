'use server';

import { getRoleHashes, type RoleMap } from '@/lib/roleUtils';

/**
 * Server-side utility to get role hashes.
 * Can be used in Server Components for rendering or data processing.
 */
export async function getServerRoleHashes(): Promise<RoleMap> {
  try {
    return await getRoleHashes();
  } catch {
    throw new Error('Failed to fetch role hashes');
  }
}