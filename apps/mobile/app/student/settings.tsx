import { Redirect, useLocalSearchParams } from "expo-router";

/** الإعدادات أصبحت جزءاً من صفحة «حسابي» (كما على الموقع)؛ يبقى ?focus=delete يعمل. */
export default function Settings() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  return <Redirect href={(focus === "delete" ? "/student/account?focus=delete" : "/student/account") as never} />;
}
