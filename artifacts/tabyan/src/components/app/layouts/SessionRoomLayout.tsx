import { Outlet } from "react-router";

export default function SessionRoomLayout() {
  return (
    <div className="min-h-screen bg-night text-foreground flex flex-col" dir="rtl">
      <Outlet />
    </div>
  );
}
