import { NextRequest } from 'next/server';

export function getRole(request: NextRequest): string | null {
  return request.headers.get('x-user-role');
}

export function canWrite(role: string | null): boolean {
  return role === 'admin' || role === 'gestion_stock';
}

export function isAdmin(role: string | null): boolean {
  return role === 'admin';
}
