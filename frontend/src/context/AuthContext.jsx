// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== "token" && event.key !== "auth_sync") return;
      authAPI.me()
        .then(setUser)
        .catch(() => setUser(null));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login({ email, password });
    if (data.token) localStorage.setItem("token", data.token);
    localStorage.setItem("auth_sync", String(Date.now()));
    setUser(data.user);
    return data.user;
  };

  const register = async (fields) => {
    const data = await authAPI.register(fields);
    if (data.token) localStorage.setItem("token", data.token);
    localStorage.setItem("auth_sync", String(Date.now()));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {}
    localStorage.removeItem("token");
    localStorage.setItem("auth_sync", String(Date.now()));
    setUser(null);
  };

  const refreshUser = async () => {
    const u = await authAPI.me();
    setUser(u);
  };

  const validateSession = async () => {
    try {
      await authAPI.validate();
      return true;
    } catch {
      setUser(null);
      localStorage.removeItem("token");
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, validateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
