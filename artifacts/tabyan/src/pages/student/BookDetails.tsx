import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import GlassCard from "@/components/app/GlassCard";
import EmptyState from "@/components/app/EmptyState";
import Icon from "@/components/app/Icon";
import PrimaryButton from "@/components/app/PrimaryButton";
import { trpc } from "@/providers/trpc";
import { authStore } from "@/lib/auth";
import { bookFileUrl, objectUrl } from "@/lib/upload";
import { DEMO_BOOKS } from "@/lib/demo/student-extra";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type Book = {
  id: string; title: string; author: string | null; category: string; section: string;
  contentType: string; sourceType?: string; fileObjectKey?: string | null;
  fileUrl: string | null; externalUrl: string | null; textContent: string | null;
  coverUrl?: string | null; description?: string | null; audioUrl?: string | null;
  isBookmarked: boolean; isDownloaded: boolean;
};

const typeLabel: Record<string, string> = { pdf: "PDF", text: "نص", audio: "صوت", video: "فيديو", link: "رابط" };

function streamUrl(book: Book) {
  const uploaded = book.sourceType === "uploaded" || book.fileObjectKey?.startsWith("/objects/") || book.fileUrl?.startsWith("/objects/");
  return uploaded ? bookFileUrl(book.id, true) : book.externalUrl ?? book.fileUrl ?? "";
}

function PdfReader({ book, onBack }: { book: Book; onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [frameWidth, setFrameWidth] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const task = pdfjs.getDocument(streamUrl(book));
    let active = true;
    task.promise.then((document) => {
      if (!active) return;
      setPdf(document);
      setTotal(document.numPages);
      setError("");
    }).catch(() => active && setError("تعذر فتح ملف PDF — تحقق من صلاحية الملف"));
    return () => { active = false; void task.destroy(); };
  }, [book]);

  useEffect(() => {
    if (!frameRef.current) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!pdf || !canvasRef.current || !frameWidth) return;
    let cancelled = false;
    void pdf.getPage(page).then((pdfPage) => {
      if (cancelled) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const scale = fitWidth ? Math.max(0.45, (frameWidth - 24) / base.width) * zoom : zoom;
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current!;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      void pdfPage.render({ canvasContext: context, viewport }).promise.catch(() => {
        if (!cancelled) setError("تعذر عرض الصفحة الحالية");
      });
    }).catch(() => !cancelled && setError("تعذر تحميل الصفحة"));
    return () => { cancelled = true; };
  }, [pdf, page, zoom, fitWidth, frameWidth]);

  return (
    <div className="space-y-3 page-enter">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 font-readex text-sm font-bold text-burgundy hover:text-gold-dark">
          <Icon name="arrow-left" size={18} /> العودة إلى الكتاب
        </button>
        <span className="font-amiri text-xl font-extrabold text-burgundy mr-auto">{book.title}</span>
      </div>
      <GlassCard className="p-2 sm:p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border pb-2 mb-2">
          <div className="flex items-center gap-1.5" dir="ltr">
            <button onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))} className="reader-control" title="تكبير">+</button>
            <span className="font-readex text-xs min-w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.1).toFixed(2)))} className="reader-control" title="تصغير">−</button>
            <button onClick={() => { setFitWidth(true); setZoom(1); }} className="reader-control px-2 font-readex text-xs" title="ملاءمة العرض">ملاءمة العرض</button>
          </div>
          <div className="flex items-center gap-2" dir="ltr">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="reader-control disabled:opacity-30" title="الصفحة السابقة">‹</button>
            <span className="font-readex text-xs" dir="rtl">صفحة {page} من {total || "—"}</span>
            <button disabled={!total || page >= total} onClick={() => setPage((p) => p + 1)} className="reader-control disabled:opacity-30" title="الصفحة التالية">›</button>
          </div>
        </div>
        <div ref={frameRef} className="max-w-full overflow-auto rounded-xl bg-muted/30 p-3 min-h-[50vh] flex justify-center">
          {error ? <p className="font-readex text-sm text-destructive self-center">{error}</p> : <canvas ref={canvasRef} className="shadow-md bg-white shrink-0" />}
        </div>
      </GlassCard>
    </div>
  );
}

function TextReader({ book, onBack }: { book: Book; onBack: () => void }) {
  const [fontSize, setFontSize] = useState(18);
  return (
    <div className="space-y-3 page-enter">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 font-readex text-sm font-bold text-burgundy"><Icon name="arrow-left" size={18} /> العودة إلى الكتاب</button>
      <GlassCard className="p-5 sm:p-8">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-5">
          <div><h1 className="font-amiri text-3xl font-extrabold text-burgundy">{book.title}</h1><p className="font-readex text-xs text-muted-foreground mt-1">{book.author ?? "—"}</p></div>
          <div className="flex items-center gap-1" dir="ltr">
            <button onClick={() => setFontSize((s) => Math.min(28, s + 2))} className="reader-control">A+</button>
            <button onClick={() => setFontSize((s) => Math.max(14, s - 2))} className="reader-control">A−</button>
          </div>
        </div>
        <article className="whitespace-pre-wrap font-readex leading-[2.2] text-foreground" style={{ fontSize }}>{book.textContent}</article>
      </GlassCard>
    </div>
  );
}

export default function BookDetails() {
  const { id = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const DEMO = authStore.isDemo;
  const query = trpc.library.detail.useQuery({ bookId: id }, { enabled: !DEMO && !!id });
  const book = (DEMO ? DEMO_BOOKS.find((item) => item.id === id) : query.data) as Book | undefined;
  const readMode = location.pathname.endsWith("/read");
  if (!book) return query.isLoading ? <div className="h-52 skeleton rounded-[1.5rem]" /> : <EmptyState title="الكتاب غير موجود أو غير متاح" />;
  if (readMode && book.contentType === "pdf" && (book.fileUrl || book.externalUrl || book.fileObjectKey)) {
    const uploaded = book.sourceType === "uploaded" || book.fileObjectKey?.startsWith("/objects/") || book.fileUrl?.startsWith("/objects/");
    return uploaded ? <PdfReader book={book} onBack={() => navigate(`/student/library/book/${book.id}`)} /> : (
      <div className="space-y-3"><button onClick={() => navigate(`/student/library/book/${book.id}`)} className="inline-flex items-center gap-1.5 font-readex text-sm font-bold text-burgundy"><Icon name="arrow-left" size={18} /> العودة إلى الكتاب</button><iframe title={book.title} src={streamUrl(book)} className="w-full h-[78vh] rounded-2xl border bg-white" /></div>
    );
  }
  if (readMode && book.contentType === "text" && book.textContent) return <TextReader book={book} onBack={() => navigate(`/student/library/book/${book.id}`)} />;
  const source = streamUrl(book);
  return (
    <div className="space-y-4 page-enter">
      <Link to="/student/library" className="inline-flex items-center gap-1.5 font-readex text-sm font-bold text-burgundy"><Icon name="arrow-left" size={18} /> العودة إلى المكتبة</Link>
      <GlassCard className="p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row gap-5">
          {book.coverUrl ? <img src={book.coverUrl.startsWith("/objects/") ? objectUrl(book.coverUrl) : book.coverUrl} alt="" className="w-32 h-44 rounded-2xl object-cover border border-border mx-auto sm:mx-0" /> : <div className="w-32 h-44 rounded-2xl bg-gold/15 flex items-center justify-center text-burgundy mx-auto sm:mx-0"><Icon name="books" size={42} /></div>}
          <div className="flex-1 text-center sm:text-right">
            <div className="font-readex text-xs text-muted-foreground mb-2">{typeLabel[book.contentType] ?? book.contentType}</div>
            <h1 className="font-amiri text-4xl font-extrabold text-burgundy">{book.title}</h1>
            <p className="font-readex text-sm text-muted-foreground mt-2">{book.author ?? "—"}</p>
            {book.description && <p className="font-readex text-sm leading-7 mt-4">{book.description}</p>}
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-5">
              {(book.contentType === "pdf" && source) || (book.contentType === "text" && book.textContent) ? <PrimaryButton onClick={() => navigate(`/student/library/book/${book.id}/read`)}>قراءة الكتاب</PrimaryButton> : null}
              {book.contentType === "pdf" && book.sourceType === "uploaded" && <a href={bookFileUrl(book.id, false)} className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2.5 font-readex text-sm font-bold text-night" download><Icon name="download" size={17} /> تنزيل</a>}
              {book.contentType === "audio" && source && <audio src={book.fileUrl?.startsWith("/objects/") ? objectUrl(book.fileUrl) : source} controls className="max-w-full" />}
              {book.contentType === "video" && source && <video src={book.fileUrl?.startsWith("/objects/") ? objectUrl(book.fileUrl) : source} controls className="w-full max-w-xl rounded-xl bg-night" />}
              {book.contentType === "link" && source && <a href={source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-burgundy px-4 py-2.5 font-readex text-sm font-bold text-white">فتح الرابط <Icon name="arrow-left" size={17} /></a>}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}