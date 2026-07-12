import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { api, setAccessToken, setUnauthorizedHandler, unwrap } from "../lib/api";
import { User } from "../lib/types";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  login: (input: { email: string; password: string }) => Promise<void>;
  signup: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setToken] = useState<string | null>(() => localStorage.getItem("assetflow.accessToken"));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("assetflow.user");
    return stored ? JSON.parse(stored) as User : null;
  });

  useEffect(() => {
    setAccessToken(accessToken);
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      localStorage.removeItem("assetflow.user");
      window.history.pushState(null, "", "/login");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    accessToken,
    login: async (input) => {
      const result = await unwrap<{ user: User; accessToken: string }>(api.post("/auth/login", input));
      setToken(result.accessToken);
      setUser(result.user);
      localStorage.setItem("assetflow.user", JSON.stringify(result.user));
    },
    signup: async (input) => {
      await unwrap<User>(api.post("/auth/signup", input));
    },
    logout: async () => {
      await api.post("/auth/logout").catch(() => undefined);
      setToken(null);
      setUser(null);
      localStorage.removeItem("assetflow.user");
    },
  }), [accessToken, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
};
