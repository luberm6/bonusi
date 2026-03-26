export type UserRole = "super_admin" | "admin" | "client";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

export type AccessTokenPayload = {
  sub: string;
  sid: string;
  did: string | null;
  typ: "access";
};
