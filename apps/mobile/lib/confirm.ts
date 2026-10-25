import { Alert, Platform } from "react-native";

export function confirmAr(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    const browser = globalThis as typeof globalThis & { confirm?: (text: string) => boolean };
    return Promise.resolve(browser.confirm?.(`${title}\n\n${message}`) ?? false);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "إلغاء", style: "cancel", onPress: () => resolve(false) },
      { text: "تأكيد", style: "destructive", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}