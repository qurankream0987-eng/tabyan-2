/**
 * إيماءات قارئ المصحف — آلة حالة واحدة تمنع تداخل الإيماءات:
 * - pinch (إصبعان) = تكبير فقط، ويلغي أي سحب/تقليب جارٍ
 * - zoom > 100%: السحب = تحريك (pan) محدود بحدود الصفحة — لا يقلب الصفحة أبداً
 * - zoom = 100%: السحب الأفقي = تقليب (يمين→يسار = الصفحة التالية، مصحف عربي RTL)
 * - نقرة = إظهار/إخفاء الأدوات · نقرة مزدوجة = تكبير ×2 / إعادة · Ctrl+عجلة = تكبير (سطح المكتب)
 * التحديثات أثناء الإيماءة تمر عبر requestAnimationFrame حتى لا يعاد تصيير React 60+ مرة/ثانية بشكل متضخم.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
const ZOOM_STEPS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const SWIPE_THRESHOLD = 60;
const TAP_SLOP = 10;
const DOUBLE_TAP_MS = 300;
const WHEEL_FLIP_COOLDOWN = 500;

interface Options {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** dir: next = تقدّم في المصحف (سحب يمين→يسار)، prev = رجوع */
  onSwipe: (dir: "next" | "prev") => void;
  onTap: () => void;
}

export interface ZoomPanState {
  zoom: number;
  x: number;
  y: number;
  /** إزاحة بصرية أثناء السحب للتقليب (zoom=1 فقط) */
  dragX: number;
  interacting: boolean;
}

export function useZoomPan({ containerRef, onSwipe, onTap }: Options) {
  const [state, setState] = useState<ZoomPanState>({ zoom: 1, x: 0, y: 0, dragX: 0, interacting: false });
  /**
   * ref هو «أحدث حالة مطلوبة» ومصدر الحقيقة الوحيد للإيماءات الجارية —
   * لا ننسخ state إليه أثناء التصيير أبداً: أي تصيير غير مرتبط كان يستبدل
   * القيمة المرتكبة بالقديمة قبل دور rAF فيبتلع التكبير بصمت (سباق).
   */
  const ref = useRef(state);
  const raf = useRef(0);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((next: ZoomPanState) => {
    ref.current = next;
    if (raf.current || fallback.current) return;
    // المسار الطبيعي: ارتكاب مُحاذى للإطار (دفعة واحدة لتحديثات الإيماءة المتسارعة)
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (fallback.current) { clearTimeout(fallback.current); fallback.current = null; }
      setState(ref.current);
    });
    // مسار احتياطي إلزامي: rAF قد يُثبَّط كلياً (تبويب خلفية، توفير طاقة،
    // متصفحات headless) فلا تُرتَّك الحالة أبداً ويموت التكبير — المؤقت يضمن الارتكاب
    fallback.current = setTimeout(() => {
      fallback.current = null;
      if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
      setState(ref.current);
    }, 100);
  }, []);

  /**
   * عند الإلغاء تُصفَّر المعرّفات فورًا — بلا ذلك تبقى معرّفات «truthy» لتوقيتات
   * ملغاة فيجعل حارسَ commit يخرج مبكرًا إلى الأبد (يحدث فعلًا مع تنظيف StrictMode
   * المزدوج في التطوير: إلغاء بلا تصفير = تكبير ميت حتى unmount كامل).
   */
  useEffect(
    () => () => {
      if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
      if (fallback.current) { clearTimeout(fallback.current); fallback.current = null; }
    },
    []
  );

  // تنظيف مؤقت النقرة عند إغلاق القارئ — بلا ذلك قد ينفذ onTap بعد unmount
  useEffect(
    () => () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    []
  );

  const clampXY = useCallback(
    (zoom: number, x: number, y: number) => {
      const el = containerRef.current;
      if (!el || zoom <= 1) return { x: 0, y: 0 };
      const maxX = ((zoom - 1) * el.clientWidth) / 2;
      const maxY = ((zoom - 1) * el.clientHeight) / 2;
      return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
    },
    [containerRef]
  );

  /** تكبير حول نقطة تركيز (fx, fy بالنسبة لمركز الحاوية) */
  const applyZoom = useCallback(
    (zoomRaw: number, fx = 0, fy = 0) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRaw));
      const s = ref.current;
      const nx = fx - (fx - s.x) * (zoom / s.zoom);
      const ny = fy - (fy - s.y) * (zoom / s.zoom);
      const c = clampXY(zoom, nx, ny);
      commit({ ...s, zoom, x: c.x, y: c.y, dragX: 0 });
    },
    [clampXY, commit]
  );

  const zoomIn = useCallback(() => {
    const z = ref.current.zoom;
    const next = ZOOM_STEPS.find((s) => s > z + 0.01) ?? MAX_ZOOM;
    applyZoom(next);
  }, [applyZoom]);

  const zoomOut = useCallback(() => {
    const z = ref.current.zoom;
    const prev = [...ZOOM_STEPS].reverse().find((s) => s < z - 0.01) ?? MIN_ZOOM;
    applyZoom(prev);
  }, [applyZoom]);

  const reset = useCallback(() => commit({ zoom: 1, x: 0, y: 0, dragX: 0, interacting: false }), [commit]);

  // ── أدوات الإيماءة الداخلية ──
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const pan = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const swipe = useRef<{ startX: number; startY: number; horizontal: boolean | null } | null>(null);
  const tap = useRef<{ x: number; y: number; t: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWheelFlip = useRef(0);

  const centerDelta = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { fx: 0, fy: 0 };
      const r = el.getBoundingClientRect();
      return { fx: clientX - (r.left + r.width / 2), fy: clientY - (r.top + r.height / 2) };
    },
    [containerRef]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const s = ref.current;

      if (pointers.current.size === 2) {
        // بداية قرص — إلغاء أي سحب/تقليب لمنع تداخل الإيماءتين
        const pts = [...pointers.current.values()];
        pinch.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), zoom: s.zoom };
        pan.current = null;
        swipe.current = null;
        if (tap.current) tap.current.moved = true;
        commit({ ...s, dragX: 0, interacting: true });
        return;
      }
      tap.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
      if (s.zoom > 1) {
        pan.current = { startX: e.clientX, startY: e.clientY, baseX: s.x, baseY: s.y };
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* بعض المتصفحات القديمة */
        }
      } else {
        swipe.current = { startX: e.clientX, startY: e.clientY, horizontal: null };
      }
    },
    [commit]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const s = ref.current;

      if (pinch.current && pointers.current.size >= 2) {
        const pts = [...pointers.current.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const cx = (pts[0].x + pts[1].x) / 2;
        const cy = (pts[0].y + pts[1].y) / 2;
        const { fx, fy } = centerDelta(cx, cy);
        applyZoom(pinch.current.zoom * (dist / pinch.current.dist), fx, fy);
        return;
      }
      if (tap.current && Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) > TAP_SLOP) {
        tap.current.moved = true;
      }
      if (pan.current && s.zoom > 1) {
        const nx = pan.current.baseX + (e.clientX - pan.current.startX);
        const ny = pan.current.baseY + (e.clientY - pan.current.startY);
        const c = clampXY(s.zoom, nx, ny);
        commit({ ...s, x: c.x, y: c.y, interacting: true });
        return;
      }
      if (swipe.current && s.zoom === 1) {
        const dx = e.clientX - swipe.current.startX;
        const dy = e.clientY - swipe.current.startY;
        if (swipe.current.horizontal === null && (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP)) {
          swipe.current.horizontal = Math.abs(dx) > Math.abs(dy);
        }
        if (swipe.current.horizontal) {
          // إزاحة بصرية محدودة تعطي إحساس السحب دون قفزة
          commit({ ...s, dragX: Math.max(-110, Math.min(110, dx * 0.6)), interacting: true });
        }
      }
    },
    [applyZoom, centerDelta, clampXY, commit]
  );

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(e.pointerId);
      const s = ref.current;

      if (pinch.current) {
        // انتهى القرص (أو بقي إصبع) — لا استئناف للتقليب بعد قرص أبداً
        if (pointers.current.size < 2) pinch.current = null;
        if (pointers.current.size === 1 && s.zoom > 1) {
          const p = [...pointers.current.values()][0];
          pan.current = { startX: p.x, startY: p.y, baseX: s.x, baseY: s.y };
        }
        commit({ ...s, dragX: 0, interacting: false });
        return;
      }

      const sw = swipe.current;
      if (sw) {
        swipe.current = null;
        const dx = e.clientX - sw.startX;
        if (sw.horizontal && Math.abs(dx) > SWIPE_THRESHOLD && s.zoom === 1) {
          // مصحف عربي: السحب يمين→يسار (dx سالب) = الصفحة التالية
          commit({ ...s, dragX: 0, interacting: false });
          onSwipe(dx < 0 ? "next" : "prev");
          return;
        }
      }
      if (pan.current) pan.current = null;
      commit({ ...s, dragX: 0, interacting: false });

      // نقرة / نقرة مزدوجة (فقط إن لم تتحرك ولم يسبقها قرص)
      const t = tap.current;
      tap.current = null;
      if (t && !t.moved && Date.now() - t.t < 400) {
        const now = Date.now();
        if (now - lastTap.current < DOUBLE_TAP_MS) {
          lastTap.current = 0;
          if (tapTimer.current) clearTimeout(tapTimer.current);
          const { fx, fy } = centerDelta(e.clientX, e.clientY);
          applyZoom(ref.current.zoom > 1 ? 1 : 2, fx, fy);
        } else {
          lastTap.current = now;
          if (tapTimer.current) clearTimeout(tapTimer.current);
          tapTimer.current = setTimeout(() => onTap(), DOUBLE_TAP_MS);
        }
      }
    },
    [applyZoom, centerDelta, commit, onSwipe, onTap]
  );

  // عجلة الفأرة: Ctrl+عجلة تكبير حول المؤشر، وعجلة أفقية (لوحة لمس) تقليب — مستمع أصلي غير passive لمنع التمرير
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        applyZoom(
          ref.current.zoom * (e.deltaY < 0 ? 1.12 : 0.89),
          e.clientX - (r.left + r.width / 2),
          e.clientY - (r.top + r.height / 2)
        );
        return;
      }
      if (ref.current.zoom === 1 && Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 24) {
        const now = Date.now();
        if (now - lastWheelFlip.current < WHEEL_FLIP_COOLDOWN) return;
        lastWheelFlip.current = now;
        onSwipe(e.deltaX < 0 ? "next" : "prev");
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [containerRef, applyZoom, onSwipe]);

  return {
    ...state,
    zoomIn,
    zoomOut,
    reset,
    applyZoom,
    zoomedIn: state.zoom > 1,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
