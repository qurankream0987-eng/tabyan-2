import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import Icon, { type IconName } from "./Icon";
import productRegistry from "../../../../../lib/tabyan-domain/product-registry.json";

const TABS: { to: string; feature: keyof typeof productRegistry.features; icon: IconName }[] = [
  { to: "/student/home",        feature: "home",       icon: "home" },
  { to: "/student/schedule",    feature: "schedule",   icon: "calendar" },
  { to: "/student/recordings",  feature: "recordings", icon: "video" },
  { to: "/student/library",     feature: "library",    icon: "library" },
  { to: "/student/fatwa",       feature: "fatwa",      icon: "scale" },
  { to: "/student/mushaf-fahd", feature: "mushaf",     icon: "quran" },
  { to: "/student/account",     feature: "account",    icon: "user" },
];

export default function StudentBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="student-bottom-nav fixed bottom-0 inset-x-0 z-40 pointer-events-none"
      style={{
        background: "linear-gradient(to top, var(--background) 55%, color-mix(in srgb, var(--background) 92%, transparent) 78%, transparent 100%)",
      }}
    >
      {/* Pill container */}
      <div className="max-w-lg mx-auto pb-2 sm:pb-3 px-2.5 sm:px-3 pointer-events-auto">
        <div className="glass rounded-[2rem] px-1.5 sm:px-2 py-1 sm:py-1.5 flex items-center justify-start gap-0.5 overflow-x-auto shadow-card border border-[rgba(128,0,32,0.12)] dark:border-[rgba(212,175,55,0.15)] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.to) || (t.to === "/student/home" && pathname === "/student")
              || (t.to === "/student/mushaf-fahd" && (pathname.startsWith("/student/prayer-times") || pathname.startsWith("/student/qibla")));
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-[1.5rem] transition-all duration-300 min-w-[62px] shrink-0",
                  active
                    ? "text-burgundy dark:text-gold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Active background pill — خمري شفاف نهاراً / ذهبي مصمت ليلاً */}
                {active && (
                  <span className="absolute inset-0 rounded-[1.5rem] bg-burgundy/10 dark:bg-gold/12" />
                )}

                {/* Icon wrapper */}
                <span className={cn(
                  "relative transition-all duration-300",
                  active ? "-translate-y-0.5 scale-115" : "scale-100"
                )}>
                  <Icon name={t.icon} size={24} className={cn(
                    "transition-colors duration-200",
                    active ? "text-burgundy dark:text-gold" : "text-muted-foreground"
                  )} />
                  {/* Active dot under icon */}
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-5 rounded-full bg-gold dark:bg-gold" />
                  )}
                </span>

                {/* Label — always visible */}
                <span className={cn(
                  "font-readex text-[9.5px] leading-none transition-all duration-200 mt-1",
                  active
                    ? "text-burgundy dark:text-gold font-bold opacity-100"
                    : "text-muted-foreground/70 font-medium opacity-80"
                )}>
                   {productRegistry.features[t.feature].label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
