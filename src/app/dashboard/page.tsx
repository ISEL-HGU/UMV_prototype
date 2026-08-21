import { ConsoleShell } from "@/components/console/console-shell";
import { DEMO_COMPUTER, EventsTable } from "@/components/events/events-table";

/** 대시보드. 업로드 화면과 분리된 페이지다. */
export default function DashboardPage() {
  return (
    <ConsoleShell computerName={DEMO_COMPUTER}>
      <EventsTable />
    </ConsoleShell>
  );
}
