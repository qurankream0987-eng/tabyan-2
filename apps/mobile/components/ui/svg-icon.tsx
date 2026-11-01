// Line icons shared with the web app (apps/web/src/components/app/Icon.tsx), drawn with react-native-svg.
import type { ReactNode } from "react";
import Svg, { Circle, Path, Polygon, Rect } from "react-native-svg";

export type IconName = "home" | "quran" | "books" | "scale" | "user" | "users" | "menu" | "bell" | "moon" | "sun"
  | "mic" | "mic-off" | "video" | "video-off" | "calendar" | "chart" | "settings" | "help" | "logout"
  | "shield" | "arrow-left" | "arrow-right" | "play" | "check" | "check-circle" | "x" | "x-circle" | "clock" | "timer" | "hourglass"
  | "search" | "bookmark" | "download" | "upload" | "certificate" | "graduation" | "library" | "heart" | "star" | "plus"
  | "phone" | "edit" | "camera" | "photo" | "map-pin"
  | "mail" | "alert-triangle" | "ban" | "trash" | "pause" | "stop" | "send" | "flame" | "mosque" | "lock" | "globe"
  | "refresh" | "file-text" | "id-card" | "trending-up" | "headphones" | "link" | "clipboard" | "eye-off" | "pin" | "filter"
  | "maximize" | "check-square" | "external-link" | "info" | "archive" | "archive-restore" | "wifi-off"
  | "eye" | "fingerprint" | "minus" | "chevron-left" | "chevron-right";

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V21h14V9.5" />
    </>
  ),
  pin: (
    <>
      <Path d="M12 17v5" />
      <Path d="M9 10.74L9.6 15c.16.85-2.2 1.34-4.22 1.1A2.5 2.5 0 0 1 4 14v-2c0-.75.4-1.4 1-1.8" />
      <Path d="m15 10.74-.6 4.26c-.16.85 2.2 1.34 4.22 1.1A2.5 2.5 0 0 0 20 14v-2c0-.75-.4-1.4-1-1.8" />
      <Path d="M7 4h10" />
      <Path d="M12 4v6" />
    </>
  ),
  filter: (
    <>
      <Polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </>
  ),
  quran: (
    <>
      <Path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" />
      <Path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" />
    </>
  ),
  books: (
    <>
      <Path d="M4 4h8v16H4z" />
      <Path d="M8 4v16" />
      <Path d="m13.2 5.4 3.8-.8 3 14.8-3.8.8z" />
    </>
  ),
  scale: (
    <>
      <Path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <Path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <Path d="M7 21h10" />
      <Path d="M12 3v18" />
      <Path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
  ),
  user: (
    <>
      <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </>
  ),
  users: (
    <>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  menu: (
    <>
      <Path d="M4 6h16" />
      <Path d="M4 12h16" />
      <Path d="M4 18h16" />
    </>
  ),
  bell: (
    <>
      <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  moon: <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2" />
      <Path d="M12 20v2" />
      <Path d="m4.93 4.93 1.41 1.41" />
      <Path d="m17.66 17.66 1.41 1.41" />
      <Path d="M2 12h2" />
      <Path d="M20 12h2" />
      <Path d="m6.34 17.66-1.41 1.41" />
      <Path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  mic: (
    <>
      <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <Path d="M12 19v3" />
    </>
  ),
  "mic-off": (
    <>
      <Path d="m2 2 20 20" />
      <Path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <Path d="M5 10v2a7 7 0 0 0 12 5" />
      <Path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <Path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <Path d="M12 19v3" />
    </>
  ),
  video: (
    <>
      <Path d="m22 8-6 4 6 4V8Z" />
      <Rect x="2" y="6" width="14" height="12" rx="2" />
    </>
  ),
  "video-off": (
    <>
      <Path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
      <Path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z" />
      <Path d="m2 2 20 20" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3" y="4" width="18" height="18" rx="2" />
      <Path d="M16 2v4" />
      <Path d="M8 2v4" />
      <Path d="M3 10h18" />
    </>
  ),
  chart: (
    <>
      <Path d="M3 3v18h18" />
      <Path d="M18 17V9" />
      <Path d="M13 17V5" />
      <Path d="M8 17v-3" />
    </>
  ),
  settings: (
    <>
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15-.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-1-1.74l-.15-.09a2 2 0 0 0-.73-2.73l-.22-.38a2 2 0 0 0 .73-2.73l.15-.1a2 2 0 0 1 1-1.72z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  help: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <Path d="M12 17h.01" />
    </>
  ),
  logout: (
    <>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="m16 17 5-5-5-5" />
      <Path d="M21 12H9" />
    </>
  ),
  shield: (
    <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  ),
  "arrow-left": (
    <>
      <Path d="M19 12H5" />
      <Path d="m12 19-7-7 7-7" />
    </>
  ),
  play: <Path d="M6 3l14 9-14 9V3z" />,
  check: <Path d="M20 6 9 17l-5-5" />,
  "check-circle": (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="m9 12 2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v6l4 2" />
    </>
  ),
  timer: (
    <>
      <Path d="M10 2h4" />
      <Path d="M12 14v-4" />
      <Circle cx="12" cy="14" r="8" />
    </>
  ),
  hourglass: (
    <>
      <Path d="M5 22h14" />
      <Path d="M5 2h14" />
      <Path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <Path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="8" />
      <Path d="m21 21-4.3-4.3" />
    </>
  ),
  bookmark: <Path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />,
  download: (
    <>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Path d="m7 10 5 5 5-5" />
      <Path d="M12 15V3" />
    </>
  ),
  upload: (
    <>
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Path d="m17 8-5-5-5 5" />
      <Path d="M12 3v12" />
    </>
  ),
  x: (
    <>
      <Path d="M18 6 6 18" />
      <Path d="m6 6 12 12" />
    </>
  ),
  "x-circle": (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="m15 9-6 6" />
      <Path d="m9 9 6 6" />
    </>
  ),
  certificate: (
    <>
      <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <Path d="M14 3v6h6" />
      <Path d="M8 8h3" />
      <Circle cx="14.5" cy="15" r="2.5" />
      <Path d="m13 17-1 3.8 2.5-1.5 2.5 1.5-1-3.8" />
    </>
  ),
  graduation: (
    <>
      <Path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <Path d="M22 10v6" />
      <Path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </>
  ),
  library: (
    <>
      <Path d="m16 6 4 14" />
      <Path d="M12 6v14" />
      <Path d="M8 8v12" />
      <Path d="M4 4v16" />
    </>
  ),
  heart: (
    <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  ),
  // الشكل جوهرة هندسية (بلا نجوم في الهوية البصرية) — لعلامات التقييم والإنجاز
  star: (
    <>
      <Path d="M6 3h12l4 6-10 13L2 9Z" />
      <Path d="M11 3 8 9l4 13 4-13-3-6" />
      <Path d="M2 9h20" />
    </>
  ),
  plus: (
    <>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </>
  ),
  minus: (
    <Path d="M5 12h14" />
  ),
  "chevron-left": (
    <Path d="m15 18-6-6 6-6" />
  ),
  "chevron-right": (
    <Path d="m9 18 6-6-6-6" />
  ),
  phone: (
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  edit: (
    <>
      <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <Path d="m15 5 4 4" />
    </>
  ),
  "arrow-right": (
    <>
      <Path d="M5 12h14" />
      <Path d="m12 5 7 7-7 7" />
    </>
  ),
  camera: (
    <>
      <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <Circle cx="12" cy="13" r="3" />
    </>
  ),
  photo: (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Circle cx="8.5" cy="8.5" r="1.5" />
      <Path d="m21 15-5-5L5 21" />
    </>
  ),
  "map-pin": (
    <>
      <Path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <Circle cx="12" cy="10" r="3" />
    </>
  ),
  mail: (
    <>
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="m22 7-10 6L2 7" />
    </>
  ),
  "alert-triangle": (
    <>
      <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <Path d="M12 9v4" />
      <Path d="M12 17h.01" />
    </>
  ),
  ban: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="m4.9 4.9 14.2 14.2" />
    </>
  ),
  trash: (
    <>
      <Path d="M3 6h18" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Path d="M10 11v6" />
      <Path d="M14 11v6" />
    </>
  ),
  pause: (
    <>
      <Rect x="6" y="4" width="4" height="16" rx="1" />
      <Rect x="14" y="4" width="4" height="16" rx="1" />
    </>
  ),
  stop: <Rect x="5" y="5" width="14" height="14" rx="2" />,
  send: (
    <>
      <Path d="m22 2-7 20-4-9-9-4Z" />
      <Path d="M22 2 11 13" />
    </>
  ),
  flame: (
    <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  ),
  mosque: (
    <>
      <Path d="M2 22h20" />
      <Path d="M5 22v-6h14v6" />
      <Path d="M5 16c0-3.8 3.2-6.4 7-9 3.8 2.6 7 5.2 7 9" />
      <Path d="M12 3.5V7" />
      <Path d="M10 22v-2.5a2 2 0 0 1 4 0V22" />
    </>
  ),
  lock: (
    <>
      <Rect x="3" y="11" width="18" height="11" rx="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  globe: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M2 12h20" />
      <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  refresh: (
    <>
      <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <Path d="M21 3v5h-5" />
      <Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <Path d="M8 16H3v5" />
    </>
  ),
  "file-text": (
    <>
      <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <Path d="M14 3v6h6" />
      <Path d="M9 13h6" />
      <Path d="M9 17h6" />
    </>
  ),
  "id-card": (
    <>
      <Rect x="2" y="5" width="20" height="14" rx="2" />
      <Circle cx="8" cy="11" r="2" />
      <Path d="M5.5 17c.4-1.4 1.3-2 2.5-2s2.1.6 2.5 2" />
      <Path d="M15 10h4" />
      <Path d="M15 14h4" />
    </>
  ),
  "trending-up": (
    <>
      <Path d="m22 7-8.5 8.5-5-5L2 17" />
      <Path d="M16 7h6v6" />
    </>
  ),
  headphones: (
    <Path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 0 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  ),
  link: (
    <>
      <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  clipboard: (
    <>
      <Rect x="8" y="2" width="8" height="4" rx="1" />
      <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </>
  ),
  "eye-off": (
    <>
      <Path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <Path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <Path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <Path d="m2 2 20 20" />
    </>
  ),
  eye: (
    <>
      <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  fingerprint: (
    <>
      <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <Path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <Path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <Path d="M2 12a10 10 0 0 1 18-6" />
      <Path d="M2 16h.01" />
      <Path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <Path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <Path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <Path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
    </>
  ),
  archive: (
    <>
      <Rect x="2" y="3" width="20" height="5" rx="1" />
      <Path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <Path d="M10 12h4" />
    </>
  ),
  "archive-restore": (
    <>
      <Rect x="2" y="3" width="20" height="5" rx="1" />
      <Path d="M4 8v11a2 2 0 0 0 2 2h2" />
      <Path d="M20 8v3" />
      <Path d="m9 15 3-3 3 3" />
      <Path d="M12 12v9" />
    </>
  ),
  maximize: (
    <>
      <Path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <Path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <Path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <Path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </>
  ),
  "check-square": (
    <>
      <Path d="m9 11 3 3L22 4" />
      <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>
  ),
  "external-link": (
    <>
      <Path d="M15 3h6v6" />
      <Path d="M10 14 21 3" />
      <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  info: (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 16v-4" />
      <Path d="M12 8h.01" />
    </>
  ),
  "wifi-off": (
    <>
      <Path d="M12 20h.01" />
      <Path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <Path d="M5 12.9A10 10 0 0 1 15.8 10" />
      <Path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
      <Path d="M19 12a10 10 0 0 0-3.87-2.94" />
      <Path d="M22 16.2a15 15 0 0 0-5.61-4.54" />
      <Path d="m2 2 20 20" />
    </>
  ),
};

export function isSvgIconName(name: string): name is IconName {
  return name in PATHS;
}

export function SvgIcon({ name, size = 20, color = "#800020", strokeWidth = 1.8 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]}
    </Svg>
  );
}
