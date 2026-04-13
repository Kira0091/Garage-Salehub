// src/pages/AuthPages.jsx
import { AuthPage as AuthTabs } from "./auth";

export function AuthPage() {
  return <AuthTabs initialTab="login" />;
}

export function LoginPage() {
  return <AuthTabs initialTab="login" />;
}

export function RegisterPage() {
  return <AuthTabs initialTab="register" />;
}
