import { useCallback } from 'react';
import { TokenStorage } from '../storage/token';
import { BASE_URL } from '../../../../Desktop/BricoProApp/src/api/auth';

export function useAuthFetch() {
    return useCallback(async (path: string, method = 'GET') => {
        const session = await TokenStorage.get();
        if (!session) return null;
        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.accessToken}`,
            },
        });
        if (!res.ok) return null;
        if (method === 'POST') return { ok: true };
        return res.json();
    }, []);
}