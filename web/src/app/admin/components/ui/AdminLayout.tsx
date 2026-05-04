"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, Settings, LayoutDashboard, AlertTriangle, ChartBar, FolderSync } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Gestión de Usuarios', href: '/admin/users', icon: Users },
  { name: 'Solicitudes de Rol', href: '/admin/roles/pending-requests', icon: Shield },
  { name: 'Configuración', href: '/admin/settings', icon: Settings },
  { name: 'Analytics & Reporting', href: '/admin/analytics', icon: ChartBar },
  { name: 'Registros de Auditoría', href: '/admin/audit', icon: AlertTriangle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-background border-r">
          <div className="flex h-16 items-center px-6 border-b">
            <Link href="/admin" className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Admin</span>
            </Link>
          </div>
          <nav className="px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <main className="min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}