import { AppShell } from "@/components/layout/app-shell";
import { RoleGate } from "@/components/layout/role-gate";
import { AppDialogProvider } from "@/components/ui/app-dialogs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDialogProvider>
      <RoleGate>
        <AppShell>{children}</AppShell>
      </RoleGate>
    </AppDialogProvider>
  );
}
