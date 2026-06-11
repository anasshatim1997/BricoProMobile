import React, { useEffect, useRef } from 'react';
import { Animated, Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { TokenStorage } from '../storage/token';
import { Role } from '../api/auth.ts';

interface Props {
    onFinish:     () => void;
    onAutoLogin:  (role: Role) => void;
}

export default function SplashScreen({ onFinish, onAutoLogin }: Props) {
    const logoScale      = useRef(new Animated.Value(0)).current;
    const logoOpacity    = useRef(new Animated.Value(0)).current;
    const titleOpacity   = useRef(new Animated.Value(0)).current;
    const titleY         = useRef(new Animated.Value(16)).current;
    const lineWidth      = useRef(new Animated.Value(0)).current;
    const tag1Opacity    = useRef(new Animated.Value(0)).current;
    const tag1Y          = useRef(new Animated.Value(10)).current;
    const tag2Opacity    = useRef(new Animated.Value(0)).current;
    const tag2Y          = useRef(new Animated.Value(10)).current;
    const tag3Opacity    = useRef(new Animated.Value(0)).current;
    const tag3Y          = useRef(new Animated.Value(10)).current;
    const dotsOpacity    = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Run animation and session check in parallel
        const animPromise = new Promise<void>(resolve => {
            Animated.sequence([
                Animated.parallel([
                    Animated.spring(logoScale,   { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
                    Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                    Animated.spring(titleY,       { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
                    Animated.timing(lineWidth,    { toValue: 1, duration: 500, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(tag1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.spring(tag1Y,       { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(tag2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.spring(tag2Y,       { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(tag3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.spring(tag3Y,       { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
                    Animated.timing(dotsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                ]),
            ]).start(() => resolve());
        });

        const sessionPromise = TokenStorage.get();

        Promise.all([animPromise, sessionPromise]).then(([, session]) => {
            if (session) {
                onAutoLogin(session.role);
            } else {
                onFinish();
            }
        });
    }, [dotsOpacity, lineWidth, logoOpacity, logoScale, onAutoLogin, onFinish, tag1Opacity, tag1Y, tag2Opacity, tag2Y, tag3Opacity, tag3Y, titleOpacity, titleY]);

    return (
        <View style={s.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                <Image source={require('../assets/logo.png')} style={s.logo} resizeMode="contain" />
            </Animated.View>

            <Animated.Text style={[s.title, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
                BricoPro
            </Animated.Text>

            <Animated.View style={[s.lineWrap, { transform: [{ scaleX: lineWidth }] }]}>
                <View style={s.line} />
            </Animated.View>

            <View style={s.tagsBlock}>
                <Animated.View style={[s.tagRow, { opacity: tag1Opacity, transform: [{ translateY: tag1Y }] }]}>
                    <Text style={s.tagAr}>خدمات احترافية</Text>
                    <Text style={s.tagDot}>·</Text>
                    <Text style={s.tagFr}>Des pros près de chez vous</Text>
                </Animated.View>
                <Animated.View style={[s.tagRow, { opacity: tag2Opacity, transform: [{ translateY: tag2Y }] }]}>
                    <Text style={s.tagFr}>Rapide, fiable</Text>
                    <Text style={s.tagDot}>·</Text>
                    <Text style={s.tagAr}>وبسعر مناسب</Text>
                </Animated.View>
                <Animated.View style={[s.tagRow, { opacity: tag3Opacity, transform: [{ translateY: tag3Y }] }]}>
                    <Text style={s.tagAr}>في كل مكان بالمغرب</Text>
                    <Text style={s.tagDot}>·</Text>
                    <Text style={s.tagFr}>Partout au Maroc</Text>
                </Animated.View>
            </View>

            <Animated.View style={[s.dots, { opacity: dotsOpacity }]}>
                <View style={[s.dot, s.dotInactive]} />
                <View style={[s.dot, s.dotInactive]} />
                <View style={[s.dot, s.dotActive]} />
            </Animated.View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
    logoWrap:  { width: 140, height: 140, marginBottom: 28, alignItems: 'center', justifyContent: 'center' },
    logo:      { width: 140, height: 140 },
    title:     { fontSize: 36, fontWeight: '800', color: '#111827', letterSpacing: -1, marginBottom: 10 },
    lineWrap:  { width: 48, marginBottom: 24 },
    line:      { height: 3, borderRadius: 2, backgroundColor: '#F97316' },
    tagsBlock: { alignItems: 'center', gap: 10, marginBottom: 40 },
    tagRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tagFr:     { fontSize: 13, color: '#374151', fontWeight: '500' },
    tagAr:     { fontSize: 13, color: '#F97316', fontWeight: '700' },
    tagDot:    { fontSize: 14, color: '#D1D5DB', fontWeight: '300' },
    dots:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot:       { borderRadius: 4 },
    dotInactive: { width: 7,  height: 7, backgroundColor: '#D1D5DB' },
    dotActive:   { width: 28, height: 7, borderRadius: 4, backgroundColor: '#F97316' },
});