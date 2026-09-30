/** The signed-in Parent account as the backend's `GET /api/auth/me` returns it. */
export interface CurrentParent {
  id: string;
  email: string;
  name: string;
  surname: string | null;
}

/** Овог then Нэр, as the Account page's heading (23:12046). */
export const displayName = ({ name, surname }: Pick<CurrentParent, "name" | "surname">) => [surname, name].filter(Boolean).join(" ");

/** The avatar's letters (23:12041): first of Овог and first of Нэр, or just Нэр's when there is no Овог. */
export const initials = ({ name, surname }: Pick<CurrentParent, "name" | "surname">) =>
  [surname, name]
    .filter(Boolean)
    .map((part) => Array.from(part!)[0])
    .join("")
    .toUpperCase();
