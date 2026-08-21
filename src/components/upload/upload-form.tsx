"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, FolderClosed, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { analyzeFile, ApiError, MAX_UPLOAD_BYTES } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_LABEL = `${MAX_UPLOAD_BYTES / (1024 * 1024)} MB`;

/**
 * 업로드 폼 스키마. 파이프라인이 파일 하나만 받으므로 단일 파일만 허용한다.
 * File 은 브라우저 전용 타입이라 이 컴포넌트가 클라이언트여야 한다.
 */
const uploadSchema = z.object({
  file: z
    .instanceof(File, { message: "required" })
    .refine((f) => f.size > 0, { message: "empty" })
    .refine((f) => f.size <= MAX_UPLOAD_BYTES, { message: "tooLarge" }),
});

type UploadValues = z.infer<typeof uploadSchema>;

export function UploadForm() {
  const t = useTranslations("upload");
  const tc = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UploadValues>({
    resolver: zodResolver(uploadSchema),
  });

  const mutation = useMutation({
    mutationFn: analyzeFile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : t("errors.network"),
      );
    },
  });

  /** Zod 는 메시지 키만 넘기고 번역은 여기서 한다 */
  const errorMessage = (() => {
    const key = errors.file?.message;
    if (!key) return null;
    if (key === "tooLarge") return t("errors.tooLarge", { limit: MAX_LABEL });
    if (key === "empty") return t("errors.empty");
    return t("errors.required");
  })();

  const busy = mutation.isPending;

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values.file))}
      className="bg-card w-full max-w-md rounded-2xl border p-7 shadow-lg"
      noValidate
    >
      <div className="bg-primary/10 text-primary mb-5 flex size-14 items-center justify-center rounded-full">
        <FolderClosed className="size-6" aria-hidden />
      </div>

      <h1 className="text-lg font-bold">{t("title")}</h1>
      <p className="text-muted-foreground mt-1 mb-5 text-sm">
        {t("description")}
      </p>

      <Controller
        control={control}
        name="file"
        render={({ field }) => (
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (busy) return;
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) field.onChange(dropped);
            }}
            className={cn(
              "flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors",
              dragging && "border-primary bg-primary/5",
              errorMessage && "border-destructive",
              busy && "opacity-70",
            )}
          >
            {busy ? (
              <>
                <Loader2
                  className="text-primary size-10 animate-spin"
                  aria-hidden
                />
                <p className="font-semibold">{t("analyzing")}</p>
                <p className="text-muted-foreground text-xs">
                  {t("analyzingHint")}
                </p>
              </>
            ) : (
              <>
                <FileUp className="text-primary size-10" aria-hidden />
                {field.value ? (
                  <div>
                    <p className="font-semibold break-all">
                      {field.value.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {(field.value.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <p className="font-semibold">{t("dropzone")}</p>
                )}

                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  {field.value ? t("reselect") : t("browse")}
                </Button>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) field.onChange(picked);
                e.target.value = "";
              }}
            />
          </div>
        )}
      />

      {errorMessage && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => reset()}
        >
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? t("analyzing") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
