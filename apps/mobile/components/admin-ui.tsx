/**
 * Supervision (لوحة الإشراف) interaction primitives for Native.
 *
 * Rule: an action never renders its form below the list. Simple create/edit
 * opens an AdminSheet, complex flows use `fullScreen`, row actions use
 * MobileActionSheet, and destructive actions go through ConfirmAction.
 * Sheets are RN Modals layered over the screen, so the list's ScrollView
 * keeps its offset while they are open and after they close.
 *
 * iOS stacking: a Modal shown while another is presented must be rendered
 * inside that Modal's children (e.g. a confirm inside its sheet). To replace
 * one sheet with another, use `useSheetChain` so the second waits for dismissal.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Icon } from "./ui";
import { palette, useTheme } from "../lib/theme";
import { SoftPressable } from "./soft-pressable";

const FONT = { regular: "IBMPlexSansArabic_400Regular", medium: "IBMPlexSansArabic_500Medium", semibold: "IBMPlexSansArabic_600SemiBold", bold: "IBMPlexSansArabic_700Bold" } as const;

/* ───────────────────────── dirty tracking ───────────────────────── */

/** Snapshot of the form when it opened; `dirty` is true only after a real change. */
export function useDirtyState<T>(value: T | null): boolean {
  const baseline = useRef<string | null>(null);
  const opened = value !== null;
  const serialized = opened ? JSON.stringify(value) : null;
  if (!opened) baseline.current = null;
  else if (baseline.current === null) baseline.current = serialized;
  return opened && baseline.current !== serialized;
}

/* ───────────────────────── modal sequencing ───────────────────────── */

/**
 * iOS cannot present a Modal while another is still dismissing (it fails silently),
 * so "close A, then open B" waits for A's dismissal. Elsewhere the next tick suffices.
 */
function useDismissed(visible: boolean, onDismissed?: () => void) {
  const wasVisible = useRef(visible);
  const callback = useRef(onDismissed);
  callback.current = onDismissed;
  useEffect(() => {
    if (Platform.OS !== "ios" && wasVisible.current && !visible) {
      const handle = setTimeout(() => callback.current?.(), 0);
      wasVisible.current = visible;
      return () => clearTimeout(handle);
    }
    wasVisible.current = visible;
    return undefined;
  }, [visible]);
  return Platform.OS === "ios" ? () => callback.current?.() : undefined;
}

/** `chain(close, next)`: closes one sheet and opens the next only after it is gone. */
export function useSheetChain() {
  const pending = useRef<(() => void) | null>(null);
  const onDismissed = useCallback(() => { const next = pending.current; pending.current = null; next?.(); }, []);
  const chain = useCallback((close: () => void, next: () => void) => { pending.current = next; close(); }, []);
  return { chain, onDismissed };
}

/* ───────────────────────── feedback (snackbar) ───────────────────────── */

type Tone = "success" | "error" | "info";
type FeedbackState = { id: number; message: string; tone: Tone } | null;
const FeedbackContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function AdminFeedbackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FeedbackState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const show = useCallback((message: string, tone: Tone = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setState({ id: Date.now(), message, tone });
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setState(null));
    }, tone === "error" ? 4500 : 2800);
  }, [opacity]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const background = state?.tone === "error" ? colors.danger : state?.tone === "info" ? palette.night : colors.success;
  return (
    <FeedbackContext.Provider value={show}>
      <View style={styles.flex}>
        {children}
        {state ? (
          <Animated.View pointerEvents="box-none" style={[styles.snackWrap, { bottom: insets.bottom + 16, opacity }]}>
            <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.snack, { backgroundColor: background }]}>
              <Icon name={state.tone === "error" ? "alert-circle-outline" : state.tone === "info" ? "information-circle-outline" : "checkmark-circle-outline"} size={20} color="#fff" />
              <Text style={styles.snackText}>{state.message}</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </FeedbackContext.Provider>
  );
}

/** Lightweight, non-blocking success / error feedback visible at any scroll depth. */
export function useAdminFeedback() {
  return useContext(FeedbackContext);
}

/* ───────────────────────── buttons ───────────────────────── */

/** 44×44 icon-only action (تعديل / عرض / المزيد). Always labelled for screen readers. */
export function IconAction({ icon, label, onPress, tone = "default", disabled = false, loading = false }: { icon: string; label: string; onPress: () => void; tone?: "default" | "danger"; disabled?: boolean; loading?: boolean }) {
  const { colors } = useTheme();
  const color = tone === "danger" ? colors.danger : colors.primary;
  return (
    <SoftPressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || loading, busy: loading }} hitSlop={4} disabled={disabled || loading} onPress={onPress}
      style={[styles.iconAction, { backgroundColor: tone === "danger" ? `${colors.danger}14` : `${colors.primary}10`, opacity: disabled ? 0.45 : 1 }]}>
      {loading ? <ActivityIndicator color={color} size="small" /> : <Icon name={icon} size={20} color={color} />}
    </SoftPressable>
  );
}

/** Compact labelled action for the screen header — stays visible at any scroll depth. */
export function HeaderAction({ label, icon = "add", onPress, accessibilityLabel }: { label: string; icon?: string; onPress: () => void; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  return (
    <SoftPressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} hitSlop={6} onPress={onPress}
      style={[styles.headerAction, { backgroundColor: colors.primary }]}>
      <Icon name={icon} size={18} color={colors.primaryText} />
      <Text style={[styles.headerActionText, { color: colors.primaryText }]}>{label}</Text>
    </SoftPressable>
  );
}

/* ───────────────────────── sheet ───────────────────────── */

/**
 * Bottom sheet (default) or full-screen modal (`fullScreen`) with a scrollable body
 * and a sticky footer that stays above the keyboard and the home indicator.
 * When `dirty`, closing asks before discarding; it never asks when nothing changed.
 */
export function AdminSheet({ visible, title, subtitle, onClose, dirty = false, busy = false, footer, children, fullScreen = false, onDismissed }: {
  visible: boolean; title: string; subtitle?: string; onClose: () => void; dirty?: boolean; busy?: boolean;
  /** A render function receives the guarded close, so «إلغاء» also asks before discarding. */
  footer?: ReactNode | ((requestClose: () => void) => ReactNode); children: ReactNode; fullScreen?: boolean; onDismissed?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useEffect(() => { if (!visible) setConfirmDiscard(false); }, [visible]);
  const iosDismiss = useDismissed(visible, onDismissed);
  const requestClose = () => {
    if (busy) return;
    if (dirty) { setConfirmDiscard(true); return; }
    onClose();
  };
  const panel = (
    <View style={[fullScreen ? styles.fullPanel : styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingTop: fullScreen ? insets.top : 0 }]}>
      {!fullScreen ? <View style={[styles.grabber, { backgroundColor: colors.border }]} /> : null}
      <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
          {subtitle ? <Text style={[styles.sheetSubtitle, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        <IconAction icon="close" label="إغلاق" onPress={requestClose} disabled={busy} />
      </View>
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={[styles.sheetFooter, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 12) }]}>{typeof footer === "function" ? footer(requestClose) : footer}</View> : <View style={{ height: Math.max(insets.bottom, 12) }} />}
      {confirmDiscard ? (
        <View style={[StyleSheet.absoluteFill, styles.discardBackdrop]}>
          <View style={[styles.discardCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>تجاهل التعديلات؟</Text>
            <Text style={[styles.confirmBody, { color: colors.muted }]}>لديك تغييرات لم تُحفظ في «{title}». إذا أغلقت الآن فلن تُحفظ.</Text>
            <View style={styles.footerRow}>
              <Button label="متابعة التعديل" variant="secondary" style={styles.flex} onPress={() => setConfirmDiscard(false)} />
              <Button label="تجاهل" variant="danger" style={styles.flex} onPress={() => { setConfirmDiscard(false); onClose(); }} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
  return (
    <Modal visible={visible} transparent={!fullScreen} animationType="slide" presentationStyle={fullScreen ? "fullScreen" : "overFullScreen"} statusBarTranslucent onRequestClose={requestClose} onDismiss={iosDismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.flex, !fullScreen && styles.backdrop]}>
        {!fullScreen ? <Pressable accessibilityLabel="إغلاق" style={StyleSheet.absoluteFill} onPress={requestClose} /> : null}
        {panel}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Primary + secondary footer pair used by every supervision form. */
export function SheetFooter({ primaryLabel, onPrimary, loading = false, disabled = false, secondaryLabel = "إلغاء", onSecondary, danger = false }: {
  primaryLabel: string; onPrimary: () => void; loading?: boolean; disabled?: boolean; secondaryLabel?: string; onSecondary: () => void; danger?: boolean;
}) {
  return (
    <View style={styles.footerRow}>
      <Button label={secondaryLabel} variant="secondary" style={styles.flex} disabled={loading} onPress={onSecondary} />
      <Button label={primaryLabel} variant={danger ? "danger" : "primary"} style={styles.flexWide} loading={loading} disabled={disabled} onPress={onPrimary} />
    </View>
  );
}

/* ───────────────────────── confirmation ───────────────────────── */

/**
 * Specific destructive confirmation: names the item and its impact.
 * The confirm button shows its own loading state and cannot be pressed twice.
 */
export function ConfirmAction({ visible, title, itemName, impact, confirmLabel, onConfirm, onCancel, loading = false, tone = "danger", onDismissed }: {
  visible: boolean; title: string; itemName?: string; impact?: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean; tone?: "danger" | "primary"; onDismissed?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const iosDismiss = useDismissed(visible, onDismissed);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!loading) onCancel(); }} onDismiss={iosDismiss}>
      <View style={[styles.flex, styles.backdrop]}>
        <Pressable accessibilityLabel="إلغاء" style={StyleSheet.absoluteFill} onPress={() => { if (!loading) onCancel(); }} />
        <View style={[styles.confirmSheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.confirmIcon, { backgroundColor: tone === "danger" ? `${colors.danger}16` : `${palette.gold}22` }]}>
            <Icon name={tone === "danger" ? "warning-outline" : "help-circle-outline"} size={28} color={tone === "danger" ? colors.danger : colors.primary} />
          </View>
          <Text accessibilityRole="header" style={[styles.confirmTitle, { color: colors.text }]}>{title}</Text>
          {itemName ? <Text style={[styles.confirmItem, { color: colors.primary }]}>«{itemName}»</Text> : null}
          {impact ? <Text style={[styles.confirmBody, { color: colors.muted }]}>{impact}</Text> : null}
          <View style={styles.footerRow}>
            <Button label="إلغاء" variant="secondary" style={styles.flex} disabled={loading} onPress={onCancel} />
            <Button label={confirmLabel} variant={tone === "danger" ? "danger" : "primary"} style={styles.flexWide} loading={loading} onPress={() => { if (!loading) onConfirm(); }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** State helper: holds the item awaiting confirmation. */
export function useConfirm<T>() {
  const [target, setTarget] = useState<T | null>(null);
  return { target, ask: setTarget, close: () => setTarget(null) };
}

/* ───────────────────────── action sheet ───────────────────────── */

export type SheetAction = { key: string; label: string; icon: string; onPress: () => void; danger?: boolean; disabled?: boolean; hint?: string };

export function MobileActionSheet({ visible, title, subtitle, actions, onClose }: { visible: boolean; title: string; subtitle?: string; actions: SheetAction[]; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // The chosen action usually opens another sheet, so it runs after this one is gone.
  const chosen = useRef<(() => void) | null>(null);
  const iosDismiss = useDismissed(visible, () => { const run = chosen.current; chosen.current = null; run?.(); });
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose} onDismiss={iosDismiss}>
      <View style={[styles.flex, styles.backdrop]}>
        <Pressable accessibilityLabel="إغلاق" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <View style={styles.actionHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
            {subtitle ? <Text style={[styles.sheetSubtitle, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text> : null}
          </View>
          {actions.map((action) => (
            <SoftPressable key={action.key} accessibilityRole="button" accessibilityLabel={action.label} disabled={action.disabled}
              onPress={() => { chosen.current = action.onPress; onClose(); }}
              style={[styles.actionRow, { borderTopColor: colors.border, opacity: action.disabled ? 0.45 : 1 }]}>
              <Icon name={action.icon} size={21} color={action.danger ? colors.danger : colors.primary} />
              <View style={styles.flex}>
                <Text style={[styles.actionLabel, { color: action.danger ? colors.danger : colors.text }]}>{action.label}</Text>
                {action.hint ? <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>{action.hint}</Text> : null}
              </View>
            </SoftPressable>
          ))}
          <View style={styles.actionCancel}><Button label="إلغاء" variant="secondary" onPress={onClose} /></View>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────────────── form fields ───────────────────────── */

export function FormField({ label, required = false, helper, error, children }: { label: string; required?: boolean; helper?: string; error?: string | null; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text>
      {children}
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.fieldError, { color: colors.danger }]}>{error}</Text> : helper ? <Text style={[styles.fieldHelper, { color: colors.muted }]}>{helper}</Text> : null}
    </View>
  );
}

export function FormInput({ label, value, onChangeText, placeholder, required, helper, error, multiline = false, keyboardType, ltr = false, secureTextEntry, editable = true, maxLength }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; required?: boolean; helper?: string; error?: string | null;
  multiline?: boolean; keyboardType?: KeyboardTypeOptions; ltr?: boolean; secureTextEntry?: boolean; editable?: boolean; maxLength?: number;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FormField label={label} required={required} helper={helper} error={error}>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} accessibilityLabel={label}
        multiline={multiline} keyboardType={keyboardType} secureTextEntry={secureTextEntry} editable={editable} maxLength={maxLength}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoCapitalize="none" autoCorrect={!ltr}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.inputMultiline, {
          color: colors.text, backgroundColor: colors.input, textAlign: ltr ? "left" : "right", writingDirection: ltr ? "ltr" : "rtl",
          borderColor: error ? colors.danger : focused ? palette.gold : colors.border, opacity: editable ? 1 : 0.6,
        }]} />
    </FormField>
  );
}

export type ChoiceOption = { value: string; label: string };

/** Single choice rendered as chips (≤ 8 options). Use AdminSelect for long lists. */
export function ChoiceChips({ label, options, value, onChange, required, helper }: { label: string; options: ChoiceOption[]; value: string; onChange: (value: string) => void; required?: boolean; helper?: string }) {
  return (
    <FormField label={label} required={required} helper={helper}>
      <ChipRow options={options} isSelected={(option) => option.value === value} onToggle={(option) => onChange(option.value)} />
    </FormField>
  );
}

/** Multi choice chips, e.g. linked levels. */
export function MultiChoiceChips({ label, options, values, onChange, helper }: { label: string; options: ChoiceOption[]; values: string[]; onChange: (values: string[]) => void; helper?: string }) {
  return (
    <FormField label={label} helper={helper}>
      <ChipRow options={options} isSelected={(option) => values.includes(option.value)}
        onToggle={(option) => onChange(values.includes(option.value) ? values.filter((value) => value !== option.value) : [...values, option.value])} multi />
    </FormField>
  );
}

function ChipRow({ options, isSelected, onToggle, multi = false }: { options: ChoiceOption[]; isSelected: (option: ChoiceOption) => boolean; onToggle: (option: ChoiceOption) => void; multi?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = isSelected(option);
        return (
          <Pressable key={option.value} accessibilityRole={multi ? "checkbox" : "radio"} accessibilityState={multi ? { checked: selected } : { selected }} onPress={() => onToggle(option)}
            style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.input }]}>
            <Text style={[styles.chipText, { color: selected ? colors.primaryText : colors.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchRow({ label, helper, value, onChange, disabled = false }: { label: string; helper?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)} style={[styles.switchRow, { borderColor: colors.border, backgroundColor: colors.input }]}>
      <View style={styles.flex}>
        <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 0 }]}>{label}</Text>
        {helper ? <Text style={[styles.fieldHelper, { color: colors.muted }]}>{helper}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
    </Pressable>
  );
}

/** Inline server/validation error inside a sheet (never raw technical text). */
export function FormError({ message }: { message?: string | null }) {
  const { colors } = useTheme();
  if (!message) return null;
  return <View accessibilityLiveRegion="polite" style={[styles.formError, { borderColor: `${colors.danger}55`, backgroundColor: `${colors.danger}10` }]}><Icon name="alert-circle-outline" size={18} color={colors.danger} /><Text style={[styles.formErrorText, { color: colors.danger }]}>{message}</Text></View>;
}

/* ───────────────────────── lists, search & filters ───────────────────────── */

/** Page toolbar: count + primary action, aligned RTL. */
export function AdminToolbar({ count, countLabel, actionLabel, onAction, actionIcon = "add-outline" }: { count?: number; countLabel?: string; actionLabel?: string; onAction?: () => void; actionIcon?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.toolbar}>
      {count != null ? <Text style={[styles.toolbarCount, { color: colors.muted }]}>{count} {countLabel ?? "عنصر"}</Text> : <View />}
      {actionLabel && onAction ? <Button label={actionLabel} icon={actionIcon} onPress={onAction} style={styles.toolbarAction} /> : null}
    </View>
  );
}

export function AdminSearchBar({ value, onChange, placeholder = "بحث…", filterCount = 0, onOpenFilters }: { value: string; onChange: (value: string) => void; placeholder?: string; filterCount?: number; onOpenFilters?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.searchRow}>
      <View style={[styles.searchBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Icon name="search-outline" size={18} color={colors.muted} />
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} accessibilityLabel={placeholder} returnKeyType="search"
          style={[styles.searchInput, { color: colors.text }]} />
        {value ? <Pressable accessibilityLabel="مسح البحث" hitSlop={10} onPress={() => onChange("")}><Icon name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
      </View>
      {onOpenFilters ? (
        <SoftPressable accessibilityRole="button" accessibilityLabel={filterCount ? `الفلاتر، ${filterCount} مفعّلة` : "الفلاتر"} onPress={onOpenFilters}
          style={[styles.filterButton, { backgroundColor: filterCount ? colors.primary : colors.input, borderColor: filterCount ? colors.primary : colors.border }]}>
          <Icon name="options-outline" size={20} color={filterCount ? colors.primaryText : colors.primary} />
          {filterCount ? <View style={[styles.filterBadge, { backgroundColor: palette.gold }]}><Text style={styles.filterBadgeText}>{filterCount}</Text></View> : null}
        </SoftPressable>
      ) : null}
    </View>
  );
}

export type FilterGroup = { key: string; label: string; options: ChoiceOption[] };

/** Bottom-sheet filters. Every group includes an implicit «الكل» option (value ""). */
export function FilterSheet({ visible, onClose, groups, values, onChange, resultCount }: {
  visible: boolean; onClose: () => void; groups: FilterGroup[]; values: Record<string, string>; onChange: (values: Record<string, string>) => void; resultCount?: number;
}) {
  const active = Object.values(values).filter(Boolean).length;
  return (
    <AdminSheet visible={visible} title="تصفية النتائج" subtitle={active ? `${active} فلتر مفعّل` : undefined} onClose={onClose}
      footer={<SheetFooter secondaryLabel="مسح الفلاتر" onSecondary={() => onChange(Object.fromEntries(groups.map((group) => [group.key, ""])))} primaryLabel={resultCount != null ? `عرض ${resultCount} نتيجة` : "عرض النتائج"} onPrimary={onClose} />}>
      {groups.map((group) => (
        <ChoiceChips key={group.key} label={group.label} options={[{ value: "", label: "الكل" }, ...group.options]} value={values[group.key] ?? ""} onChange={(value) => onChange({ ...values, [group.key]: value })} />
      ))}
    </AdminSheet>
  );
}

/** Active filter summary with a one-tap «مسح الفلاتر». */
export function ActiveFilters({ count, onClear }: { count: number; onClear: () => void }) {
  const { colors } = useTheme();
  if (!count) return null;
  return (
    <View style={styles.activeFilters}>
      <Text style={[styles.toolbarCount, { color: colors.muted }]}>{count} فلتر مفعّل</Text>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onClear}><Text style={[styles.clearText, { color: colors.primary }]}>مسح الفلاتر</Text></Pressable>
    </View>
  );
}

/** Structured mobile list row: primary data, secondary metadata, then actions. */
export function AdminRow({ title, subtitle, badges, leadingIcon, muted = false, onPress, actions }: {
  title: string; subtitle?: string; badges?: ReactNode; leadingIcon?: string; muted?: boolean; onPress?: () => void; actions?: ReactNode;
}) {
  const { colors } = useTheme();
  const body = (
    <View style={styles.rowInner}>
      {leadingIcon ? <View style={[styles.rowIcon, { backgroundColor: `${palette.gold}22` }]}><Icon name={leadingIcon} size={21} color={colors.primary} /></View> : null}
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text> : null}
        {badges ? <View style={styles.rowBadges}>{badges}</View> : null}
      </View>
      {actions ? <View style={styles.rowActions}>{actions}</View> : null}
    </View>
  );
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: muted ? 0.7 : 1 }]}>
      {onPress ? <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>{body}</Pressable> : body}
    </View>
  );
}

/** Static skeleton rows for list loading (no spinner wall). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const items = useMemo(() => Array.from({ length: rows }, (_, index) => index), [rows]);
  return (
    <View accessibilityLabel="جارٍ التحميل" accessibilityRole="progressbar">
      {items.map((index) => (
        <Animated.View key={index} style={[styles.row, styles.skeletonRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pulse }]}>
          <View style={[styles.rowIcon, { backgroundColor: colors.input }]} />
          <View style={styles.flex}>
            <View style={[styles.skeletonLine, { backgroundColor: colors.input, width: "70%" }]} />
            <View style={[styles.skeletonLine, { backgroundColor: colors.input, width: "45%", marginTop: 8 }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexWide: { flex: 1.6 },
  backdrop: { justifyContent: "flex-end", backgroundColor: "#00000066" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderBottomWidth: 0, overflow: "hidden" },
  fullPanel: { flex: 1 },
  grabber: { alignSelf: "center", width: 42, height: 5, borderRadius: 3, marginTop: 8 },
  sheetHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle: { fontFamily: FONT.bold, fontSize: 18, lineHeight: 28, textAlign: "right" },
  sheetSubtitle: { fontFamily: FONT.regular, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 2 },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetBody: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20, gap: 4 },
  sheetFooter: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerRow: { flexDirection: "row-reverse", gap: 10, marginTop: 4 },
  discardBackdrop: { justifyContent: "center", padding: 22, backgroundColor: "#00000055" },
  discardCard: { borderRadius: 22, borderWidth: 1, padding: 18, gap: 10 },
  confirmSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingTop: 22, gap: 10, alignItems: "stretch" },
  confirmIcon: { alignSelf: "center", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontFamily: FONT.bold, fontSize: 18, lineHeight: 28, textAlign: "center" },
  confirmItem: { fontFamily: FONT.bold, fontSize: 15, lineHeight: 25, textAlign: "center" },
  confirmBody: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 22, textAlign: "center", marginBottom: 6 },
  iconAction: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerAction: { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", gap: 4, borderRadius: 14, paddingHorizontal: 12 },
  headerActionText: { fontFamily: FONT.bold, fontSize: 13 },
  actionHeader: { paddingHorizontal: 18, paddingVertical: 12 },
  actionRow: { minHeight: 56, flexDirection: "row-reverse", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  actionLabel: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 24, textAlign: "right" },
  actionCancel: { paddingHorizontal: 18, paddingTop: 10 },
  field: { marginBottom: 12 },
  fieldLabel: { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 21, textAlign: "right", marginBottom: 6 },
  fieldHelper: { fontFamily: FONT.regular, fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 5 },
  fieldError: { fontFamily: FONT.semibold, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 5 },
  input: { minHeight: 50, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontFamily: FONT.regular, fontSize: 14, lineHeight: 22 },
  inputMultiline: { minHeight: 104 },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center" },
  chipText: { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 21 },
  switchRow: { minHeight: 56, flexDirection: "row-reverse", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12 },
  formError: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  formErrorText: { flex: 1, fontFamily: FONT.semibold, fontSize: 13, lineHeight: 21, textAlign: "right" },
  toolbar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  toolbarCount: { fontFamily: FONT.medium, fontSize: 12, textAlign: "right" },
  toolbarAction: { minWidth: 140 },
  searchRow: { flexDirection: "row-reverse", gap: 8, marginBottom: 10 },
  searchBox: { flex: 1, minHeight: 48, flexDirection: "row-reverse", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 14, textAlign: "right", paddingVertical: 10 },
  filterButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  filterBadge: { position: "absolute", top: -5, left: -5, minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  filterBadgeText: { fontFamily: FONT.bold, fontSize: 11, color: "#2B0D12" },
  activeFilters: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  clearText: { fontFamily: FONT.bold, fontSize: 13 },
  row: { borderWidth: 1, borderRadius: 18, marginBottom: 10, overflow: "hidden" },
  rowInner: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14 },
  rowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: FONT.bold, fontSize: 15, lineHeight: 24, textAlign: "right" },
  rowSubtitle: { fontFamily: FONT.regular, fontSize: 12, lineHeight: 19, textAlign: "right", marginTop: 2 },
  rowBadges: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 6 },
  rowActions: { flexDirection: "row-reverse", gap: 6 },
  skeletonRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 14 },
  skeletonLine: { height: 12, borderRadius: 6 },
  snackWrap: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  snack: { maxWidth: 520, width: "100%", flexDirection: "row-reverse", alignItems: "center", gap: 10, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  snackText: { flex: 1, color: "#fff", fontFamily: FONT.semibold, fontSize: 13, lineHeight: 21, textAlign: "right" },
});
