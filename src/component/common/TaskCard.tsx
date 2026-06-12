import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants';
import { SERVICES } from '../../constants/services';
import { Task, TaskStatus } from '../../api/tasks';
import { Lang } from '../../i18n';

export const STATUS_META: Record<TaskStatus, { color: string; fr: string; ar: string }> = {
    SEARCHING: { color: '#6366F1', fr: 'En recherche',  ar: 'بحث' },
    CONFIRMED: { color: '#F97316', fr: 'Confirmée',     ar: 'مؤكدة' },
    STARTED:   { color: '#F59E0B', fr: 'En cours',      ar: 'جارية' },
    COMPLETED: { color: '#10B981', fr: 'Terminée',      ar: 'منجزة' },
    CANCELLED: { color: '#9CA3AF', fr: 'Annulée',       ar: 'ملغاة' },
};

interface Props {
    task: Task;
    lang: Lang;
    onPress: () => void;
}

export function TaskCard({ task, lang, onPress }: Props) {
    const isFr  = lang === 'fr';
    const isRTL = lang === 'ar';
    const sm    = STATUS_META[task.status];
    const svc   = SERVICES.find(s => s.key === task.serviceType);

    const budgetLabel = () => {
        if (task.agreedPrice) return `${task.agreedPrice} MAD`;
        if (task.budgetMin && task.budgetMax) return `${task.budgetMin} – ${task.budgetMax} MAD`;
        if (task.budgetMin) return `≥ ${task.budgetMin} MAD`;
        if (task.budgetMax) return `≤ ${task.budgetMax} MAD`;
        return null;
    };

    const budget = budgetLabel();

    return (
        <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
            <View style={[s.row, isRTL && s.rowRTL]}>
                <View style={[s.iconBadge, { backgroundColor: (svc?.color ?? C.orange) + '22' }]}>
                    <Text style={s.iconEmoji}>{svc?.icon ?? '🔧'}</Text>
                </View>
                <View style={s.content}>
                    <View style={[s.titleRow, isRTL && s.rowRTL]}>
                        <Text style={[s.title, isRTL && s.rtl]} numberOfLines={1}>{task.title}</Text>
                        {task.urgent && <Text style={s.urgentDot}>🔥</Text>}
                    </View>
                    <Text style={[s.address, isRTL && s.rtl]} numberOfLines={1}>{task.address}</Text>
                    <View style={[s.footer, isRTL && s.footerRTL]}>
                        <Text style={s.date}>
                            {task.scheduledDate} · {task.scheduledStart.slice(0, 5)}
                        </Text>
                        <View style={[s.pill, { backgroundColor: sm.color + '18', borderColor: sm.color + '44' }]}>
                            <Text style={[s.pillText, { color: sm.color }]}>
                                {isFr ? sm.fr : sm.ar}
                            </Text>
                        </View>
                    </View>
                    {budget && (
                        <Text style={[s.budget, isRTL && s.rtl]}>{budget}</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F0F2F5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    row:        { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    rowRTL:     { flexDirection: 'row-reverse' },
    iconBadge:  { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    iconEmoji:  { fontSize: 22 },
    content:    { flex: 1, gap: 4 },
    titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title:      { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
    urgentDot:  { fontSize: 13 },
    address:    { fontSize: 12, color: '#6B7280' },
    footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    footerRTL:  { flexDirection: 'row-reverse' },
    date:       { fontSize: 11, color: '#9CA3AF' },
    pill:       { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    pillText:   { fontSize: 11, fontWeight: '600' },
    budget:     { fontSize: 12, fontWeight: '700', color: C.orange, marginTop: 2 },
    rtl:        { textAlign: 'right' },
});