import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface StatItem {
    value: string | number;
    label: string;
    emoji?: string;
}

interface Props {
    items: [StatItem, StatItem, StatItem];
}

export function StatStrip({ items }: Props) {
    return (
        <View style={s.strip}>
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <View style={s.sep} />}
                    <View style={s.item}>
                        <Text style={s.num}>{item.value}</Text>
                        {item.emoji ? <Text style={s.emoji}>{item.emoji}</Text> : null}
                        <Text style={s.lbl}>{item.label}</Text>
                    </View>
                </React.Fragment>
            ))}
        </View>
    );
}

const s = StyleSheet.create({
    strip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    item:  { flex: 1, alignItems: 'center', gap: 1 },
    num:   { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    emoji: { fontSize: 13 },
    lbl:   { fontSize: 9, color: 'rgba(155,143,204,0.7)', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3 },
    sep:   { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },
});