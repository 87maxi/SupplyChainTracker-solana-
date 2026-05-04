'use client';

import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Plus, ShieldCheck, Monitor, UserPlus } from 'lucide-react';
import { NetbookForm } from '@/components/contracts/NetbookForm';
import { HardwareAuditForm } from '@/components/contracts/HardwareAuditForm';
import { SoftwareValidationForm } from '@/components/contracts/SoftwareValidationForm';
import { StudentAssignmentForm } from '@/components/contracts/StudentAssignmentForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function RoleActions() {
    const { isManufacturer, isHardwareAuditor, isSoftwareTechnician, isSchool, isAdmin } = useUserRoles();

    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [showAuditForm, setShowAuditForm] = useState(false);
    const [showValidationForm, setShowValidationForm] = useState(false);
    const [showAssignmentForm, setShowAssignmentForm] = useState(false);

    // If no relevant roles, return null
    if (!isManufacturer && !isHardwareAuditor && !isSoftwareTechnician && !isSchool && !isAdmin) {
        return null;
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
            {(isManufacturer || isAdmin) && (
                <Card className="border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-blue-400">Fabricante</CardTitle>
                            <Plus className="h-5 w-5 text-blue-400" />
                        </div>
                        <CardDescription className="text-xs">Registro inicial de netbooks en la blockchain.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => setShowRegisterForm(true)}
                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 mt-2"
                        >
                            Registrar Netbook
                        </Button>
                        <NetbookForm
                            isOpen={showRegisterForm}
                            onOpenChange={setShowRegisterForm}
                            onComplete={() => window.location.reload()}
                        />
                    </CardContent>
                </Card>
            )}

            {(isHardwareAuditor || isAdmin) && (
                <Card className="border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-emerald-400">Auditor HW</CardTitle>
                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                        </div>
                        <CardDescription className="text-xs">Verificación y aprobación de integridad física.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => setShowAuditForm(true)}
                            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 mt-2"
                        >
                            Auditar Hardware
                        </Button>
                        <HardwareAuditForm
                            isOpen={showAuditForm}
                            onOpenChange={setShowAuditForm}
                            onComplete={() => window.location.reload()}
                        />
                    </CardContent>
                </Card>
            )}

            {(isSoftwareTechnician || isAdmin) && (
                <Card className="border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-purple-400">Técnico SW</CardTitle>
                            <Monitor className="h-5 w-5 text-purple-400" />
                        </div>
                        <CardDescription className="text-xs">Instalación y validación del sistema operativo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => setShowValidationForm(true)}
                            className="w-full gap-2 bg-purple-600 hover:bg-purple-700 mt-2"
                        >
                            Validar Software
                        </Button>
                        <SoftwareValidationForm
                            isOpen={showValidationForm}
                            onOpenChange={setShowValidationForm}
                            onComplete={() => window.location.reload()}
                        />
                    </CardContent>
                </Card>
            )}

            {(isSchool || isAdmin) && (
                <Card className="border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-amber-400">Escuela</CardTitle>
                            <UserPlus className="h-5 w-5 text-amber-400" />
                        </div>
                        <CardDescription className="text-xs">Asignación final de la netbook al estudiante.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => setShowAssignmentForm(true)}
                            className="w-full gap-2 bg-amber-600 hover:bg-amber-700 mt-2"
                        >
                            Asignar Estudiante
                        </Button>
                        <StudentAssignmentForm
                            isOpen={showAssignmentForm}
                            onOpenChange={setShowAssignmentForm}
                            onComplete={() => window.location.reload()}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
