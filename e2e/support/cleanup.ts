import type { APIRequestContext } from "@playwright/test";
import { seededAdmin } from "./test-data";

type AdminClassListResponse = {
  data?: Array<{ id?: string; title?: string }>;
};

export const deleteAdminClassByTitle = async (
  api: APIRequestContext,
  title: string,
): Promise<void> => {
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
    throw new Error(`Admin cleanup login failed (${login.status()})`);
  }

  const list = await api.get("http://127.0.0.1:4000/api/admin/classes", {
    params: { search: title, page: 1, limit: 50 },
    ...requestOptions,
  });
  if (!list.ok()) {
    throw new Error(`Admin cleanup search failed (${list.status()})`);
  }

  const payload = (await list.json()) as AdminClassListResponse;
  const target = payload.data?.find((item) => item.title === title);
  if (!target?.id) return;

  const deletion = await api.delete(
    `http://127.0.0.1:4000/api/classes/${target.id}`,
    requestOptions,
  );
  if (!deletion.ok() && deletion.status() !== 404) {
    throw new Error(`Admin cleanup delete failed (${deletion.status()})`);
  }
};
