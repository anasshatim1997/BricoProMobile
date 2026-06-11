export const SVC_ICON: Record<string, string> = {
    REPAIRS:      '🔧',
    PLUMBING:     '🚿',
    CLEANING:     '🧹',
    PAINTING:     '🎨',
    MOVING:       '📦',
    ASSEMBLY:     '🪛',
    OUTDOOR:      '🌿',
    DECORATION:   '🛋️',
    CONSTRUCTION: '🏗️',
};

export const SVC_COLOR: Record<string, string> = {
    REPAIRS:      '#F97316',
    PLUMBING:     '#3B82F6',
    CLEANING:     '#10B981',
    PAINTING:     '#8B5CF6',
    MOVING:       '#F59E0B',
    ASSEMBLY:     '#EF4444',
    OUTDOOR:      '#059669',
    DECORATION:   '#EC4899',
    CONSTRUCTION: '#6366F1',
};

export const SERVICES = [
    { key: 'REPAIRS',      icon: '🔧', fr: 'Réparations',  ar: 'إصلاحات',   color: '#F97316' },
    { key: 'PLUMBING',     icon: '🚿', fr: 'Plomberie',    ar: 'سباكة',     color: '#3B82F6' },
    { key: 'CLEANING',     icon: '🧹', fr: 'Nettoyage',    ar: 'تنظيف',     color: '#10B981' },
    { key: 'PAINTING',     icon: '🎨', fr: 'Peinture',     ar: 'دهن',       color: '#8B5CF6' },
    { key: 'MOVING',       icon: '📦', fr: 'Déménagement', ar: 'نقل',       color: '#F59E0B' },
    { key: 'ASSEMBLY',     icon: '🪛', fr: 'Montage',      ar: 'تجميع',     color: '#EF4444' },
    { key: 'OUTDOOR',      icon: '🌿', fr: 'Jardinage',    ar: 'حدائق',     color: '#059669' },
    { key: 'DECORATION',   icon: '🛋️', fr: 'Décoration',   ar: 'ديكور',     color: '#EC4899' },
    { key: 'CONSTRUCTION', icon: '🏗️', fr: 'Construction', ar: 'بناء',      color: '#6366F1' },
] as const;

export type ServiceKey = typeof SERVICES[number]['key'];