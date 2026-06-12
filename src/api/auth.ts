export const BASE_URL = 'http://192.168.1.172:8080/api/v1';

export type Role = 'CLIENT' | 'WORKER';

export interface RegisterPayload {
    firstName: string;
    lastName:  string;
    email:     string;
    phone?:    string;
    password:  string;
    role:      Role;
}

export interface LoginPayload {
    email?:    string;
    phone?:    string;
    password:  string;
}

export interface AuthResponse {
    accessToken:  string;
    refreshToken: string;
    tokenType:    string;
    userId:       number;
    role:         Role;
}

export interface ApiError {
    message: string;
    status:  number;
}

async function request<T>(path: string, body: object): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
        const msg =
            data?.message ||
            data?.password ||
            data?.email ||
            data?.error ||
            'Une erreur est survenue';
        throw { message: msg, status: res.status } as ApiError;
    }

    return data as T;
}

export const authApi = {
    register: (payload: RegisterPayload) =>
        request<{ message: string; userId: number }>('/auth/register', payload),

    login: (payload: LoginPayload) =>
        request<AuthResponse>('/auth/login', payload),

    verifyOtp: (payload: { userId: number; code: string }) =>
        request<{ message: string }>('/auth/verify-otp', payload),

    resendOtp: (payload: { userId: number }) =>
        request<{ message: string }>('/auth/resend-otp', payload),

    googleLogin: (payload: { idToken: string }) =>
        request<AuthResponse>('/auth/oauth/google', payload),

    facebookLogin: (payload: { accessToken: string }) =>
        request<AuthResponse>('/auth/oauth/facebook', payload),
};