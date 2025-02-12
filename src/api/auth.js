// src/api/auth.js

import { API_PASSWORD, API_URL, API_USERNAME } from "./const";
import { getCurrentTimestamp } from "../utils/time";
import { createContext, useEffect, useState } from "react";

export async function getToken() {
  const response = await fetch(`${API_URL}/Token`, {
    method: "POST",
    body: new URLSearchParams({
      username: API_USERNAME,
      password: API_PASSWORD,
      grant_type: "password",
    }),
  });

  if (!response.ok) {
    alert("Nie udało się pobrać tokenu dostępu");
    return null;
  }

  const data = await response.json();

  return {
    token: data["access_token"],
    expires: getCurrentTimestamp() + +data["expires_in"],
  };
}

export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
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
