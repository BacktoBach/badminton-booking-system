import type { APIRequestContext, TestInfo } from "@playwright/test";
import { seededAdmin } from "./test-data";

type AdminClassListResponse = {
  data?: Array<{ id?: string; title?: string }>;
};

const recordCleanupFailure = (testInfo: TestInfo, message: string): void => {
  testInfo.annotations.push({ type: "cleanup", description: message });
};

export const deleteAdminClassByTitle = async (
  api: APIRequestContext,
  title: string,
  testInfo: TestInfo,
): Promise<void> => {
  try {
    const requestOptions = {
      headers: { Origin: "http://127.0.0.1:5173" },
    };
    const login = await api.post("http://127.0.0.1:4000/api/auth/login", {
      data: {
        email: seededAdmin.email,
        password: seededAdmin.password,
        remember: false,
      },
      ...requestOptions,
    });
    if (!login.ok()) {
      recordCleanupFailure(
        testInfo,
        `Admin cleanup login failed (${login.status()})`,
      );
      return;
    }

    const list = await api.get("http://127.0.0.1:4000/api/admin/classes", {
      params: { search: title, page: 1, limit: 50 },
      ...requestOptions,
    });
    if (!list.ok()) {
      recordCleanupFailure(
        testInfo,
        `Admin cleanup search failed (${list.status()})`,
      );
      return;
    }

    const payload = (await list.json()) as AdminClassListResponse;
    const target = payload.data?.find((item) => item.title === title);
    if (!target?.id) return;

    const deletion = await api.delete(
      `http://127.0.0.1:4000/api/classes/${target.id}`,
      requestOptions,
    );
    if (!deletion.ok() && deletion.status() !== 404) {
      recordCleanupFailure(
        testInfo,
        `Admin cleanup delete failed (${deletion.status()})`,
      );
    }
  } catch (error) {
    recordCleanupFailure(
      testInfo,
      error instanceof Error ? error.message : "Unknown admin cleanup failure",
    );
  }
};
