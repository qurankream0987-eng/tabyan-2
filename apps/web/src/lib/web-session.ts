import { api } from "./api";
import { authStore } from "./auth";

export async function logoutWebSession() {
  try {
    await api.logout();
  } finally {
    authStore.clear();
  }
}