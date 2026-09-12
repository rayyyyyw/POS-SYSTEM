export type ActionState = {
  message: string;
  success?: boolean;
  errors?: Record<string, string[]>;
  redirectTo?: string;
};
