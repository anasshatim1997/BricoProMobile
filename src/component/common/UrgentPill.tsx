import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lang } from '../../i18n';

interface Props {
    lang: Lang;
}

export function UrgentPill({ lang }: Props) {
    return (
        <View style={s.pill}>
            <Text style={s.text}>⚡ {lang === 'fr' ? 'Urgent' : 'عاجل'}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    pill: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    text: { fontSize: 9, color: '#D97706', fontWeight: '700' },
});