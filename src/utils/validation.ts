export const Validators = {
    required: (v: string) => v.trim().length > 0,

    email: (v: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),

    phone: (v: string) =>
        /^(\+212|0)[5-7]\d{8}$/.test(v.replace(/\s/g, '')),

    password: (v: string) => v.length >= 8,

    name: (v: string) => v.trim().length >= 2,

    emailOrPhone: (v: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ||
        /^(\+212|0)[5-7]\d{8}$/.test(v.replace(/\s/g, '')),
};

export function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export type FieldErrors<T extends string> = Partial<Record<T, string>>;