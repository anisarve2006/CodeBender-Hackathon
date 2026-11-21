'use client';

import * as React from 'react';
import { Plus, CheckSquare, MessageSquare, Calendar, FileUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickAddTaskDialog } from '@/components/features/tasks/quick-add-task';
import { QuickAddUpdateDialog } from '@/components/features/updates/quick-add-update';
import { QuickAddAppointmentDialog } from '@/components/features/appointments/quick-add-appointment';
import { QuickAddDocumentDialog } from '@/components/features/documents/quick-add-document';
import { can } from '@/lib/utils/rbac';
import type { CircleRole } from '@/lib/types/app';

interface QuickAddButtonProps {
  circleId: string;
  role: CircleRole;
}

export function QuickAddButton({ circleId, role }: QuickAddButtonProps) {
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [updateOpen, setUpdateOpen] = React.useState(false);
  const [apptOpen, setApptOpen] = React.useState(false);
  const [docOpen, setDocOpen] = React.useState(false);

  if (role === 'viewer') {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-20 right-4 z-40 md:bottom-8 md:right-8">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none"
            aria-label="Quick action menu"
          >
            <Plus className="h-6 w-6" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 p-1.5 space-y-1">
            {can(role, 'create_tasks') && (
              <DropdownMenuItem onClick={() => setTaskOpen(true)} className="cursor-pointer gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span>New Task</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setUpdateOpen(true)} className="cursor-pointer gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              <span>Family Update</span>
            </DropdownMenuItem>
            {can(role, 'manage_records') && (
              <DropdownMenuItem onClick={() => setApptOpen(true)} className="cursor-pointer gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span>Appointment</span>
              </DropdownMenuItem>
            )}
            {can(role, 'manage_records') && (
              <DropdownMenuItem onClick={() => setDocOpen(true)} className="cursor-pointer gap-2">
                <FileUp className="h-4 w-4 text-purple-500" />
                <span>Upload Document</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <QuickAddTaskDialog open={taskOpen} onOpenChange={setTaskOpen} circleId={circleId} />
      <QuickAddUpdateDialog open={updateOpen} onOpenChange={setUpdateOpen} circleId={circleId} />
      <QuickAddAppointmentDialog open={apptOpen} onOpenChange={setApptOpen} circleId={circleId} />
      <QuickAddDocumentDialog open={docOpen} onOpenChange={setDocOpen} circleId={circleId} />
    </>
  );
}
