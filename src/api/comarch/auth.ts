import { API_PASSWORD, API_URL, API_USERNAME } from './const.ts';
import { getCurrentTimestamp } from '../../utils/time.ts';
import { createContext } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useGetToken() {
  return useQuery({
    queryKey: ['token'],
    queryFn: () =>
      fetch(`${API_URL}/Token`, {
        method: 'POST',
        body: new URLSearchParams({
          username: API_USERNAME ?? '',
          password: API_PASSWORD ?? '',
          grant_type: 'password',
        }),
      })
        .then(async (response) => {
          const data = await response.json();
          return {
            token: data['access_token'],
            expires: getCurrentTimestamp() + +data['expires_in'],
          };
        })
        .catch((error) => {
          console.error(error);
          alert('Nie udało się pobrać tokenu dostępu');
          return null;
        }),
  });
}

export const AuthContext = createContext<any>(null);
