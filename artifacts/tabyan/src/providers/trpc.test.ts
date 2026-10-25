import { afterEach, describe, expect, it } from "vitest";
import { getMutationKey, getQueryKey } from "@trpc/react-query";
import { clearUserScopedQueryCache, queryClient, trpc } from "./trpc";

describe("identity-bound query state", () => {
  afterEach(() => queryClient.clear());

  it("removes private query and mutation results but retains public catalogs", async () => {
    const progressKey = getQueryKey(trpc.student.progress);
    const teachersKey = getQueryKey(trpc.student.teachers);
    const publicFatwasKey = getQueryKey(trpc.fatwa.publicList);
    const recitationHistoryKey = getQueryKey(trpc.recitation.myHistory, { limit: 50 });
    const recitationStatusKey = getQueryKey(trpc.recitation.status);
    queryClient.setQueryData(progressKey, { completed: 3 });
    queryClient.setQueryData(teachersKey, [{ id: "public-teacher" }]);
    queryClient.setQueryData(publicFatwasKey, [{ id: "public-fatwa" }]);
    queryClient.setQueryData(recitationHistoryKey, [{ id: "account-a-session" }]);
    queryClient.setQueryData(recitationStatusKey, { enabled: true });
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationKey: getMutationKey(trpc.student.submitPlacement),
      mutationFn: async (variables: unknown) => variables,
    });
    await mutation.execute({ videoProof: "account-a-only" });

    clearUserScopedQueryCache();

    expect(queryClient.getQueryData(progressKey)).toBeUndefined();
    expect(queryClient.getQueryData(teachersKey)).toEqual([{ id: "public-teacher" }]);
    expect(queryClient.getQueryData(publicFatwasKey)).toEqual([{ id: "public-fatwa" }]);
    expect(queryClient.getQueryData(recitationHistoryKey)).toBeUndefined();
    expect(queryClient.getQueryData(recitationStatusKey)).toEqual({ enabled: true });
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });
});
