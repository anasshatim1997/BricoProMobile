import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    count: number;
    onPress?: () => void;
}

export function NotificationBell({ count, onPress }: Props) {
    return (
        <TouchableOpacity style={s.btn} onPress={onPress} activeOpacity={0.7}>
            <Text style={s.icon}>🔔</Text>
            {count > 0 && (
                <View style={s.badge}>
                    <Text style={s.badgeText}>{count > 9 ? '9+' : count}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    btn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
    icon:      { fontSize: 14 },
    badge:     { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});