"use client";

import { Bug, ShieldCheck, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  archiveName,
  formatBytes,
  formatDateTime,
  innerFileName,
  MAJOR_VIRUS_TYPE,
  probToPercent,
  SCAN_TYPE,
  shortHash,
  sourceLabel,
} from "@/lib/format";
import type { Analysis } from "@/lib/types";
import { cn } from "@/lib/utils";

import { DEMO_COMPUTER } from "@/components/events/events-table";

function Row({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("break-all", mono && "font-mono text-xs")}>
        {children}
      </dd>
    </>
  );
}

/**
 * 탐지 상세. Stage 1 · Stage 2 섹션은 CLI 리포트와 같은 항목·순서로 표시한다.
 * Feature set 과 Model used 는 내부 구현 정보라 노출하지 않는다.
 */
export function DetectionDialog({
  analysis,
  onOpenChange,
}: {
  analysis: Analysis | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("detail");
  const locale = useLocale();

  if (!analysis) return null;

  const { stage1, stage2, verdict, file } = analysis;
  const isMalware = verdict.decision === "MALWARE";
  const isBenign = verdict.decision === "BENIGN";

  const verdictLabel = isMalware
    ? t("verdict.malware")
    : isBenign
      ? t("verdict.benign")
      : t("verdict.undecided");

  const verdictSummary = isMalware
    ? t("verdict.malwareSummary", { action: verdict.action_taken })
    : isBenign
      ? t("verdict.benignSummary", { action: verdict.action_taken })
      : t("verdict.undecidedSummary", { action: verdict.action_taken });

  const VerdictIcon = isMalware ? Bug : isBenign ? ShieldCheck : TriangleAlert;

  return (
    <Dialog open={!!analysis} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {verdictSummary}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-2">
          <TabsList>
            <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
            <TabsTrigger value="tags">{t("tabs.tags")}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 pt-4">
            {/* 판정 배너 */}
            <div
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-md border p-3",
                isMalware && "border-severity-malware/40 bg-severity-malware/10",
                isBenign && "border-severity-benign/40 bg-severity-benign/10",
                !isMalware &&
                  !isBenign &&
                  "border-severity-suspicious/40 bg-severity-suspicious/10",
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-1.5 font-bold",
                  isMalware && "text-severity-malware",
                  isBenign && "text-severity-benign",
                  !isMalware && !isBenign && "text-severity-suspicious",
                )}
              >
                <VerdictIcon className="size-4" aria-hidden />
                {verdictLabel}
              </span>
              <span className="flex-1 text-sm">{verdictSummary}</span>
              <Badge
                variant={isMalware ? "destructive" : "secondary"}
                className="tabular-nums"
              >
                {probToPercent(stage2.prob, 2)}
              </Badge>
            </div>

            {/* General Information */}
            <section>
              <h3 className="mb-2.5 text-base font-bold">{t("general")}</h3>
              <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 text-sm">
                <Row label={t("fields.computer")}>{DEMO_COMPUTER}</Row>
                <Row label={t("fields.origin")}>Agent (UMV Hybrid Engine)</Row>
                <Row label={t("fields.detectionTime")}>
                  {formatDateTime(analysis.received_at, locale)}
                </Row>
                <Row label={t("fields.originalArchive")}>
                  {shortHash(file.sha256)}.zip
                </Row>
                <Row label={t("fields.innerFile")}>
                  {shortHash(file.sha256)}.exe · {sourceLabel(analysis)}
                  <span className="text-muted-foreground mt-1 block font-mono text-xs">
                    {t("fields.extractedAt")} : {file.inner_path}
                  </span>
                </Row>
                <Row label={t("fields.scanType")}>{SCAN_TYPE}</Row>
                <Row label={t("fields.majorVirusType")}>
                  {MAJOR_VIRUS_TYPE}
                </Row>
              </dl>
            </section>

            {/* Multi-Stage Analysis */}
            <section>
              <h3 className="mb-2.5 text-base font-bold">{t("stages")}</h3>

              {/* Stage 1 */}
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">
                    {t("stage1.title")}
                  </span>
                  <Badge
                    variant={
                      stage1.status === "MATCH" ? "destructive" : "secondary"
                    }
                  >
                    {stage1.status}
                  </Badge>
                </div>
                <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <Row label={t("stage1.input")} mono>
                    {file.inner_path}
                  </Row>
                  <Row label={t("stage1.ruleMatches")}>
                    {stage1.matched_rules.length}
                  </Row>
                  <Row label={t("stage1.scanTime")}>{stage1.scan_ms} ms</Row>

                  {stage1.matched_rules.length > 0 && (
                    <Row label={t("stage1.matchedRules")}>
                      {stage1.matched_rules.map((rule) => (
                        <div key={rule.name} className="mb-1 last:mb-0">
                          - {rule.name}
                          <span className="text-muted-foreground ms-2 text-xs">
                            {t("stage1.tags", { tags: rule.tags.join(", ") })}
                          </span>
                        </div>
                      ))}
                    </Row>
                  )}

                  <Row label={t("stage1.result")}>
                    <span
                      className={cn(
                        "font-bold",
                        stage1.status === "MATCH" && "text-severity-malware",
                        stage1.status === "NO_MATCH" && "text-severity-benign",
                        stage1.status === "ERROR" && "text-severity-suspicious",
                      )}
                    >
                      {stage1.status === "MATCH"
                        ? t("stage1.match")
                        : stage1.status === "ERROR"
                          ? t("stage1.error")
                          : t("stage1.noMatch")}
                    </span>
                    {stage1.error && (
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {stage1.error}
                      </span>
                    )}
                  </Row>
                </dl>
              </div>

              {/* Stage 2 */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">
                    {t("stage2.title")}
                  </span>
                  <Badge
                    variant={
                      stage2.status === "MALWARE" ? "destructive" : "secondary"
                    }
                  >
                    {stage2.status}
                  </Badge>
                </div>
                <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <Row label={t("stage2.input")} mono>
                    {archiveName(analysis)}
                  </Row>
                  <Row label={t("stage2.innerFile")} mono>
                    {innerFileName(analysis)}
                  </Row>
                  <Row label={t("stage2.format")}>{file.format}</Row>
                  <Row label={t("stage2.subjectSize")}>
                    {formatBytes(file.size)}
                  </Row>
                  <Row label={t("stage2.subjectSha256")} mono>
                    {file.sha256}
                  </Row>
                  <Row label={t("stage2.malwareProb")}>
                    <span className="tabular-nums">
                      {stage2.prob?.toFixed(6) ?? "—"}
                    </span>
                  </Row>
                  <Row label={t("stage2.threshold")}>
                    <span className="tabular-nums">
                      {stage2.threshold.toFixed(2)}
                    </span>
                  </Row>
                  <Row label={t("stage2.inferenceTime")}>
                    {stage2.inference_seconds} sec
                  </Row>
                  <Row label={t("stage2.result")}>
                    <span
                      className={cn(
                        "font-bold",
                        stage2.status === "MALWARE" && "text-severity-malware",
                        stage2.status === "BENIGN" && "text-severity-benign",
                        (stage2.status === "UNDECIDED" ||
                          stage2.status === "ERROR") &&
                          "text-severity-suspicious",
                      )}
                    >
                      {stage2.status === "MALWARE"
                        ? t("stage2.malware")
                        : stage2.status === "BENIGN"
                          ? t("stage2.benign")
                          : stage2.status === "ERROR"
                            ? t("stage2.error")
                            : t("stage2.undecided")}
                    </span>
                    {stage2.error && (
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {stage2.error}
                      </span>
                    )}
                  </Row>
                </dl>
              </div>
            </section>

            {/* Quarantine */}
            <div className="border-severity-suspicious/40 bg-severity-suspicious/10 flex items-center gap-2.5 rounded-md border p-3 text-sm">
              <span className="text-severity-suspicious flex items-center gap-1.5 font-bold">
                <TriangleAlert className="size-4" aria-hidden />
                {t("quarantine")}
              </span>
              <span>
                {t("quarantineDetail", { action: verdict.action_taken })}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="tags" className="pt-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">UMV-Hybrid</Badge>
              <Badge variant="outline">YARA-{stage1.status}</Badge>
              <Badge variant="outline">AI-{stage2.status}</Badge>
              {isMalware && <Badge variant="outline">Auto-Quarantined</Badge>}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
