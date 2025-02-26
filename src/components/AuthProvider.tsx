import { useEffect, useState } from "react";
import { AuthContext, getToken } from "../api/auth.ts";

export function AuthProvider({ children }: any) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    getToken().then((tokenData) => {
      if (tokenData) {
        setToken(tokenData.token);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ token }}>{children}</AuthContext.Provider>
  );
}
