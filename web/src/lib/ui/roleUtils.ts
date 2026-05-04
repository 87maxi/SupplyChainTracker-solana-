'use server';

import { getRoleHashes } from '@/lib/roleUtils';

// This utility function can be used in server components
// to get role hashes for rendering or data processing
export async function getServerRoleHashes() {
  try {
    const roleHashes = await getRoleHashes();
    return roleHashes;
  } catch (error) {
    console.error('Error fetching role hashes on server:', error);
    throw new Error('Failed to fetch role hashes');
  }
}