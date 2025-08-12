import { SQL_API_TOKEN } from './const.ts';
import { useState } from 'react';

export function useGetSqlToken() {
  return useState(SQL_API_TOKEN)[0];
}
