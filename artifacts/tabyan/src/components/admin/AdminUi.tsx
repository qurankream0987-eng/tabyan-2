/**
 * Supervision (لوحة الإشراف) interaction primitives for Web.
 *
 * Rule: an action never renders its form below the list. Simple create/edit opens
 * AdminModal or AdminDrawer (portal + body scroll lock, so the list keeps its scroll
 * position), long forms keep Save/Cancel in StickyFormFooter, destructive actions go
 * through ConfirmDialog, and secondary row actions live in ActionMenu.
 * Mobile counterparts: artifacts/mobile/components/admin-ui.tsx.
 */
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "@/components/app/Icon";

/* ───────────────────────── dirty tracking ───────────────────────── */

/** Snapshot of the form when it opened; `dirty` is true only after a real change. */
export function useDirtyState<T>(value: T | null): boolean {
  const baseline = useRef<string | null>(null);
  const serialized = value === null ? null : JSON.stringify(value);
  if (serialized === null) baseline.current = null;
  else if (baseline.current === null) baseline.current = serialized;
  return serialized !== null && baseline.current !== serialized;
}

/* ───────────────────────── buttons ───────────────────────── */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-burgundy text-white hover:bg-burgundy/90 active:bg-burgundy/80 dark:bg-gold dark:text-night dark:hover:bg-gold/90",
  secondary: "border border-burgundy/20 bg-card text-burgundy hover:bg-burgundy/5 active:bg-burgundy/10 dark:border-gold/30 dark:text-gold dark:hover:bg-gold/10",
  danger: "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/80",
  ghost: "text-burgundy hover:bg-burgundy/8 active:bg-burgundy/12 dark:text-gold dark:hover:bg-gold/10",
};

export type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; icon?: IconName; loading?: boolean; size?: "md" | "lg"; block?: boolean;
};

/** One button for every supervision action: 44px min (48px `lg`), radius-xl, loading + focus states. */
export function AdminButton({ variant = "primary", icon, loading = false, size = "md", block = false, className, children, disabled, type = "button", ...props }: AdminButtonProps) {
  return (
    <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl px-5 font-readex text-sm font-bold transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "lg" ? "min-h-[48px]" : "min-h-[44px]",
        block && "w-full",
        BUTTON_VARIANTS[variant], className,
      )}>
      {loading ? <span aria-hidden className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

/** 44×44 icon-only action (تعديل / عرض). Label is required: it is the accessible name and tooltip. */
export function IconAction({ icon, label, tone = "default", loading = false, className, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; tone?: "default" | "danger"; loading?: boolean }) {
  return (
    <button {...props} type="button" aria-label={label} title={label} disabled={disabled || loading} aria-busy={loading || undefined}
      className={cn(
        "inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-50",
        tone === "danger" ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-burgundy/10 text-burgundy hover:bg-burgundy/20 dark:bg-gold/10 dark:text-gold dark:hover:bg-gold/20",
        className,
      )}>
      {loading ? <span aria-hidden className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name={icon} size={16} />}
    </button>
  );
}

/* ───────────────────────── page structure ───────────────────────── */

export function AdminPageHeader({ title, icon, description, meta, actions }: { title: string; icon?: IconName; description?: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 font-amiri text-2xl text-burgundy dark:text-gold">{icon ? <Icon name={icon} size={24} /> : null}{title}</h1>
        {description ? <p className="mt-1 font-readex text-sm text-muted-foreground">{description}</p> : null}
        {meta ? <div className="mt-1 font-readex text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/* ───────────────────────── dialog shell (modal / drawer) ───────────────────────── */

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

/** Focus trap, Escape, body scroll lock and focus restore without scrolling the page. */
function useDialogBehavior(open: boolean, panelRef: React.RefObject<HTMLDivElement | null>, onEscape: () => void) {
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; }, [onEscape]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => {
      const preferred = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? focusable().find((element) => element.dataset.dialogClose === undefined);
      (preferred ?? panelRef.current)?.focus({ preventScroll: true });
    });
    const onKey = (event: KeyboardEvent) => {
      const panels = document.querySelectorAll("[data-admin-dialog]");
      if (panels[panels.length - 1] !== panelRef.current) return;
      if (event.key === "Escape") { event.preventDefault(); escapeRef.current(); return; }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); panelRef.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, panelRef]);
}

type DialogShellProps = {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode;
  /** A render function receives the guarded close so «إلغاء» also asks before discarding. */
  footer?: ReactNode | ((requestClose: () => void) => ReactNode);
  dirty?: boolean; busy?: boolean; size?: "md" | "lg" | "xl"; variant: "modal" | "drawer";
};

function DialogShell({ open, onClose, title, subtitle, children, footer, dirty = false, busy = false, size = "md", variant }: DialogShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useEffect(() => { if (!open) setConfirmDiscard(false); }, [open]);
  const requestClose = () => {
    if (busy) return;
    if (confirmDiscard) { setConfirmDiscard(false); return; }
    if (dirty) { setConfirmDiscard(true); return; }
    onClose();
  };
  useDialogBehavior(open, panelRef, requestClose);
  if (!open) return null;
  const width = size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-2xl" : "max-w-lg";
  return createPortal(
    <div className={cn("fixed inset-0 z-[300] flex", variant === "modal" ? "items-end justify-center sm:items-center sm:p-6" : "justify-end")} dir="rtl">
      <div className="tabyan-modal-backdrop absolute inset-0 bg-black/30 backdrop-blur-[2px] dark:bg-black/55" onClick={requestClose} aria-hidden />
      <div ref={panelRef} tabIndex={-1} data-admin-dialog role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cn(
          "tabyan-modal-panel relative flex w-full flex-col bg-card text-foreground shadow-2xl outline-none dark:bg-night",
          "border border-burgundy/15 dark:border-gold/20",
          variant === "modal"
            ? cn(width, "max-h-[min(92dvh,56rem)] rounded-t-3xl sm:rounded-3xl")
            : cn(size === "xl" ? "sm:max-w-3xl" : size === "lg" ? "sm:max-w-xl" : "sm:max-w-md", "h-dvh rounded-none sm:rounded-e-none sm:rounded-s-3xl"),
        )}>
        <div className="flex shrink-0 items-start gap-3 border-b border-burgundy/10 px-5 py-4 dark:border-gold/15 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-amiri text-xl leading-snug text-burgundy dark:text-gold">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate font-readex text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <IconAction icon="x" label="إغلاق" data-dialog-close="" onClick={requestClose} disabled={busy} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {footer ? <StickyFormFooter>{typeof footer === "function" ? footer(requestClose) : footer}</StickyFormFooter> : null}
        {confirmDiscard ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-black/35 p-5" role="alertdialog" aria-modal="true" aria-label="تجاهل التعديلات">
            <div className="w-full max-w-sm space-y-3 rounded-2xl border border-burgundy/15 bg-card p-5 text-center shadow-xl dark:bg-night">
              <p className="font-readex font-bold">تجاهل التعديلات؟</p>
              <p className="font-readex text-sm text-muted-foreground">لديك تغييرات لم تُحفظ في «{title}». إذا أغلقت الآن فلن تُحفظ.</p>
              <div className="flex gap-2">
                <AdminButton variant="secondary" block data-autofocus onClick={() => setConfirmDiscard(false)}>متابعة التعديل</AdminButton>
                <AdminButton variant="danger" block onClick={() => { setConfirmDiscard(false); onClose(); }}>تجاهل</AdminButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Simple create/edit: centered on desktop, bottom-anchored on phones. */
export function AdminModal(props: Omit<DialogShellProps, "variant">) { return <DialogShell {...props} variant="modal" />; }
/** Longer forms and record details: slides in from the inline-end edge. */
export function AdminDrawer(props: Omit<DialogShellProps, "variant">) { return <DialogShell {...props} variant="drawer" />; }

/** Always-visible action bar at the bottom of a dialog (Save / Cancel never need scrolling). */
export function StickyFormFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex shrink-0 flex-wrap-reverse items-center justify-end gap-2 border-t border-burgundy/10 bg-card/95 px-5 py-3 backdrop-blur dark:border-gold/15 dark:bg-night/95 sm:px-6", className)}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      {children}
    </div>
  );
}

/** Standard Cancel + primary pair. */
export function FormActions({ onCancel, primaryLabel, onPrimary, loading = false, disabled = false, danger = false, cancelLabel = "إلغاء", primaryType = "button", form }: {
  onCancel: () => void; primaryLabel: string; onPrimary?: () => void; loading?: boolean; disabled?: boolean; danger?: boolean; cancelLabel?: string; primaryType?: "button" | "submit"; form?: string;
}) {
  return <>
    <AdminButton variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</AdminButton>
    <AdminButton variant={danger ? "danger" : "primary"} type={primaryType} form={form} onClick={onPrimary} loading={loading} disabled={disabled} className="min-w-32">{primaryLabel}</AdminButton>
  </>;
}

/* ───────────────────────── confirmation ───────────────────────── */

/**
 * Specific confirmation: names the item and its impact. The danger button has its own
 * loading state and cannot fire twice. `requireText` adds a typed safeguard.
 */
export function ConfirmDialog({ open, title, itemName, impact, confirmLabel, onConfirm, onCancel, loading = false, tone = "danger", requireText }: {
  open: boolean; title: string; itemName?: string; impact?: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
  loading?: boolean; tone?: "danger" | "primary"; requireText?: string;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => { if (!open) setTyped(""); }, [open]);
  const blocked = !!requireText && typed.trim() !== requireText;
  return (
    <AdminModal open={open} onClose={onCancel} busy={loading} title={title}
      footer={<FormActions onCancel={onCancel} primaryLabel={confirmLabel} danger={tone === "danger"} loading={loading} disabled={blocked} onPrimary={() => { if (!loading && !blocked) onConfirm(); }} />}>
      <div className="space-y-3 text-center">
        <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-full", tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-gold/15 text-burgundy")}><Icon name={tone === "danger" ? "alert-triangle" : "info"} size={26} /></div>
        {itemName ? <p className="font-readex text-base font-bold text-burgundy dark:text-gold">«{itemName}»</p> : null}
        {impact ? <div className="font-readex text-sm leading-relaxed text-muted-foreground">{impact}</div> : null}
        {requireText ? (
          <label className="block text-start font-readex text-xs font-bold">
            للتأكيد اكتب «{requireText}»
            <input value={typed} onChange={(event) => setTyped(event.target.value)} data-autofocus autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-destructive/40 bg-background px-4 py-2.5 font-readex text-sm focus:outline-none focus:ring-2 focus:ring-destructive/40" />
          </label>
        ) : null}
      </div>
    </AdminModal>
  );
}

/* ───────────────────────── action menu ───────────────────────── */

export type MenuAction = { key: string; label: string; icon: IconName; onSelect: () => void; danger?: boolean; disabled?: boolean };

/** «المزيد» per-row menu; keyboard and RTL handled by Radix. */
export function ActionMenu({ label, actions, loading = false }: { label: string; actions: MenuAction[]; loading?: boolean }) {
  return (
    <DropdownMenu.Root dir="rtl" modal={false}>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={label} title={label} disabled={loading} aria-busy={loading || undefined}
          className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-burgundy/10 text-burgundy transition-colors hover:bg-burgundy/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 data-[state=open]:bg-burgundy/20 dark:bg-gold/10 dark:text-gold">
          {loading ? <span aria-hidden className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <MoreHorizontal size={18} aria-hidden />}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={12}
          className="z-[250] min-w-48 rounded-2xl border border-burgundy/15 bg-card p-1.5 font-readex shadow-xl dark:border-gold/20 dark:bg-night">
          {actions.map((action) => (
            <DropdownMenu.Item key={action.key} disabled={action.disabled} onSelect={action.onSelect}
              className={cn(
                "flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                action.danger ? "text-destructive data-[highlighted]:bg-destructive/10" : "text-foreground data-[highlighted]:bg-burgundy/8 dark:data-[highlighted]:bg-gold/10",
              )}>
              <Icon name={action.icon} size={16} />{action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ───────────────────────── form fields ───────────────────────── */

const CONTROL = "w-full rounded-xl border bg-background px-4 font-readex text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-60";
const controlBorder = (error?: string | null) => (error ? "border-destructive focus:ring-destructive/40" : "border-input");

export function Field({ label, required = false, helper, error, children, htmlFor, className }: { label: string; required?: boolean; helper?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block font-readex text-xs font-bold text-foreground">{label}{required ? <span className="text-destructive"> *</span> : null}</label>
      {children}
      {error ? <p role="alert" className="font-readex text-xs font-semibold text-destructive">{error}</p> : helper ? <p className="font-readex text-[11px] text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

export function TextField({ label, required, helper, error, ltr = false, className, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: ReactNode; error?: string | null; ltr?: boolean }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field label={label} required={required} helper={helper} error={error} htmlFor={fieldId} className={className}>
      <input {...props} id={fieldId} dir={ltr ? "ltr" : undefined} aria-invalid={!!error || undefined} required={required} className={cn(CONTROL, controlBorder(error), "min-h-[44px] py-2.5", ltr && "text-left")} />
    </Field>
  );
}

export function TextAreaField({ label, required, helper, error, className, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; helper?: ReactNode; error?: string | null }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field label={label} required={required} helper={helper} error={error} htmlFor={fieldId} className={className}>
      <textarea {...props} id={fieldId} aria-invalid={!!error || undefined} required={required} className={cn(CONTROL, controlBorder(error), "min-h-24 resize-y py-2.5 leading-relaxed")} />
    </Field>
  );
}

export function SelectField({ label, required, helper, error, options, className, id, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; helper?: ReactNode; error?: string | null; options: readonly (readonly [string, string])[] }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <Field label={label} required={required} helper={helper} error={error} htmlFor={fieldId} className={className}>
      <select {...props} id={fieldId} aria-invalid={!!error || undefined} className={cn(CONTROL, controlBorder(error), "min-h-[44px] py-2")}>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </Field>
  );
}

/** Chips for single or multiple choice (short option lists). */
export function ChipGroup({ label, helper, options, value, onChange, multiple = false }: {
  label: string; helper?: ReactNode; options: readonly { value: string; label: string }[];
  value: string | string[]; onChange: (value: string | string[]) => void; multiple?: boolean;
}) {
  const selected = (option: string) => (Array.isArray(value) ? value.includes(option) : value === option);
  return (
    <Field label={label} helper={helper}>
      <div role={multiple ? "group" : "radiogroup"} aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = selected(option.value);
          return (
            <button key={option.value} type="button" role={multiple ? "checkbox" : "radio"} aria-checked={on}
              onClick={() => onChange(multiple ? (on ? (value as string[]).filter((v) => v !== option.value) : [...(value as string[]), option.value]) : option.value)}
              className={cn("min-h-[40px] rounded-full border px-3.5 font-readex text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
                on ? "border-burgundy bg-burgundy text-white dark:border-gold dark:bg-gold dark:text-night" : "border-burgundy/15 bg-background text-burgundy hover:bg-burgundy/5 dark:text-gold")}>
              {option.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function SwitchField({ label, helper, checked, onChange, disabled = false }: { label: string; helper?: ReactNode; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-input bg-background px-4 py-2 text-start transition hover:bg-burgundy/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50">
      <span className="flex-1"><span className="block font-readex text-sm font-bold">{label}</span>{helper ? <span className="block font-readex text-[11px] text-muted-foreground">{helper}</span> : null}</span>
      <span aria-hidden className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-burgundy dark:bg-gold" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "start-[1.375rem]" : "start-0.5")} />
      </span>
    </button>
  );
}

/** Styled file picker button (the native input stays accessible via the label). */
export function FileButton({ label, accept, onPick, loading = false, progress, disabled = false, icon = "upload" }: { label: string; accept: string; onPick: (file: File) => void; loading?: boolean; progress?: number; disabled?: boolean; icon?: IconName }) {
  return (
    <div className="space-y-2">
      <label className={cn("inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-burgundy/20 bg-card px-4 font-readex text-sm font-bold text-burgundy transition hover:bg-burgundy/5 focus-within:outline focus-within:outline-2 focus-within:outline-gold dark:text-gold",
        (loading || disabled) && "pointer-events-none opacity-60")}>
        {loading ? <span aria-hidden className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name={icon} size={16} />}
        {loading && progress != null ? `جارٍ الرفع… ${progress}%` : label}
        <input type="file" accept={accept} className="sr-only" disabled={loading || disabled}
          onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onPick(file); }} />
      </label>
      {loading && progress != null ? <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-gold transition-all" style={{ width: `${progress}%` }} /></div> : null}
    </div>
  );
}

/** Form-level server or validation error (never technical text). */
export function FormErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 font-readex text-sm font-semibold text-destructive"><Icon name="alert-triangle" size={16} />{message}</div>;
}

/* ───────────────────────── search & filters ───────────────────────── */

export type FilterDefinition = { key: string; label: string; options: readonly (readonly [string, string])[] };

/**
 * Search + filter selects + active count + «مسح الفلاتر» (same groups as the Native filter sheet).
 * Sticky under the shell header, so the page's primary `action` stays reachable at any scroll depth.
 */
export function AdminFilterBar({ query, onQuery, placeholder = "بحث…", filters, values, onChange, resultSummary, action }: {
  query: string; onQuery: (value: string) => void; placeholder?: string; filters: readonly FilterDefinition[];
  values: Record<string, string>; onChange: (values: Record<string, string>) => void; resultSummary?: ReactNode; action?: ReactNode;
}) {
  const filterCount = Object.values(values).filter(Boolean).length;
  const active = filterCount + (query.trim() ? 1 : 0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const clearFilters = () => onChange(Object.fromEntries(filters.map((filter) => [filter.key, ""])));
  return (
    <div className="sticky top-14 z-30 space-y-2 rounded-2xl border border-burgundy/10 bg-card/95 p-2.5 shadow-sm backdrop-blur dark:border-gold/15 dark:bg-night/95 sm:p-3 lg:top-2">
      <div className="flex items-center gap-2 sm:flex-wrap">
        <div className="relative min-w-0 flex-1 sm:basis-56">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted-foreground"><Icon name="search" size={16} /></span>
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={placeholder} aria-label={placeholder} type="search"
            className={cn(CONTROL, "min-h-[44px] border-input ps-10 py-2.5")} />
        </div>
        {/* Desktop/tablet: inline selects. Phones: one «الفلاتر» button opening a bottom sheet (Native parity). */}
        <div className="hidden sm:contents">
          {filters.map((filter) => (
            <select key={filter.key} aria-label={filter.label} value={values[filter.key] ?? ""} onChange={(event) => onChange({ ...values, [filter.key]: event.target.value })}
              className={cn(CONTROL, "min-h-[44px] w-auto basis-36 py-2", values[filter.key] ? "border-burgundy/50 font-bold text-burgundy dark:border-gold/50 dark:text-gold" : "border-input")}>
              <option value="">{filter.label}: الكل</option>
              {filter.options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          ))}
        </div>
        {filters.length ? (
          <button type="button" onClick={() => setSheetOpen(true)} aria-label={filterCount ? `الفلاتر، ${filterCount} مفعّلة` : "الفلاتر"}
            className={cn("relative inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl border transition sm:hidden",
              filterCount ? "border-burgundy bg-burgundy text-white dark:border-gold dark:bg-gold dark:text-night" : "border-input bg-background text-burgundy dark:text-gold")}>
            <Icon name="filter" size={18} />
            {filterCount ? <span className="absolute -top-1.5 -start-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 font-readex text-[11px] font-bold text-night">{filterCount}</span> : null}
          </button>
        ) : null}
        {action ? <div className="flex shrink-0">{action}</div> : null}
      </div>
      <AdminModal open={sheetOpen} onClose={() => setSheetOpen(false)} title="تصفية النتائج" subtitle={filterCount ? `${filterCount} فلتر مفعّل` : undefined}
        footer={<FormActions cancelLabel="مسح الفلاتر" onCancel={clearFilters} primaryLabel="عرض النتائج" onPrimary={() => setSheetOpen(false)} />}>
        <div className="space-y-3">{filters.map((filter) => (
          <SelectField key={filter.key} label={filter.label} value={values[filter.key] ?? ""} options={[["", "الكل"], ...filter.options]}
            onChange={(event) => onChange({ ...values, [filter.key]: event.target.value })} />
        ))}</div>
      </AdminModal>
      {active || resultSummary ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 font-readex text-xs text-muted-foreground">
          <span>{resultSummary}</span>
          {active ? <button type="button" onClick={() => { onQuery(""); clearFilters(); }} className="min-h-[40px] rounded-lg px-2 font-bold text-burgundy hover:bg-burgundy/5 dark:text-gold">مسح الفلاتر ({active})</button> : null}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────────────────── loading & empty ───────────────────────── */

export function ListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-2 lg:grid-cols-2", className)} role="status" aria-label="جارٍ التحميل">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl border border-burgundy/10 bg-card p-4">
          <div className="skeleton h-[44px] w-[44px] rounded-xl" />
          <div className="flex-1 space-y-2"><div className="skeleton h-3.5 w-3/5 rounded" /><div className="skeleton h-3 w-2/5 rounded" /></div>
        </div>
      ))}
    </div>
  );
}

export function AdminEmpty({ icon = "search", title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-burgundy/20 bg-card/50 px-6 py-12 text-center dark:border-gold/20">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-burgundy dark:text-gold"><Icon name={icon} size={26} /></div>
      <p className="font-readex font-bold">{title}</p>
      {description ? <p className="max-w-sm font-readex text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function AdminErrorState({ message = "تعذر تحميل البيانات. تحقق من الاتصال وحاول مرة أخرى.", onRetry }: { message?: string; onRetry?: () => void }) {
  return <AdminEmpty icon="wifi-off" title="حدث خطأ مؤقت" description={message} action={onRetry ? <AdminButton variant="secondary" icon="refresh" onClick={onRetry}>إعادة المحاولة</AdminButton> : undefined} />;
}
