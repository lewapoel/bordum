import { useEffect, useState } from 'react';
import { useGetToken } from '../api/comarch/auth.ts';
import { useGetSqlToken } from '../api/comarch-sql/auth.ts';
import { AuthContext } from './AuthContext.tsx';

export function AuthProvider({ children }: any) {
  const [token, setToken] = useState(null);
  const [sqlToken, setSqlToken] = useState(null);

  const query = useGetToken();
  const sqlQuery = useGetSqlToken();

  useEffect(() => {
    if (query.data) {
      setToken(query.data.token);
    }
  }, [query.data]);

  useEffect(() => {
    if (sqlQuery) {
      setSqlToken(sqlQuery);
    }
  }, [sqlQuery]);

  return (
    <AuthContext.Provider value={{ token, sqlToken }}>
      {children}
    </AuthContext.Provider>
  );
}
