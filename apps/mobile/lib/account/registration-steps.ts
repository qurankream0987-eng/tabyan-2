export type StudentRegistrationStep = "name" | "birthdate" | "phone" | "school" | "level" | "grade" | "password" | "email";
export type TeacherRegistrationStep = "name" | "phone" | "password";

/** Same order as the web StudentRegisterFlow `baseFlow`: school stage and grade only for pupils. */
export function studentRegistrationFlow(inSchool: boolean | null): StudentRegistrationStep[] {
  const base: StudentRegistrationStep[] = ["name", "birthdate", "phone", "school"];
  return inSchool ? [...base, "level", "grade", "password", "email"] : [...base, "password", "email"];
}

export const TEACHER_REGISTRATION_FLOW: TeacherRegistrationStep[] = ["name", "phone", "password"];

/** «الخطوة X من Y» and the bar width, from the step's place in the flow (web: index / total). */
export function registrationProgress<Step extends string>(flow: readonly Step[], step: Step) {
  const index = Math.max(0, flow.indexOf(step));
  return { number: index + 1, total: flow.length, percent: Math.round((index / flow.length) * 100) };
}
