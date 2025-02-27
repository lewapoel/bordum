import { useEffect, useState } from "react";
import { AuthContext, useGetToken } from "../api/auth.ts";

export function AuthProvider({ children }: any) {
  const [token, setToken] = useState(null);
  const query = useGetToken();

  useEffect(() => {
    if (query.data) {
      setToken(query.data.token);
    }
  }, [query.data]);

  return (
    <AuthContext.Provider value={{ token }}>{children}</AuthContext.Provider>
  );
}
