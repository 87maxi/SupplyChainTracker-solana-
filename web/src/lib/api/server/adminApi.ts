'use server';

import { NextResponse } from 'next/server';

// Tipos para las respuestas de la API de administración
export interface AdminStats {
  usersByRole: {
    [role: string]: number;
  };
  netbooksByStatus: {
    [status: string]: number;
  };
  totalUsers: number;
  totalNetbooks: number;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  eventType: string;
  description: string;
  actor: string;
  success: boolean;
}

/**
 * Obtiene estadísticas generales para el panel de administración
 * @returns Estadísticas de usuarios y netbooks
 */
export async function getAdminStats(): Promise<AdminStats> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/roles`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch admin stats');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
}

/**
 * Obtiene registros de auditoría del sistema
 * @param limit Número máximo de registros a devolver
 * @returns Lista de registros de auditoría
 */
export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/audit?limit=${limit}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch audit logs');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

/**
 * Revalida los datos de administración en la caché
 */
export async function revalidateAdminData() {
  try {
    // No usamos revalidateTag en Server Actions, en su lugar confiamos en la TTL
    console.log('Admin data revalidation triggered');
  } catch (error) {
    console.error('Error revalidating admin data:', error);
  }
}
