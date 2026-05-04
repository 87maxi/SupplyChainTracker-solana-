"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Shield, Users, Settings, Zap, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminDashboard() {
  const { hasRole, isLoading } = useUserRoles();
  const router = useRouter();

  // Redirect if not admin - now using correct role name
  useEffect(() => {
    console.log('AdminDashboard: Checking admin access - isLoading:', isLoading, 'hasRole(DEFAULT_ADMIN_ROLE):', hasRole('DEFAULT_ADMIN_ROLE'));
    if (!isLoading && !hasRole('DEFAULT_ADMIN_ROLE')) {
      console.log('AdminDashboard: Redirecting non-admin user to /');
      router.push('/');
    }
  }, [hasRole, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not admin (fallback)
  if (!hasRole('DEFAULT_ADMIN_ROLE')) {
    return null;
  }

  const adminActions = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users,
      link: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Pending Role Requests',
      description: 'Review and approve pending role requests',
      icon: Shield,
      link: '/admin/roles/pending-requests',
      color: 'bg-green-500',
    },
    {
      title: 'System Settings',
      description: 'Configure application settings and parameters',
      icon: Settings,
      link: '/admin/settings',
      color: 'bg-purple-500',
    },
    {
      title: 'Analytics & Reporting',
      description: 'View system analytics and generate reports',
      icon: LayoutDashboard,
      link: '/admin/analytics',
      color: 'bg-orange-500',
    },
    {
      title: 'Audit Logs',
      description: 'Review system audit logs and security events',
      icon: AlertTriangle,
      link: '/admin/audit',
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="container mx-auto py-8 relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-overlay opacity-30 pointer-events-none"></div>
      <div className="relative z-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage your organization's access control and system configuration
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {adminActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.link}>
                <Card className="h-full transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className={`rounded-lg p-3 text-white ${action.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle>{action.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {action.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      Manage
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Perform common administrative tasks with a single click
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Button className="h-16 text-lg">
                  <Users className="mr-2 h-5 w-5" />
                  Manage Users
                </Button>
                <Button className="h-16 text-lg">
                  <Shield className="mr-2 h-5 w-5" />
                  Review Roles
                </Button>
                <Button className="h-16 text-lg">
                  <Settings className="mr-2 h-5 w-5" />
                  System Settings
                </Button>
                <Button className="h-16 text-lg">
                  <LayoutDashboard className="mr-2 h-5 w-5" />
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}