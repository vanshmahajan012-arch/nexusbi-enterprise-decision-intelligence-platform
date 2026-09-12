import { apiFetch } from "./api";

export interface AuthMeResponse {
  status: string;
  user_id: string;
  email: string | null;
  role: string | null;
}

export async function getAuthenticatedUser(): Promise<AuthMeResponse> {
  const response = await apiFetch(
    "/api/auth/me",
  );

  if (!response.ok) {
    throw new Error(
      `Authentication check failed (${response.status})`,
    );
  }

  return response.json() as Promise<AuthMeResponse>;
}
