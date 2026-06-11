import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants';
import { Lang, translations, Translations } from '../../i18n';
import { authApi } from '../../api/auth.ts';
import { Validators, FieldErrors } from '../../utils/validation.ts';
import { OAuthButtons } from './OAuthButtons';
import { TokenStorage } from '../../storage/token.ts';

type Role    = 'CLIENT' | 'WORKER';
type Step    = 0 | 1 | 2;
type FormKey = 'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'confirm';

interface Props {
    lang: Lang;
    onToggleLang: () => void;
    onBack: () => void;
    onLogin: () => void;
    onSuccess?: (userId: number, email: string, password: string) => void;
    initialRole?: Role;
}

function useFocusAnim() {
    const anim = useRef(new Animated.Value(0)).current;
    const onFocus = () => Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    const onBlur  = () => Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    return { anim, onFocus, onBlur };
}

function useShake(error?: string) {
    const shake = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (error) {
            Animated.sequence([
                Animated.timing(shake, { toValue: 8,  duration: 50, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 4,  duration: 50, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 0,  duration: 50, useNativeDriver: true }),
            ]).start();
        }
    }, [error, shake]);
    return shake;
}

function Field({
                   label, placeholder, value, onChangeText,
                   secure = false, kb = 'default' as any,
                   rtl = false, error, icon,
               }: {
    label: string; placeholder: string; value: string;
    onChangeText: (v: string) => void;
    secure?: boolean; kb?: any; rtl?: boolean; error?: string; icon?: string;
}) {
    const { anim, onFocus, onBlur } = useFocusAnim();
    const shake  = useShake(error);
    const border = anim.interpolate({ inputRange: [0, 1], outputRange: [error ? '#EF4444' : '#E4E7EC', error ? '#EF4444' : C.orange] });
    return (
        <Animated.View style={[fi.wrap, { transform: [{ translateX: shake }] }]}>
            <Text style={[fi.label, rtl && fi.rtl]}>{label}</Text>
            <Animated.View style={[fi.outer, { borderColor: border }]}>
                {icon ? <Text style={[fi.icon, rtl && fi.iconRTL]}>{icon}</Text> : null}
                <TextInput
                    style={[fi.input, rtl && fi.inputRTL, icon && fi.inputIcon]}
                    placeholder={placeholder}
                    placeholderTextColor="#BEC5D1"
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    secureTextEntry={secure}
                    keyboardType={kb}
                    autoCapitalize="none"
                    textAlign={rtl ? 'right' : 'left'}
                />
            </Animated.View>
            {!!error && <Text style={[fi.err, rtl && fi.rtl]}>{error}</Text>}
        </Animated.View>
    );
}

const fi = StyleSheet.create({
    wrap:      { gap: 6 },
    label:     { fontSize: 11, fontWeight: '700', color: '#8891A5', letterSpacing: 0.5, textTransform: 'uppercase' },
    rtl:       { textAlign: 'right' },
    outer:     { borderWidth: 1.5, borderRadius: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFBFC' },
    icon:      { paddingLeft: 14, fontSize: 16 },
    iconRTL:   { paddingLeft: 0, paddingRight: 14 },
    input:     { flex: 1, paddingVertical: 14, paddingHorizontal: 14, fontSize: 15, color: '#0D1117', fontWeight: '500' },
    inputIcon: { paddingLeft: 8 },
    inputRTL:  { textAlign: 'right' },
    err:       { fontSize: 11, color: '#EF4444', marginTop: 2, fontWeight: '500' },
});

function PwdHint({ password, confirm, rtl, fr }: { password: string; confirm: string; rtl: boolean; fr: boolean }) {
    const rules = [
        { ok: password.length >= 8,                       label: fr ? 'Au moins 8 caractères'    : '8 أحرف على الأقل'       },
        { ok: /[A-Z]/.test(password),                     label: fr ? 'Une majuscule'             : 'حرف كبير'               },
        { ok: /[0-9]/.test(password),                     label: fr ? 'Un chiffre'                : 'رقم واحد'               },
        { ok: confirm.length > 0 && confirm === password, label: fr ? 'Mots de passe identiques' : 'كلمتا المرور متطابقتان' },
    ];
    if (!password && !confirm) return null;
    return (
        <View style={pw.wrap}>
            {rules.map((r, i) => (
                <View key={i} style={[pw.row, rtl && pw.rowRTL]}>
                    <View style={[pw.dot, r.ok ? pw.dotOk : pw.dotOff]} />
                    <Text style={[pw.label, r.ok ? pw.labelOk : pw.labelOff]}>{r.label}</Text>
                </View>
            ))}
        </View>
    );
}

const pw = StyleSheet.create({
    wrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    row:      { flexDirection: 'row', alignItems: 'center', gap: 6, width: '48%' },
    rowRTL:   { flexDirection: 'row-reverse' },
    dot:      { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
    dotOk:    { backgroundColor: '#10B981' },
    dotOff:   { backgroundColor: '#D1D5DB' },
    label:    { fontSize: 11, flex: 1 },
    labelOk:  { color: '#059669', fontWeight: '600' },
    labelOff: { color: '#9CA3AF' },
});

function StepBar({ step, fr }: { step: Step; fr: boolean }) {
    const anim0 = useRef(new Animated.Value(1)).current;
    const anim1 = useRef(new Animated.Value(0)).current;
    const anim2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        [anim0, anim1, anim2].forEach((a, i) =>
            Animated.timing(a, {
                toValue: i <= step ? 1 : 0,
                duration: 320,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            }).start()
        );
    }, [step, anim0, anim1, anim2]);

    const labels = fr
        ? ['Identité', 'Contact', 'Sécurité']
        : ['الهوية', 'التواصل', 'الأمان'];

    return (
        <View style={sb.wrap}>
            <View style={sb.bars}>
                {([anim0, anim1, anim2] as Animated.Value[]).map((a, i) => (
                    <View key={i} style={sb.track}>
                        <Animated.View
                            style={[
                                sb.fill,
                                i < step ? sb.fillDone : sb.fillActive,
                                { width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                            ]}
                        />
                    </View>
                ))}
            </View>
            <View style={sb.labels}>
                {labels.map((l, i) => (
                    <Text key={i} style={[sb.lab, i === step && sb.labActive, i < step && sb.labDone]}>
                        {l}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const sb = StyleSheet.create({
    wrap:       { gap: 8 },
    bars:       { flexDirection: 'row', gap: 6 },
    track:      { flex: 1, height: 3, backgroundColor: '#EEF0F4', borderRadius: 2, overflow: 'hidden' },
    fill:       { height: '100%', borderRadius: 2 },
    fillDone:   { backgroundColor: '#10B981' },
    fillActive: { backgroundColor: C.orange },
    labels:     { flexDirection: 'row' },
    lab:        { flex: 1, textAlign: 'center', fontSize: 10, color: '#C4C9D4', fontWeight: '500' },
    labActive:  { color: C.orange, fontWeight: '700' },
    labDone:    { color: '#10B981', fontWeight: '600' },
});

const MarketingMessages = ({ fr, rtl }: { fr: boolean; rtl: boolean }) => {
    const messages = [
        { ar: 'خدمات احترافية', fr: 'Services professionnels', icon: '🔧' },
        { ar: 'موثوق وآمن', fr: 'Fiable et sécurisé', icon: '✅' },
        { ar: 'دعم 24/7', fr: 'Support 24/7', icon: '💬' },
    ];

    const animations = messages.map(() => ({
        opacity: useRef(new Animated.Value(0)).current,
        translateY: useRef(new Animated.Value(12)).current,
        iconScale: useRef(new Animated.Value(0.8)).current,
    }));

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
    }, [animations]);

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
        marginTop: 16,
        marginBottom: 8,
        gap: 12,
        alignItems: 'center',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F9FAFB',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#F0F3F6',
    },
    messageRowRtl: {
        flexDirection: 'row-reverse',
    },
    icon: {
        fontSize: 20,
    },
    textAr: {
        fontSize: 13,
        fontWeight: '700',
        color: C.orange,
    },
    textFr: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    dot: {
        fontSize: 14,
        color: '#D1D5DB',
        fontWeight: '300',
    },
});

export default function SignupScreen({
                                         lang, onToggleLang, onBack, onLogin, onSuccess, initialRole = 'CLIENT',
                                     }: Props) {
    const t   = translations[lang] as Translations;
    const rtl = lang === 'ar';
    const fr  = lang === 'fr';

    const [role, setRole]       = useState<Role>(initialRole);
    const [step, setStep]       = useState<Step>(0);
    const [form, setForm]       = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });
    const [errors, setErrors]   = useState<FieldErrors<FormKey>>({});
    const [loading, setLoading] = useState(false);
    const [apiErr, setApiErr]   = useState('');
    const [banner, setBanner]   = useState('');

    const slideX    = useRef(new Animated.Value(0)).current;
    const slideO    = useRef(new Animated.Value(1)).current;
    const roleSlide = useRef(new Animated.Value(initialRole === 'CLIENT' ? 0 : 1)).current;

    const pillLeft = roleSlide.interpolate({ inputRange: [0, 1], outputRange: ['2%', '50%'] });

    const switchRole = (r: Role) => {
        if (r === role) return;
        Animated.timing(roleSlide, {
            toValue: r === 'CLIENT' ? 0 : 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
        setRole(r);
    };

    const set = useCallback((k: keyof typeof form) => (v: string) => {
        setForm(p => ({ ...p, [k]: v }));
        setErrors(p => ({ ...p, [k]: undefined }));
        setApiErr('');
    }, []);

    const validate = (): boolean => {
        const e: FieldErrors<FormKey> = {};
        if (step === 0) {
            if (!Validators.name(form.firstName)) e.firstName = fr ? 'Minimum 2 caractères' : 'حرفان على الأقل';
            if (!Validators.name(form.lastName))  e.lastName  = fr ? 'Minimum 2 caractères' : 'حرفان على الأقل';
        } else if (step === 1) {
            if (!Validators.email(form.email)) e.email = fr ? 'Email invalide' : 'بريد إلكتروني غير صالح';
            if (form.phone && !Validators.phone(form.phone))
                e.phone = fr ? 'Téléphone invalide (+212 ou 0[5-7]XXXXXXXX)' : 'رقم هاتف غير صالح';
        } else {
            if (!Validators.password(form.password))
                e.password = fr ? 'Minimum 8 caractères' : 'الحد الأدنى 8 أحرف';
            if (form.confirm !== form.password)
                e.confirm = fr ? 'Les mots de passe ne correspondent pas' : 'كلمتا المرور غير متطابقتان';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const animStep = (next: Step, dir: 'fwd' | 'bck') => {
        const W = Dimensions.get('window').width;
        const exit  = dir === 'fwd' ? -(W * 0.28) : W * 0.28;
        const enter = dir === 'fwd' ?   W * 0.28  : -(W * 0.28);
        Animated.parallel([
            Animated.timing(slideO, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
            Animated.timing(slideX, { toValue: exit, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => {
            setStep(next);
            slideX.setValue(enter);
            Animated.parallel([
                Animated.timing(slideO, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.spring(slideX,  { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
            ]).start();
        });
    };

    const goNext = () => { if (validate()) animStep((step + 1) as Step, 'fwd'); };
    const goPrev = () => { if (step > 0)  animStep((step - 1) as Step, 'bck'); };

    async function handleRegister() {
        if (!validate()) return;
        setLoading(true);
        setApiErr('');
        try {
            const res = await authApi.register({
                firstName: form.firstName.trim(),
                lastName:  form.lastName.trim(),
                email:     form.email.trim(),
                phone:     form.phone.trim() || undefined,
                password:  form.password,
                role,
            });
            setBanner(fr ? '✓ Compte créé avec succès !' : '✓ تم إنشاء الحساب بنجاح!');
            setTimeout(() => onSuccess?.(res.userId, form.email.trim(), form.password), 800);
        } catch (err: any) {
            setApiErr(err.message || (fr ? "Erreur lors de l'inscription" : 'خطأ في التسجيل'));
        } finally {
            setLoading(false);
        }
    }

    const mountY = useRef(new Animated.Value(20)).current;
    const mountO = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(mountY, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(mountO, { toValue: 1, duration: 380, useNativeDriver: true }),
        ]).start();
    }, [mountO, mountY]);

    const titles = fr
        ? ['Vos informations', 'Coordonnées', 'Sécurité']
        : ['معلوماتك', 'بيانات التواصل', 'الأمان'];

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

                <View style={s.nav}>
                    <View style={[s.navRow, rtl && s.rtlRow]}>
                        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
                            <Text style={s.backArrow}>{rtl ? '→' : '←'}</Text>
                        </TouchableOpacity>
                        <View style={s.logoCenter}>
                            <Image source={require('../../assets/main-logo.png')} style={s.heroLogo} resizeMode="contain" />
                        </View>
                        <TouchableOpacity style={s.langPill} onPress={onToggleLang} activeOpacity={0.75}>
                            <Text style={s.langText}>{t.langBtn}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={s.navTitle}>{titles[step]}</Text>
                    <StepBar step={step} fr={fr} />
                </View>

                <View style={s.content}>
                    {!!banner && (
                        <View style={s.bannerOk}>
                            <Text style={s.bannerOkText}>{banner}</Text>
                        </View>
                    )}
                    {!!apiErr && (
                        <View style={s.bannerErr}>
                            <Text style={s.bannerErrText}>⚠  {apiErr}</Text>
                        </View>
                    )}

                    <Animated.View style={[s.stepWrap, { opacity: slideO, transform: [{ translateX: slideX }] }]}>
                        {step === 0 && (
                            <>
                                <View style={s.roleTrack}>
                                    <Animated.View style={[s.rolePill, { left: pillLeft }]} />
                                    <TouchableOpacity style={s.roleOpt} onPress={() => switchRole('CLIENT')} activeOpacity={0.8}>
                                        <Text style={[s.roleText, role === 'CLIENT' && s.roleTextOn]}>
                                            {fr ? '🔍 Client' : '🔍 عميل'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.roleOpt} onPress={() => switchRole('WORKER')} activeOpacity={0.8}>
                                        <Text style={[s.roleText, role === 'WORKER' && s.roleTextOn]}>
                                            {fr ? '🔧 Artisan' : '🔧 حرفي'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[s.twoCol, rtl && s.rtlRow]}>
                                    <View style={s.col}>
                                        <Field
                                            label={t.firstName}
                                            placeholder={t.firstName}
                                            value={form.firstName}
                                            onChangeText={set('firstName')}
                                            rtl={rtl}
                                            error={errors.firstName}
                                            icon="👤"
                                        />
                                    </View>
                                    <View style={s.col}>
                                        <Field
                                            label={t.lastName}
                                            placeholder={t.lastName}
                                            value={form.lastName}
                                            onChangeText={set('lastName')}
                                            rtl={rtl}
                                            error={errors.lastName}
                                            icon="👤"
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {step === 1 && (
                            <>
                                <Field
                                    label={t.email}
                                    placeholder="exemple@mail.com"
                                    value={form.email}
                                    onChangeText={set('email')}
                                    kb="email-address"
                                    rtl={rtl}
                                    error={errors.email}
                                    icon="✉️"
                                />
                                <Field
                                    label={t.phone}
                                    placeholder="+212 6XX XXX XXX"
                                    value={form.phone}
                                    onChangeText={set('phone')}
                                    kb="phone-pad"
                                    rtl={rtl}
                                    error={errors.phone}
                                    icon="📱"
                                />
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Field
                                    label={t.pwd}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChangeText={set('password')}
                                    secure
                                    rtl={rtl}
                                    error={errors.password}
                                    icon="🔒"
                                />
                                <Field
                                    label={t.confirmPwd}
                                    placeholder="••••••••"
                                    value={form.confirm}
                                    onChangeText={set('confirm')}
                                    secure
                                    rtl={rtl}
                                    error={errors.confirm}
                                    icon="🔒"
                                />
                                <PwdHint password={form.password} confirm={form.confirm} rtl={rtl} fr={fr} />
                            </>
                        )}
                    </Animated.View>

                    <View style={[s.btnRow, step === 0 && s.btnRowSingle]}>
                        {step > 0 && (
                            <TouchableOpacity style={s.secBtn} onPress={goPrev} activeOpacity={0.8}>
                                <Text style={s.secBtnText}>{fr ? 'Retour' : 'رجوع'}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[s.priBtn, step === 0 && s.priBtnFull, loading && s.priBtnLoading]}
                            onPress={step === 2 ? handleRegister : goNext}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={s.priBtnText}>
                                    {step === 2
                                        ? (fr ? 'Créer mon compte' : 'إنشاء حسابي')
                                        : (fr ? 'Continuer' : 'متابعة')}
                                </Text>
                            }
                        </TouchableOpacity>
                    </View>

                    <View style={[s.loginRow, rtl && s.rtlRow]}>
                        <Text style={s.loginHint}>{t.haveAccount} </Text>
                        <TouchableOpacity onPress={onLogin} activeOpacity={0.7}>
                            <Text style={s.loginLink}>{t.loginLink}</Text>
                        </TouchableOpacity>
                    </View>

                    <OAuthButtons
                        onSuccess={async (res) => {
                            await TokenStorage.save(res);
                            setBanner(fr ? '✓ Connexion réussie !' : '✓ تم تسجيل الدخول بنجاح!');
                            setTimeout(() => onSuccess?.(res.userId, form.email.trim(), form.password), 800);
                        }}
                        onError={(msg) => setApiErr(msg)}
                        lang={lang}
                    />

                    <MarketingMessages fr={fr} rtl={rtl} />

                    <View style={s.decorFooter}>
                        <View style={s.decorLine} />
                        <View style={s.decorDotGroup}>
                            <View style={[s.decorDot, s.decorDotSmall]} />
                            <View style={[s.decorDot, s.decorDotMedium]} />
                            <View style={[s.decorDot, s.decorDotLarge, { backgroundColor: C.orange }]} />
                            <View style={[s.decorDot, s.decorDotMedium]} />
                            <View style={[s.decorDot, s.decorDotSmall]} />
                        </View>
                        <Text style={s.decorBrand}>BricoPro</Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    flex: { flex: 1 },

    nav:         { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F3F6', gap: 12 },
    navRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rtlRow:      { flexDirection: 'row-reverse' },
    backBtn:     { width: 44, height: 44, borderRadius: 13, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center' },
    backArrow:   { fontSize: 20, color: '#1A1D23', lineHeight: 24 },
    logoCenter:  { alignItems: 'center', justifyContent: 'center' },
    heroLogo:    { width: 88, height: 88 },
    langPill:    { backgroundColor: '#F4F5F7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    langText:    { color: '#374151', fontSize: 12, fontWeight: '700' },

    navTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D23', textAlign: 'center', letterSpacing: -0.3 },

    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, justifyContent: 'space-between' },

    bannerOk:      { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 12 },
    bannerOkText:  { color: '#065F46', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    bannerErr:     { backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FECACA', marginBottom: 12 },
    bannerErrText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },

    stepWrap: { gap: 20 },

    roleTrack:  { flexDirection: 'row', backgroundColor: '#F4F5F7', borderRadius: 14, padding: 4, position: 'relative', height: 50 },
    rolePill:   { position: 'absolute', top: 4, width: '48%', height: 42, backgroundColor: '#fff', borderRadius: 11, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    roleOpt:    { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    roleText:   { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    roleTextOn: { color: '#1A1D23' },
    twoCol:     { flexDirection: 'row', gap: 12 },
    col:        { flex: 1 },

    btnRow:       { flexDirection: 'row', gap: 12, marginTop: 8 },
    btnRowSingle: { justifyContent: 'flex-end' },
    secBtn:       { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
    secBtnText:   { fontSize: 14, fontWeight: '600', color: '#64748B' },
    priBtn:       { flex: 1, height: 52, borderRadius: 14, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', shadowColor: C.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6 },
    priBtnFull:    { flex: 1 },
    priBtnLoading: { opacity: 0.75 },
    priBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

    loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
    loginHint: { fontSize: 13, color: '#9CA3AF' },
    loginLink:  { fontSize: 13, fontWeight: '700', color: C.orange },

    decorFooter:      { alignItems: 'center', marginTop: 16, gap: 8 },
    decorLine:        { width: 48, height: 2, borderRadius: 1, backgroundColor: '#F0F3F6' },
    decorDotGroup:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
    decorDot:         { borderRadius: 999 },
    decorDotSmall:    { width: 6, height: 6, backgroundColor: '#D1D5DB' },
    decorDotMedium:   { width: 8, height: 8, backgroundColor: '#9CA3AF' },
    decorDotLarge:    { width: 32, height: 4, borderRadius: 2 },
    decorBrand:       { fontSize: 10, fontWeight: '600', color: '#CBD5E1', letterSpacing: 1 },
});