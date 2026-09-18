import { useState } from "react";
import Modal from "./Modal";
import PrimaryButton from "./PrimaryButton";
import Icon from "./Icon";
import { api } from "@/lib/api";
import { authStore } from "@/lib/auth";
import { useNavigate } from "react-router";
import { useToast } from "@/hooks/useToast";

const inputCls =
  "w-full rounded-xl border-2 border-input bg-white dark:bg-night-surface px-4 py-3 font-readex outline-none focus:border-burgundy dark:focus:border-gold transition";

export default function AdminGateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const enter = (token: string, name?: string) => {
    authStore.set(token, "admin", name);
    toast("مرحباً بك في لوحة الإشراف", "success");
    onClose();
    navigate("/admin");
  };

  /** دخول حساب الإشراف باسم المستخدم وكلمة السر المخزنين كـ bcrypt hash */
  const submitAccount = async () => {
    setError("");
    if (!username.trim()) return setError("أدخل اسم المستخدم");
    if (!password) return setError("أدخل كلمة السر");
    setLoading(true);
    const res = await api.passwordLogin(username.trim(), password);
    setLoading(false);
    if (!res.ok) return setError(("message" in res ? res.message : undefined) ?? "بيانات غير صحيحة");
    if (res.role !== "admin") return setError("هذا الحساب ليس حساب مشرف");
    enter(res.token!, res.name);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center mb-5">
        {/* الشعار يتبع الثيم: خمري في الوضع الفاتح، ذهبي في الداكن — نفس نمط بقية شعارات التطبيق */}
        <img src="/logo.png" alt="تبيان" className="h-14 mx-auto rounded-md mb-2 logo-light dark:hidden" />
        <img src="/logo.png" alt="تبيان" className="h-14 mx-auto rounded-md mb-2 hidden dark:block logo-dark" />
        <h2 className="font-amiri text-2xl text-burgundy flex items-center justify-center gap-2"><Icon name="shield" size={22} />بوابة الإشراف</h2>
        <p className="text-sm text-muted-foreground font-readex mt-1">
          أدخل اسم المستخدم وكلمة السر للوصول إلى لوحة الإشراف
        </p>
      </div>

      <div className="space-y-3">
        <input dir="auto" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} placeholder="اسم المستخدم"
          autoComplete="username" className={inputCls} />
        <input dir="ltr" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submitAccount()} placeholder="كلمة السر"
          autoComplete="current-password" className={inputCls} />
        {error && <p className="text-destructive text-sm font-readex font-bold text-center">{error}</p>}
        <PrimaryButton onClick={submitAccount} disabled={loading} className="w-full">{loading ? "جارٍ التحقق..." : "دخول"}</PrimaryButton>
      </div>
    </Modal>
  );
}
