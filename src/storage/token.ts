import AsyncStorage from '@react-native-async-storage/async-storage';
import { Role } from '../../../../Desktop/BricoProApp/src/api/auth';

// spell-checker: ignore bpro
const KEYS = {
    ACCESS:   'bpro:access_token',
    REFRESH:  'bpro:refresh_token',
    USER_ID:  'bpro:user_id',
    ROLE:     'bpro:role',
} as const;

export interface StoredSession {
    accessToken:  string;
    refreshToken: string;
    userId:       number;
    role:         Role;
}

export const TokenStorage = {
    async save(session: StoredSession): Promise<void> {
        await Promise.all([
            AsyncStorage.setItem(KEYS.ACCESS,   session.accessToken),
            AsyncStorage.setItem(KEYS.REFRESH,  session.refreshToken),
            AsyncStorage.setItem(KEYS.USER_ID,  String(session.userId)),
            AsyncStorage.setItem(KEYS.ROLE,     session.role),
        ]);
    },

    async get(): Promise<StoredSession | null> {
        const [access, refresh, userId, role] = await Promise.all([
            AsyncStorage.getItem(KEYS.ACCESS),
            AsyncStorage.getItem(KEYS.REFRESH),
            AsyncStorage.getItem(KEYS.USER_ID),
            AsyncStorage.getItem(KEYS.ROLE),
        ]);

        if (!access || !refresh || !userId || !role) return null;

        return {
            accessToken:  access,
            refreshToken: refresh,
            userId:       Number(userId),
            role:         role as Role,
        };
    },

    async clear(): Promise<void> {
        await Promise.all(
            Object.values(KEYS).map(key => AsyncStorage.removeItem(key)),
        );
    },
};