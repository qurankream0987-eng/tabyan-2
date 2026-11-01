/**
 * Student routes a visitor may open without an account. The mushaf is a public
 * reading page, like the web's /student/mushaf-fahd on the guest landing page;
 * everything it links onward to (recitation, bookings) still needs a login.
 */
const GUEST_STUDENT_ROUTES = new Set(["/student/mushaf"]);

export function isGuestStudentRoute(pathname: string) {
  return GUEST_STUDENT_ROUTES.has(pathname.replace(/\/+$/, ""));
}
