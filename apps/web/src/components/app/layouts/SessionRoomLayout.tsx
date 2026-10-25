import { Outlet } from "react-router";
import AuthGate from "../AuthGate";

export default function SessionRoomLayout() {
  return (
    <AuthGate><div className="min-h-screen bg-night text-foreground flex flex-col" dir="rtl">
      <Outlet />
    </div></AuthGate>
  );
}
