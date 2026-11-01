import { Redirect } from "expo-router";

// The tab bar intercepts this tab and opens the reader; a deep link lands here
// only if something bypasses that, so send it on.
export default function MushafTab() {
  return <Redirect href="/student/mushaf" />;
}
