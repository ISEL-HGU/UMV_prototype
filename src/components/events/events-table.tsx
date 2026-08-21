"use client";

import { useQuery } from "@tanstack/react-query";
import {
  columnVisibilityFeature,
  coreFeatures,
  createSortedRowModel,
  rowSortingFeature,
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Columns3, Search, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DetectionDialog } from "@/components/events/detection-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchEvents, queryKeys } from "@/lib/api";
import {
  formatDateTime,
  formatMalwareCell,
  MAJOR_VIRUS_TYPE,
  SCAN_TYPE,
  severityTone,
} from "@/lib/format";
import type { Analysis } from "@/lib/types";
import { cn } from "@/lib/utils";

/** API 응답에 대상 PC 정보가 없어 화면에서 채운다 */
export const DEMO_COMPUTER = "SEC-FIN-WEB01";

const TONE_CLASS = {
  malware: "text-severity-malware font-bold",
  suspicious: "text-severity-suspicious font-bold",
  benign: "text-severity-benign font-semibold",
  unknown: "text-severity-unknown font-semibold",
} as const;

/** 필터링은 테이블 밖에서 한다 — 나중에 서버 필터로 옮기기 쉽다 */
type Scope = "all" | "malware" | "benign";

const features = {
  ...coreFeatures,
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
};

type Features = typeof features;

export function EventsTable() {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "time", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({});
  const [selected, setSelected] = useState<Analysis | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.events(50),
    queryFn: () => fetchEvents(50),
  });

  const rows = useMemo(() => {
    const all = data?.events ?? [];
    const kw = keyword.trim().toLowerCase();

    return all
      .filter((a) => {
        if (scope === "malware") return a.verdict.decision === "MALWARE";
        if (scope === "benign") return a.verdict.decision === "BENIGN";
        return true;
      })
      .filter((a) => {
        if (!kw) return true;
        return [
          a.received_at,
          DEMO_COMPUTER,
          a.file.inner_path,
          formatMalwareCell(a),
          SCAN_TYPE,
          a.verdict.action_taken,
          MAJOR_VIRUS_TYPE,
        ]
          .join(" ")
          .toLowerCase()
          .includes(kw);
      });
  }, [data, keyword, scope]);

  const columnLabels = useMemo(
    () => ({
      time: t("columns.time"),
      computer: t("columns.computer"),
      infectedFile: t("columns.infectedFile"),
      malware: t("columns.malware"),
      scanType: t("columns.scanType"),
      actionTaken: t("columns.actionTaken"),
      majorVirusType: t("columns.majorVirusType"),
    }) as Record<string, string>,
    [t],
  );

  const columns = useMemo<ColumnDef<Features, Analysis>[]>(
    () => [
      {
        id: "time",
        accessorFn: (a) => a.received_at,
        header: columnLabels.time,
        cell: ({ row }) => formatDateTime(row.original.received_at, locale),
      },
      {
        id: "computer",
        header: columnLabels.computer,
        enableSorting: false,
        cell: () => DEMO_COMPUTER,
      },
      {
        id: "infectedFile",
        accessorFn: (a) => a.file.inner_path,
        header: columnLabels.infectedFile,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.file.inner_path}</span>
        ),
      },
      {
        id: "malware",
        accessorFn: (a) => formatMalwareCell(a),
        header: columnLabels.malware,
        cell: ({ row }) => (
          <span className={TONE_CLASS[severityTone(row.original)]}>
            {formatMalwareCell(row.original)}
          </span>
        ),
      },
      {
        id: "scanType",
        header: columnLabels.scanType,
        enableSorting: false,
        cell: () => SCAN_TYPE,
      },
      {
        id: "actionTaken",
        accessorFn: (a) => a.verdict.action_taken,
        header: columnLabels.actionTaken,
        cell: ({ row }) => row.original.verdict.action_taken,
      },
      {
        id: "majorVirusType",
        header: columnLabels.majorVirusType,
        enableSorting: false,
        cell: () => MAJOR_VIRUS_TYPE,
      },
    ],
    [columnLabels, locale],
  );

  const table = useTable({
    data: rows,
    columns,
    features,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => row.analysis_id,
  });

  return (
    <section className="flex min-h-0 flex-1 flex-col pt-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">{t("title")}</h1>

        <Select
          value={scope}
          onValueChange={(value) => setScope(value as Scope)}
        >
          <SelectTrigger size="sm" className="w-32" aria-label={t("title")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("scope.all")}</SelectItem>
            <SelectItem value="malware">{t("scope.malware")}</SelectItem>
            <SelectItem value="benign">{t("scope.benign")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="ms-auto flex items-center gap-2">
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="w-64 ps-8"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 grid max-w-lg grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <Label htmlFor="period">{t("period")}</Label>
        <Select defaultValue="last24h">
          <SelectTrigger id="period" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last24h">{t("periods.last24h")}</SelectItem>
            <SelectItem value="last7d">{t("periods.last7d")}</SelectItem>
            <SelectItem value="last30d">{t("periods.last30d")}</SelectItem>
          </SelectContent>
        </Select>

        <Label htmlFor="computers">{t("computers")}</Label>
        <Select defaultValue={DEMO_COMPUTER}>
          <SelectTrigger id="computers" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEMO_COMPUTER}>{DEMO_COMPUTER}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Columns3 className="size-4" aria-hidden />
                {t("columnsButton")}
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            {table.getAllColumns().map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(checked) =>
                  column.toggleVisibility(!!checked)
                }
              >
                {columnLabels[column.id] ?? column.id}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" render={<Link href="/" />}>
          <Upload className="size-4" aria-hidden />
          {t("newAnalysis")}
        </Button>

        <span className="text-muted-foreground ms-auto text-sm tabular-nums">
          {t("count", { count: rows.length })}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="bg-console-grid-head sticky top-0 z-10">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 font-semibold"
                        >
                          <table.FlexRender header={header} />
                          {sortDir === "asc" && (
                            <ArrowUp className="size-3" aria-hidden />
                          )}
                          {sortDir === "desc" && (
                            <ArrowDown className="size-3" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isPending && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground py-10 text-center"
                >
                  {tc("loading")}
                </TableCell>
              </TableRow>
            )}

            {isError && (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">{t("loadFailed")}</p>
                    <Button size="sm" variant="outline" onClick={() => refetch()}>
                      {tc("retry")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isPending && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground py-10 text-center"
                >
                  {t("empty")}
                </TableCell>
              </TableRow>
            )}

            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                tabIndex={0}
                role="button"
                onClick={() => setSelected(row.original)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(row.original);
                  }
                }}
                className={cn(
                  "cursor-pointer",
                  row.original.verdict.decision === "MALWARE" &&
                    "bg-console-row-active/60",
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetectionDialog
        analysis={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </section>
  );
}
