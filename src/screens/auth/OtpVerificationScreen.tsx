import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
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
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants';
import { Lang } from '../../i18n';
import { authApi } from '../../../../../Desktop/BricoProApp/src/api/auth.ts';

interface Props {
    lang:      Lang;
    userId:    number;
    email:     string;
    onSuccess: () => void;
    onBack:    () => void;
}

const CODE_LENGTH    = 6;
const EXPIRY_SECONDS = 600;

function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain || local.length < 2) return email;
    return local.slice(0, 2) + '*'.repeat(Math.min(local.length - 2, 4)) + '@' + domain;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export function OtpVerificationScreen({ lang, userId, email, onSuccess, onBack }: Props) {
    const isFr  = lang === 'fr';
    const isRTL = lang === 'ar';

    const [digits,    setDigits]    = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [loading,   setLoading]   = useState(false);
    const [resending, setResending] = useState(false);
    const [apiErr,    setApiErr]    = useState('');
    const [banner,    setBanner]    = useState('');
    const [expiry,    setExpiry]    = useState(EXPIRY_SECONDS);

    const inputRefs = useRef<(TextInput | null)[]>(Array(CODE_LENGTH).fill(null));

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

    useEffect(() => {
        if (expiry <= 0) return;
        const t = setTimeout(() => setExpiry(e => e - 1), 1000);
        return () => clearTimeout(t);
    }, [expiry]);

    const shake = useRef(new Animated.Value(0)).current;
    const triggerShake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shake, { toValue: 8,  duration: 55, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 5,  duration: 55, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0,  duration: 55, useNativeDriver: true }),
        ]).start();
    }, [shake]);

    function handleChange(raw: string, index: number) {
        const digit = raw.replace(/\D/g, '').slice(-1);
        const next  = [...digits];
        next[index] = digit;
        setDigits(next);
        setApiErr('');
        if (digit && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    }

    function handleKeyPress(key: string, index: number) {
        if (key === 'Backspace' && !digits[index] && index > 0) {
            const next = [...digits];
            next[index - 1] = '';
            setDigits(next);
            inputRefs.current[index - 1]?.focus();
        }
    }

    async function handleVerify() {
        const code = digits.join('');
        if (code.length < CODE_LENGTH) {
            setApiErr(isFr ? 'Veuillez saisir les 6 chiffres' : 'الرجاء إدخال الرمز كاملاً');
            triggerShake();
            return;
        }
        setLoading(true);
        setApiErr('');
        try {
            await authApi.verifyOtp({ userId, code });
            setBanner(isFr ? '✓ Compte vérifié !' : '✓ تم التحقق من حسابك!');
            setTimeout(() => onSuccess(), 900);
        } catch (err: any) {
            setApiErr(err.message || (isFr ? 'Code invalide ou expiré' : 'الرمز غير صالح أو منتهي الصلاحية'));
            triggerShake();
            setDigits(Array(CODE_LENGTH).fill(''));
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        if (resending) return;
        setResending(true);
        setApiErr('');
        try {
            await authApi.resendOtp({ userId });
            setExpiry(EXPIRY_SECONDS);
            setDigits(Array(CODE_LENGTH).fill(''));
            setBanner(isFr ? '✓ Nouveau code envoyé' : '✓ تم إرسال رمز جديد');
            setTimeout(() => setBanner(''), 3000);
            setTimeout(() => inputRefs.current[0]?.focus(), 300);
        } catch {
            setApiErr(isFr ? "Erreur lors de l'envoi" : 'خطأ في الإرسال');
        } finally {
            setResending(false);
        }
    }

    const masked  = maskEmail(email);
    const expired = expiry <= 0;

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={C.dark} />
            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

                <Animated.View style={{ opacity: headerO, transform: [{ translateY: headerY }] }}>
                    <LinearGradient colors={[C.dark, '#1C1B2E']} style={s.header}>
                        <TouchableOpacity
                            style={[s.backBtn, isRTL && s.backBtnRTL]}
                            onPress={onBack}
                            activeOpacity={0.7}>
                            <Text style={s.backText}>{isRTL ? '›' : '‹'}</Text>
                        </TouchableOpacity>

                        <View style={s.iconCircle}>
                            <Text style={s.iconEmoji}>📧</Text>
                        </View>

                        <Text style={s.title}>
                            {isFr ? 'Vérification' : 'التحقق'}
                        </Text>

                        <Text style={[s.sub, isRTL && s.subRTL]}>
                            {isFr ? `Code envoyé à ${masked}` : `تم إرسال الرمز إلى ${masked}`}
                        </Text>
                    </LinearGradient>
                </Animated.View>

                <ScrollView
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <Animated.View style={[s.body, { opacity: bodyO, transform: [{ translateY: bodyY }] }]}>

                        {!!banner && (
                            <View style={s.banner}>
                                <Text style={s.bannerText}>{banner}</Text>
                            </View>
                        )}
                        {!!apiErr && (
                            <View style={s.errorBanner}>
                                <Text style={s.errorBannerText}>⚠ {apiErr}</Text>
                            </View>
                        )}

                        <View style={s.expiryRow}>
                            {expired
                                ? <Text style={s.expiryExpired}>
                                    {isFr ? '⏱ Code expiré' : '⏱ انتهت صلاحية الرمز'}
                                  </Text>
                                : <Text style={s.expiryText}>
                                    {isFr
                                        ? `⏱ Code valable encore ${formatTime(expiry)}`
                                        : `⏱ الرمز صالح لمدة ${formatTime(expiry)}`}
                                  </Text>
                            }
                        </View>

                        <Text style={[s.hint, isRTL && s.hintRTL]}>
                            {isFr
                                ? 'Saisissez le code à 6 chiffres reçu par e-mail'
                                : 'أدخل الرمز المكوّن من 6 أرقام المُرسَل إلى بريدك'}
                        </Text>

                        <Animated.View
                            style={[
                                s.boxRow,
                                isRTL && s.boxRowRTL,
                                { transform: [{ translateX: shake }] },
                            ]}>
                            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                                const filled = !!digits[i];
                                const hasErr = !!apiErr;
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            s.box,
                                            filled && s.boxFilled,
                                            hasErr && s.boxError,
                                            filled && !hasErr && s.boxSuccess,
                                        ]}>
                                        <TextInput
                                            ref={r => { inputRefs.current[i] = r; }}
                                            style={s.boxInput}
                                            value={digits[i]}
                                            onChangeText={v => handleChange(v, i)}
                                            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            selectTextOnFocus
                                            textAlign="center"
                                            autoFocus={i === 0}
                                            caretHidden
                                        />
                                    </View>
                                );
                            })}
                        </Animated.View>

                        <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={handleVerify}
                            disabled={loading}>
                            <LinearGradient
                                colors={[C.orange, C.red]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={s.submitBtn}>
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={s.submitText}>
                                        {isFr ? 'Vérifier mon compte' : 'تحقق من حسابي'}
                                      </Text>
                                }
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={[s.resendRow, isRTL && s.resendRowRTL]}>
                            <Text style={s.resendHint}>
                                {isFr ? 'Code non reçu ? ' : 'لم تستلم الرمز؟ '}
                            </Text>
                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={resending}
                                activeOpacity={0.7}>
                                <Text style={s.resendLink}>
                                    {resending
                                        ? (isFr ? 'Envoi…' : 'جارٍ الإرسال…')
                                        : (isFr ? 'Renvoyer' : 'إعادة إرسال')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[s.spamNote, isRTL && s.spamNoteRTL]}>
                            {isFr
                                ? "💡 Vérifiez aussi vos spams si vous ne trouvez pas l'e-mail"
                                : '💡 تحقق من مجلد البريد غير المرغوب إذا لم تجد الرسالة'}
                        </Text>

                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root:            { flex: 1, backgroundColor: C.bg },
    flex:            { flex: 1 },
    header:          { paddingTop: 16, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center', gap: 8, position: 'relative' },
    backBtn:         { position: 'absolute', left: 16, top: 16, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    backBtnRTL:      { left: undefined, right: 16 },
    backText:        { color: '#fff', fontSize: 24, lineHeight: 28 },
    iconCircle:      { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    iconEmoji:       { fontSize: 26 },
    title:           { fontSize: 20, fontWeight: '700', color: '#fff' },
    sub:             { fontSize: 13, color: C.purple, textAlign: 'center', lineHeight: 20 },
    subRTL:          { textAlign: 'center' },
    scroll:          { flexGrow: 1 },
    body:            { padding: 24, gap: 20, alignItems: 'center' },
    banner:          { width: '100%', backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#6EE7B7' },
    bannerText:      { color: '#065F46', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    errorBanner:     { width: '100%', backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FECACA' },
    errorBannerText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },
    expiryRow:       { width: '100%', alignItems: 'center' },
    expiryText:      { fontSize: 13, color: C.textMuted, fontWeight: '600' },
    expiryExpired:   { fontSize: 13, color: '#EF4444', fontWeight: '600' },
    hint:            { fontSize: 13, color: C.textMuted, textAlign: 'center' },
    hintRTL:         { textAlign: 'center' },
    boxRow:          { flexDirection: 'row', gap: 10, justifyContent: 'center' },
    boxRowRTL:       { flexDirection: 'row-reverse' },
    box: {
        width: 46, height: 56, borderRadius: 14,
        borderWidth: 1.5, borderColor: '#E5E7EB',
        backgroundColor: C.white,
        alignItems: 'center', justifyContent: 'center',
    },
    boxFilled:    { borderColor: C.purpleMid, backgroundColor: '#EEF2FF' },
    boxSuccess:   { borderColor: '#10B981',   backgroundColor: '#D1FAE5' },
    boxError:     { borderColor: '#EF4444',   backgroundColor: '#FEF2F2' },
    boxInput:     { width: '100%', height: '100%', fontSize: 22, fontWeight: '700', color: C.textDark, textAlign: 'center', padding: 0 },
    submitBtn:    { borderRadius: 16, paddingVertical: 16, alignItems: 'center', elevation: 8, width: 280 },
    submitText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
    resendRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
    resendRowRTL: { flexDirection: 'row-reverse' },
    resendHint:   { fontSize: 13, color: C.textFaint },
    resendLink:   { fontSize: 13, color: C.purpleMid, fontWeight: '700' },
    spamNote:     { fontSize: 11, color: C.textFaint, textAlign: 'center', paddingHorizontal: 16, lineHeight: 17 },
    spamNoteRTL:  { textAlign: 'center' },
});