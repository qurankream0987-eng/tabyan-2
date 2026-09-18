import { useState } from "react";
import Modal from "./Modal";
import PrimaryButton from "./PrimaryButton";
import { authStore } from "@/lib/auth";
import { useNavigate } from "react-router";
import { useToast } from "@/hooks/useToast";

export default function StudentAuthModal({ open, onClose, defaultRole = "student" }: {
  open: boolean; onClose: () => void; defaultRole?: "student" | "teacher";
}) {
  const [fullName, setFullName] = useState("");
  const [error, setError]       = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const enter = () => {
    if (fullName.trim().length < 2) return setError("أدخل اسمك أولاً");
    // Dev bypass: encode name in token so backend context can read it
    // shape: dev-<role>-<base64name>-<ts>
    const b64 = btoa(encodeURIComponent(fullName.trim()));
    authStore.set(`dev-${defaultRole}-${b64}-${Date.now()}`, defaultRole, fullName.trim());
    toast(`أهلاً ${fullName.trim()}`, "success");
    onClose();
    if (defaultRole === "teacher") navigate("/teacher");
    else navigate("/student/home");
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="text-center mb-6">
        <img src="/logo.png" alt="تبيان" className="h-14 mx-auto mb-3 logo-light dark:hidden" />
        <img src="/logo.png" alt="تبيان" className="h-14 mx-auto mb-3 hidden dark:block logo-dark" />
        <h2 className="font-amiri text-2xl text-burgundy">ادخل اسمك</h2>
        <p className="text-sm text-muted-foreground font-cairo mt-1">بدون رقم هاتف — للمعاينة فقط</p>
      </div>

      <div className="space-y-4">
        <input
          autoFocus
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && enter()}
          placeholder="مثال: أحمد محمد"
          className="w-full rounded-xl border-2 border-input bg-white dark:bg-card px-4 py-3 font-cairo text-lg outline-none focus:border-burgundy dark:focus:border-gold transition text-center"
        />
        {error && <p className="text-destructive text-sm font-cairo text-center">{error}</p>}
        <PrimaryButton onClick={enter} className="w-full btn-press text-lg py-3">
          دخول ←
        </PrimaryButton>
      </div>
    </Modal>
  );
}
