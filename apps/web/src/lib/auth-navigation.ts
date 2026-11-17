export type PrivateDestination = "/account" | "/admin";

export function getLoginDestination(value: string | string[] | undefined): PrivateDestination {
  return value === "/admin" ? "/admin" : "/account";
}
