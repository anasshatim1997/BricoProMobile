import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants';
import { Lang, translations } from '../../i18n';
import { authApi, AuthResponse } from '../../api/auth.ts';
import { TokenStorage } from '../../storage/token.ts';
import { Validators, FieldErrors } from '../../utils/validation.ts';
import { OAuthButtons } from './OAuthButtons';

interface Props {
    lang: Lang;
    onToggleLang: () => void;
    onBack: () => void;
    onSignup: () => void;
    onSuccess: (res: AuthResponse) => void;
}

type LoginMethod = 'email' | 'phone';
type FormField   = 'credential' | 'password';

function useShakeAnimation(error?: string) {
    const shake = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (error) {
            Animated.sequence([
                Animated.timing(shake, { toValue: 6,  duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 4,  duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 0,  duration: 60, useNativeDriver: true }),
            ]).start();
        }
    }, [error, shake]);
    return shake;
}

function useFocusAnimation() {
    const anim = useRef(new Animated.Value(0)).current;
    const onFocus = () =>
        Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    const onBlur  = () =>
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    return { anim, onFocus, onBlur };
}

function Field({
                   label, placeholder, value, onChangeText, secureTextEntry, keyboardType,
                   autoComplete, error, isRTL,
               }: {
    label: string; placeholder: string; value: string;
    onChangeText: (v: string) => void; secureTextEntry?: boolean;
    keyboardType?: any; autoComplete?: any; error?: string; isRTL?: boolean;
}) {
    const { anim, onFocus, onBlur } = useFocusAnimation();
    const shake = useShakeAnimation(error);

    const borderColor = anim.interpolate({
        inputRange:  [0, 1],
        outputRange: [error ? '#EF4444' : '#E5E7EB', error ? '#EF4444' : C.orange],
    });

    return (
        <Animated.View style={[f.wrap, { transform: [{ translateX: shake }] }]}>
            <Text style={[f.label, isRTL && f.labelRTL]}>{label}</Text>
            <Animated.View style={[f.inputOuter, { borderColor }]}>
                <TextInput
                    style={[f.input, isRTL && f.inputRTL]}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete={autoComplete ?? 'off'}
                    textAlign={isRTL ? 'right' : 'left'}
                />
            </Animated.View>
            {!!error && <Text style={[f.error, isRTL && f.errorRTL]}>{error}</Text>}
        </Animated.View>
    );
}

const f = StyleSheet.create({
    wrap:       { gap: 6 },
    label:      { fontSize: 12, fontWeight: '600', color: '#8891A5', textTransform: 'uppercase', letterSpacing: 0.5 },
    labelRTL:   { textAlign: 'right' },
    inputOuter: { borderWidth: 1.5, borderRadius: 14, backgroundColor: '#FAFBFC', overflow: 'hidden' },
    input:      { padding: 14, fontSize: 15, color: '#0D1117', fontWeight: '500' },
    inputRTL:   { textAlign: 'right' },
    error:      { fontSize: 11, color: '#EF4444', marginTop: 2, fontWeight: '500' },
    errorRTL:   { textAlign: 'right' },
});

const MarketingMessages = ({ rtl }: { rtl: boolean }) => {
    const messages = useMemo(
        () => [
            { ar: 'خدمات احترافية', fr: 'Services professionnels', icon: '🔧' },
            { ar: 'موثوق وآمن', fr: 'Fiable et sécurisé', icon: '✅' },
            { ar: 'دعم 24/7', fr: 'Support 24/7', icon: '💬' },
        ],
        []
    );

    const animations = useMemo(
        () =>
            messages.map(() => ({
                opacity: new Animated.Value(0),
                translateY: new Animated.Value(12),
                iconScale: new Animated.Value(0.8),
            })),
        [messages]
    );

    useEffect(() => {
        const sequences = messages.map((_, idx) =>
            Animated.parallel([
                Animated.timing(animations[idx].opacity, {
                    toValue: 1,
                    duration: 400,
                    delay: idx * 200,
                    useNativeDriver: true,
                }),
                Animated.spring(animations[idx].translateY, {
                    toValue: 0,
                    tension: 70,
                    friction: 8,
                    delay: idx * 200,
                    useNativeDriver: true,
                }),
                Animated.spring(animations[idx].iconScale, {
                    toValue: 1,
                    tension: 80,
                    friction: 6,
                    delay: idx * 200,
                    useNativeDriver: true,
                }),
            ])
        );
        Animated.stagger(200, sequences).start();

        const pulseLoops = animations.map(anim =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim.iconScale, {
                        toValue: 1.08,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.iconScale, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            )
        );
        pulseLoops.forEach(loop => loop.start());
        return () => pulseLoops.forEach(loop => loop.stop());
    }, [messages, animations]);

    return (
        <View style={mm.container}>
            {messages.map((msg, idx) => (
                <Animated.View
                    key={idx}
                    style={[
                        mm.messageRow,
                        rtl && mm.messageRowRtl,
                        {
                            opacity: animations[idx].opacity,
                            transform: [{ translateY: animations[idx].translateY }],
                        },
                    ]}
                >
                    <Animated.Text style={[mm.icon, { transform: [{ scale: animations[idx].iconScale }] }]}>
                        {msg.icon}
                    </Animated.Text>
                    <Text style={mm.textAr}>{msg.ar}</Text>
                    <Text style={mm.dot}>·</Text>
                    <Text style={mm.textFr}>{msg.fr}</Text>
                </Animated.View>
            ))}
        </View>
    );
};

const mm = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 4,
        gap: 10,
        alignItems: 'center',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F9FAFB',
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#F0F3F6',
    },
    messageRowRtl: {
        flexDirection: 'row-reverse',
    },
    icon: {
        fontSize: 18,
    },
    textAr: {
        fontSize: 12,
        fontWeight: '700',
        color: C.orange,
    },
    textFr: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    dot: {
        fontSize: 12,
        color: '#D1D5DB',
        fontWeight: '300',
    },
});

export function LoginScreen({ lang, onToggleLang, onBack, onSignup, onSuccess }: Props) {
    const t     = translations[lang];
    const isRTL = lang === 'ar';

    const [method,  setMethod]  = useState<LoginMethod>('email');
    const [form,    setForm]    = useState({ credential: '', password: '' });
    const [errors,  setErrors]  = useState<FieldErrors<FormField>>({});
    const [loading, setLoading] = useState(false);
    const [apiErr,  setApiErr]  = useState('');
    const [banner,  setBanner]  = useState('');

    const slideAnim = useRef(new Animated.Value(0)).current;

    const switchMethod = (m: LoginMethod) => {
        if (m === method) return;
        Animated.timing(slideAnim, {
            toValue: m === 'email' ? 0 : 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
        setMethod(m);
        setForm({ credential: '', password: '' });
        setErrors({});
        setApiErr('');
    };

    const pillLeft = slideAnim.interpolate({
        inputRange:  [0, 1],
        outputRange: ['2%', '50%'],
    });

    const set = useCallback(
        (k: FormField) => (v: string) => {
            setForm(p => ({ ...p, [k]: v }));
            setErrors(p => ({ ...p, [k]: undefined }));
            setApiErr('');
        },
        []
    );

    const headerY = useRef(new Animated.Value(-20)).current;
    const headerO = useRef(new Animated.Value(0)).current;
    const bodyY   = useRef(new Animated.Value(24)).current;
    const bodyO   = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(headerY, { toValue: 0, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(headerO, { toValue: 1, duration: 420, useNativeDriver: true }),
            Animated.timing(bodyY,   { toValue: 0, duration: 480, delay: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(bodyO,   { toValue: 1, duration: 480, delay: 80, useNativeDriver: true }),
        ]).start();
    }, [headerY, headerO, bodyY, bodyO]);

    function validate(): boolean {
        const e: FieldErrors<FormField> = {};
        if (method === 'email') {
            if (!Validators.email(form.credential))
                e.credential = lang === 'fr' ? 'Email invalide' : 'بريد إلكتروني غير صالح';
        } else {
            if (!Validators.phone(form.credential))
                e.credential = lang === 'fr' ? 'Numéro de téléphone invalide' : 'رقم الهاتف غير صالح';
        }
        if (!Validators.password(form.password))
            e.password = lang === 'fr' ? 'Minimum 8 caractères' : 'الحد الأدنى 8 أحرف';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleLogin() {
        if (!validate()) return;
        setLoading(true);
        setApiErr('');
        try {
            const payload = method === 'email'
                ? { email: form.credential.trim(), password: form.password }
                : { phone: form.credential.trim(), password: form.password };
            const res = await authApi.login(payload);
            await TokenStorage.save(res);
            setBanner(lang === 'fr' ? '✓ Connexion réussie !' : '✓ تم تسجيل الدخول بنجاح!');
            setTimeout(() => onSuccess(res), 800);
        } catch (err: any) {
            setApiErr(err.message || (lang === 'fr' ? 'Erreur de connexion' : 'خطأ في الاتصال'));
        } finally {
            setLoading(false);
        }
    }

    const credentialLabel = method === 'email'
        ? (lang === 'fr' ? 'Adresse e-mail' : 'البريد الإلكتروني')
        : (lang === 'fr' ? 'Numéro de téléphone' : 'رقم الهاتف');
    const credentialPlaceholder = method === 'email' ? 'exemple@mail.com' : '+212 6XX XXX XXX';

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

                <Animated.View style={{ opacity: headerO, transform: [{ translateY: headerY }] }}>
                    <View style={s.header}>
                        <View style={[s.navRow, isRTL && s.navRowRTL]}>
                            <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
                                <Text style={s.backArrow}>{isRTL ? '→' : '←'}</Text>
                            </TouchableOpacity>
                            <View style={s.logoCenter}>
                                <Image
                                    source={require('../../assets/main-logo.png')}
                                    style={s.heroLogo}
                                    resizeMode="contain"
                                />
                            </View>
                            <TouchableOpacity style={s.langPill} onPress={onToggleLang} activeOpacity={0.75}>
                                <Text style={s.langText}>{t.langBtn}</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={s.title}>{t.loginTitle}</Text>
                        <Text style={s.sub}>{t.loginSub}</Text>
                    </View>
                </Animated.View>

                <ScrollView
                    style={s.scroll}
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <Animated.View style={[s.body, { opacity: bodyO, transform: [{ translateY: bodyY }] }]}>
                        {!!banner && <View style={s.banner}><Text style={s.bannerText}>{banner}</Text></View>}
                        {!!apiErr && <View style={s.errorBanner}><Text style={s.errorBannerText}>⚠ {apiErr}</Text></View>}

                        <View style={s.toggleTrack}>
                            <Animated.View style={[s.togglePill, { left: pillLeft }]} />
                            <TouchableOpacity style={s.toggleOption} onPress={() => switchMethod('email')} activeOpacity={0.8}>
                                <Text style={[s.toggleText, method === 'email' && s.toggleTextActive]}>{lang === 'fr' ? 'E-mail' : 'البريد'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.toggleOption} onPress={() => switchMethod('phone')} activeOpacity={0.8}>
                                <Text style={[s.toggleText, method === 'phone' && s.toggleTextActive]}>{lang === 'fr' ? 'Téléphone' : 'الهاتف'}</Text>
                            </TouchableOpacity>
                        </View>

                        <Field
                            label={credentialLabel}
                            placeholder={credentialPlaceholder}
                            value={form.credential}
                            onChangeText={set('credential')}
                            keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
                            autoComplete={method === 'email' ? 'email' : 'tel'}
                            error={errors.credential}
                            isRTL={isRTL}
                        />

                        <View style={s.passwordBlock}>
                            <Field
                                label={t.password}
                                placeholder="••••••••"
                                value={form.password}
                                onChangeText={set('password')}
                                secureTextEntry
                                autoComplete="password"
                                error={errors.password}
                                isRTL={isRTL}
                            />
                            <TouchableOpacity style={isRTL ? s.forgotBtnRTL : s.forgotBtn} activeOpacity={0.7}>
                                <Text style={s.forgotText}>{t.forgotPwd}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity activeOpacity={0.88} onPress={handleLogin} disabled={loading} style={s.submitBtn}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>{t.loginBtn}</Text>}
                        </TouchableOpacity>

                        <View style={s.divider}>
                            <View style={s.dividerLine} />
                            <Text style={s.dividerText}>{t.or}</Text>
                            <View style={s.dividerLine} />
                        </View>

                        <View style={[s.switchRow, isRTL && s.switchRowRTL]}>
                            <Text style={s.switchHint}>{t.noAccount} </Text>
                            <TouchableOpacity onPress={onSignup} activeOpacity={0.7}>
                                <Text style={s.switchLink}>{t.registerLink}</Text>
                            </TouchableOpacity>
                        </View>

                        <OAuthButtons
                            onSuccess={async (res) => {
                                await TokenStorage.save(res);
                                setBanner(lang === 'fr' ? '✓ Connexion réussie !' : '✓ تم تسجيل الدخول بنجاح!');
                                setTimeout(() => onSuccess(res), 800);
                            }}
                            onError={(msg) => setApiErr(msg)}
                            lang={lang}
                        />

                        <MarketingMessages rtl={isRTL} />
                    </Animated.View>
                </ScrollView>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root:             { flex: 1, backgroundColor: '#fff' },
    flex:             { flex: 1 },
    header:           { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F3F6', gap: 4 },
    navRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navRowRTL:        { flexDirection: 'row-reverse' },
    backBtn:          { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
    backArrow:        { fontSize: 20, color: '#1A1D23', lineHeight: 24 },
    logoCenter:       { alignItems: 'center', justifyContent: 'center' },
    heroLogo:         { width: 90, height: 90 },
    langPill:         { backgroundColor: '#F4F5F7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    langText:         { color: '#374151', fontSize: 12, fontWeight: '700' },
    title:            { fontSize: 18, fontWeight: '700', color: '#1A1D23', textAlign: 'center', letterSpacing: -0.3, marginTop: 2 },
    sub:              { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 1, marginBottom: 2 },
    scroll:           { flex: 1 },
    scrollContent:    { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
    body:             { gap: 12 },
    banner:           { backgroundColor: '#D1FAE5', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#6EE7B7' },
    bannerText:       { color: '#065F46', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    errorBanner:      { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
    errorBannerText:  { color: '#991B1B', fontSize: 13, textAlign: 'center' },
    toggleTrack:      { flexDirection: 'row', backgroundColor: '#F4F5F7', borderRadius: 14, padding: 4, position: 'relative', height: 50 },
    togglePill:       { position: 'absolute', top: 4, width: '48%', height: 42, backgroundColor: '#fff', borderRadius: 11, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    toggleOption:     { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    toggleText:       { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    toggleTextActive: { color: '#1A1D23' },
    passwordBlock:    { gap: 6 },
    forgotBtn:        { alignSelf: 'flex-end', marginTop: 2 },
    forgotBtnRTL:     { alignSelf: 'flex-start', marginTop: 2 },
    forgotText:       { fontSize: 12, color: C.orange, fontWeight: '600' },
    submitBtn:        { borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: C.orange, shadowColor: C.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6 },
    submitText:       { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
    divider:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
    dividerLine:      { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText:      { fontSize: 12, color: '#9CA3AF' },
    switchRow:        { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    switchRowRTL:     { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    switchHint:       { fontSize: 13, color: '#9CA3AF' },
    switchLink:       { fontSize: 13, fontWeight: '700', color: C.orange },
});
