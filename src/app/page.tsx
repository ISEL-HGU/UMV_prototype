import { UploadForm } from "@/components/upload/upload-form";

/** 진입 화면. 대시보드와 분리된 독립 페이지다. */
export default function UploadPage() {
  return (
    <main className="bg-muted/40 flex min-h-dvh items-center justify-center p-6">
      <UploadForm />
    </main>
  );
}
