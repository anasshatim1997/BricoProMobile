const BASE_URL = 'http://192.168.1.172:8080/api/v1';

async function safeJson<T>(res: Response): Promise<T> {
    const text = await res.text();

    if (!res.ok || text.trimStart().startsWith('<')) {
        if (text.trimStart().startsWith('<')) {
            throw new Error(`Server returned HTML (status ${res.status}). Preview: ${text.slice(0, 120)}`);
        }
        try {
            const data = JSON.parse(text);
            throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
        } catch {
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
        }
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(`Failed to parse JSON. Body: ${text.slice(0, 200)}`);
    }
}

export type TaskStatus = 'SEARCHING' | 'CONFIRMED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
export type UserRole   = 'CLIENT' | 'WORKER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';

// Matches exactly what Spring/Lombok serializes (boolean "isX" fields lose the "is" prefix)
export interface UserSummary {
    id: number;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    role: UserRole;
    status: UserStatus;
    verified: boolean;   // Java isVerified → JSON "verified"
    online: boolean;     // Java isOnline   → JSON "online"
    createdAt: string;
}

export interface Task {
    id: number;
    client: UserSummary;
    worker?: UserSummary;
    serviceType: string;
    title: string;
    description: string;
    address: string;
    latitude?: number;
    longitude?: number;
    scheduledDate: string;
    scheduledStart: string;
    scheduledEnd?: string;
    budgetMin?: number;
    budgetMax?: number;
    agreedPrice?: number;
    status: TaskStatus;
    urgent: boolean;        // Java isUrgent → JSON "urgent"
    photoUrls: string[];
    cancellationReason?: string;
    cancelledBy?: 'CLIENT' | 'WORKER';
    createdAt: string;
    updatedAt: string;
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    last: boolean;
}

export interface Review {
    id: number;
    taskId: number;
    reviewer: UserSummary;
    reviewee: UserSummary;
    rating: number;
    comment?: string;
    createdAt: string;
}

export interface CancellationResult {
    taskId: number;
    cancelledBy: string;
    penaltyApplied: boolean;
    penaltyAmount: number;
    penaltyReason: string;
}

export const tasksApi = {
    get: (id: number, token: string): Promise<Task> =>
        fetch(`${BASE_URL}/tasks/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(r => safeJson<Task>(r)),

    getClientTasks: (
        token: string,
        status?: TaskStatus,
        page = 0,
        size = 20,
    ): Promise<Page<Task>> =>
        fetch(
            `${BASE_URL}/tasks/mine/client?page=${page}&size=${size}${status ? `&status=${status}` : ''}`,
            { headers: { Authorization: `Bearer ${token}` } },
        ).then(r => safeJson<Page<Task>>(r)),

    getWorkerTasks: (
        token: string,
        status?: TaskStatus,
        page = 0,
        size = 20,
    ): Promise<Page<Task>> =>
        fetch(
            `${BASE_URL}/tasks/mine/worker?page=${page}&size=${size}${status ? `&status=${status}` : ''}`,
            { headers: { Authorization: `Bearer ${token}` } },
        ).then(r => safeJson<Page<Task>>(r)),

    getAvailable: (
        token: string,
        serviceType?: string,
        page = 0,
        size = 20,
    ): Promise<Page<Task>> =>
        fetch(
            `${BASE_URL}/tasks/available?page=${page}&size=${size}${serviceType ? `&serviceType=${serviceType}` : ''}`,
            { headers: { Authorization: `Bearer ${token}` } },
        ).then(r => safeJson<Page<Task>>(r)),

    accept: (id: number, token: string): Promise<Task> =>
        fetch(`${BASE_URL}/tasks/${id}/accept`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        }).then(r => safeJson<Task>(r)),

    updateStatus: (
        id: number,
        token: string,
        body: { status: TaskStatus; agreedPrice?: number; cancellationReason?: string },
    ): Promise<Task> =>
        fetch(`${BASE_URL}/tasks/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        }).then(r => safeJson<Task>(r)),

    cancel: (id: number, token: string, reason: string): Promise<CancellationResult> =>
        fetch(`${BASE_URL}/tasks/${id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reason }),
        }).then(r => safeJson<CancellationResult>(r)),

    submitReview: (
        id: number,
        token: string,
        body: { rating: number; comment?: string },
    ): Promise<Review> =>
        fetch(`${BASE_URL}/tasks/${id}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        }).then(r => safeJson<Review>(r)),

    getReviews: (
        userId: number,
        token: string,
        page = 0,
        size = 20,
    ): Promise<Page<Review>> =>
        fetch(`${BASE_URL}/tasks/reviews/${userId}?page=${page}&size=${size}`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(r => safeJson<Page<Review>>(r)),

    create: (token: string, body: Record<string, unknown>): Promise<Task> =>
        fetch(`${BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
        }).then(r => safeJson<Task>(r)),
};