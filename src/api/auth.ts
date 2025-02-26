// src/api/auth.js

import { API_PASSWORD, API_URL, API_USERNAME } from "./const";
import { getCurrentTimestamp } from "../utils/time";
import { createContext } from "react";

export async function getToken() {
  const response = await fetch(`${API_URL}/Token`, {
    method: "POST",
    body: new URLSearchParams({
      username: API_USERNAME ?? "",
      password: API_PASSWORD ?? "",
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

export const AuthContext = createContext<any>(null);
