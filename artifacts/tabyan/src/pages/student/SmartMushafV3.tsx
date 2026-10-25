import { useLayoutEffect } from "react";
import SmartMushafApp from "../../../smart-mushaf-v3/src/App";

export default function SmartMushafV3() {
  useLayoutEffect(() => {
    const originalBodyClass = document.body.className;
    const originalDarkMode = document.documentElement.classList.contains("dark");
    const originalTitle = document.title;

    document.title = "المصحف الذكي — تبيان";

    return () => {
      document.body.className = originalBodyClass;
      document.documentElement.classList.toggle("dark", originalDarkMode);
      document.title = originalTitle;
    };
  }, []);

  return (
    <div className="smart-mushaf-v3-root" dir="rtl" data-testid="smart-mushaf-v3-route">
      <SmartMushafApp />
    </div>
  );
}
