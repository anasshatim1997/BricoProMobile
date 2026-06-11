import React, { useCallback, useEffect, useRef } from 'react';
import {
    Animated,
    Image,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants';
import { Lang } from '../../i18n';

type Role = 'CLIENT' | 'WORKER';

function RoleCard({
                      icon,
                      title,
                      subtitle,
                      bg,
                      border,
                      iconBg,
                      accent,
                      delay,
                      onPress,
                  }: {
    icon: string;
    title: string;
    subtitle: string;
    bg: string;
    border: string;
    iconBg: string;
    accent: string;
    delay: number;
    onPress: () => void;
}) {
    const translateX = useRef(new Animated.Value(delay === 80 ? -40 : 40)).current;
    const opacity    = useRef(new Animated.Value(0)).current;
    const scale      = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, tension: 65, friction: 9, delay, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
        ]).start();
    }, [delay, opacity, translateX]);

    const onPressIn = useCallback(() =>
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start(), [scale]);

    const onPressOut = useCallback(() =>
        Animated.spring(scale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start(), [scale]);

    return (
        <Animated.View style={{ opacity, transform: [{ translateX }, { scale }] }}>
            <Pressable
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={[s.card, { backgroundColor: bg, borderColor: border }]}>
                <View style={[s.iconBox, { backgroundColor: iconBg }]}>
                    <Text style={s.iconText}>{icon}</Text>
                </View>
                <View style={s.cardText}>
                    <Text style={s.cardTitle}>{title}</Text>
                    <Text style={s.cardSub}>{subtitle}</Text>
                </View>
                <Text style={[s.arrow, { color: accent }]}>›</Text>
            </Pressable>
        </Animated.View>
    );
}

interface RoleSelectionScreenProps {
    lang: Lang;
    onToggleLang: () => void;
    onLogin: () => void;
    onSignup: (role: Role) => void;
}

export function RoleSelectionScreen({ lang, onToggleLang, onLogin, onSignup }: RoleSelectionScreenProps) {
    const headerY = useRef(new Animated.Value(-30)).current;
    const headerO = useRef(new Animated.Value(0)).current;
    const bottomY = useRef(new Animated.Value(30)).current;
    const bottomO = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(headerY, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
            Animated.timing(headerO, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(bottomY, { toValue: 0, tension: 65, friction: 9, delay: 300, useNativeDriver: true }),
            Animated.timing(bottomO, { toValue: 1, duration: 400, delay: 300, useNativeDriver: true }),
        ]).start();
    }, [bottomO, bottomY, headerO, headerY]);

    return (
        <SafeAreaView style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.dark} />

            <Animated.View style={[s.header, { opacity: headerO, transform: [{ translateY: headerY }] }]}>
                <View style={s.headerInner}>
                    <View style={s.headerLogoBox}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={s.headerLogo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={s.headerTitle}>BricoPro</Text>
                </View>
                <Pressable onPress={onToggleLang} style={s.langBtn}>
                    <Text style={s.langToggle}>{lang === 'fr' ? 'AR' : 'FR'}</Text>
                </Pressable>
                <Text style={s.headerSub}>
                    {lang === 'fr' ? 'Choisissez votre profil' : 'اختر ملفك الشخصي'}
                </Text>
            </Animated.View>

            <View style={s.body}>
                <View style={s.cardsBlock}>
                    <RoleCard
                        icon="🏠"
                        title={lang === 'fr' ? 'Je suis client' : 'أنا عميل'}
                        subtitle={lang === 'fr' ? 'Trouver un prestataire' : 'البحث عن مزود خدمة'}
                        bg={C.white}
                        border={C.purpleLight}
                        iconBg="#EEF2FF"
                        accent={C.purpleMid}
                        delay={80}
                        onPress={() => onSignup('CLIENT')}
                    />
                    <RoleCard
                        icon="🔧"
                        title={lang === 'fr' ? 'Je suis travailleur' : 'أنا عامل'}
                        subtitle={lang === 'fr' ? 'Proposer mes services' : 'تقديم خدماتي'}
                        bg={C.workerBg}
                        border={C.workerBorder}
                        iconBg={C.workerIcon}
                        accent={C.workerAccent}
                        delay={200}
                        onPress={() => onSignup('WORKER')}
                    />
                </View>

                <Animated.View style={[s.bottomBlock, { opacity: bottomO, transform: [{ translateY: bottomY }] }]}>
                    <Text style={s.loginHint}>
                        {lang === 'fr' ? 'Déjà un compte ?' : 'لديك حساب بالفعل؟'}
                    </Text>
                    <Pressable onPress={onLogin}>
                        <Text style={s.loginLink}>
                            {lang === 'fr' ? 'Se connecter' : 'تسجيل الدخول'}
                        </Text>
                    </Pressable>
                    <Pressable style={s.cta} onPress={() => onSignup('CLIENT')}>
                        <Text style={s.ctaText}>
                            {lang === 'fr' ? 'Créer un compte' : 'إنشاء حساب'}
                        </Text>
                    </Pressable>
                </Animated.View>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },
    header: {
        backgroundColor: C.dark,
        paddingTop: 28,
        paddingBottom: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 8,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerLogoBox: {
        width: 38,
        height: 38,
        borderRadius: 11,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerLogo: {
        width: 38,
        height: 38,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerSub: {
        fontSize: 13,
        color: C.purple,
        marginTop: 2,
    },
    langBtn: {
        position: 'absolute',
        right: 20,
        top: 28,
    },
    langToggle: {
        fontSize: 12,
        fontWeight: '700',
        color: C.orange,
        borderWidth: 1,
        borderColor: C.orange,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    body: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
        gap: 32,
    },
    cardsBlock: {
        gap: 14,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
        padding: 18,
        gap: 14,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        fontSize: 22,
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: C.textDark,
    },
    cardSub: {
        fontSize: 12,
        color: C.textMuted,
        marginTop: 3,
    },
    arrow: {
        fontSize: 24,
        fontWeight: '300',
    },
    bottomBlock: {
        alignItems: 'center',
        gap: 6,
    },
    loginHint: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    loginLink: {
        fontSize: 14,
        fontWeight: '600',
        color: C.purpleMid,
        marginTop: 2,
        marginBottom: 14,
    },
    cta: {
        backgroundColor: C.dark,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        width: '100%',
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});