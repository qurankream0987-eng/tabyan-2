import { afterAll, beforeAll, expect, it, vi } from "vitest";
import * as React from "react";

const hooks = vi.hoisted(() => ({ values: [] as boolean[] }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: () => [hooks.values.shift(), vi.fn()],
  useEffect: vi.fn(),
}));
vi.mock("react-router", () => ({ useNavigate: () => vi.fn(), NavLink: "a" }));
vi.mock("@/lib/auth", () => ({ authStore: {} }));
vi.mock("@/lib/api", () => ({ api: {} }));
vi.mock("@/lib/web-session", () => ({ logoutWebSession: vi.fn() }));
vi.mock("./AdminGateModal", () => ({ default: "admin-dialog" }));
vi.mock("./TeacherRegisterFlow", () => ({ default: "teacher-dialog" }));
vi.mock("./CircularUserCard", () => ({ InitialsAvatar: "avatar" }));
vi.mock("./Icon", () => ({ default: "icon" }));
import StudentDrawer from "./StudentDrawer";

// The existing focused runner uses classic JSX; production Vite uses the React plugin.
beforeAll(() => vi.stubGlobal("React", React));
afterAll(() => vi.unstubAllGlobals());

it.each([
  [false, true],
  [true, false],
])("closing the drawer preserves independently open role dialogs (%s, %s)", (admin, teacher) => {
  hooks.values = [admin, teacher, false];
  const tree = StudentDrawer({ open: false, onClose: vi.fn() });
  const children = tree.props.children;
  expect(children[0]).toBe(false);
  expect(children[1].props.open).toBe(admin);
  expect(children[2].props.open).toBe(teacher);
});
