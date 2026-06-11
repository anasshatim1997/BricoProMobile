import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants';
import { SERVICES } from '../../constants/services';
import { Lang } from '../../i18n';
import { useAuthFetch } from '../../hooks/useAuthFetch';

interface Props {
    lang:      Lang;
    onBack:    () => void;
    onSuccess: () => void;
}

interface FormState {
    serviceType:    string;
    title:          string;
    description:    string;
    address:        string;
    scheduledDate:  string;
    scheduledStart: string;
    budgetMin:      string;
    budgetMax:      string;
    isUrgent:       boolean;
}

interface FieldErrors {
    serviceType?:    string;
    title?:          string;
    description?:    string;
    address?:        string;
    scheduledDate?:  string;
    scheduledStart?: string;
    budgetMin?:      string;
    budgetMax?:      string;
}

function SectionCard({ children }: { children: React.ReactNode }) {
    return <View style={s.card}>{children}</View>;
}

function SectionTitle({ text, isRTL }: { text: string; isRTL: boolean }) {
    return (
        <View style={[s.cardTitleRow, isRTL && s.cardTitleRowRTL]}>
            <View style={s.cardTitleDot} />
            <Text style={[s.cardTitleText, isRTL && s.rtl]}>{text}</Text>
        </View>
    );
}

function Field({
                   label, placeholder, value, onChangeText,
                   multiline = false, keyboardType = 'default',
                   isRTL = false, error,
               }: {
    label: string; placeholder: string; value: string;
    onChangeText: (v: string) => void;
    multiline?: boolean; keyboardType?: any;
    isRTL?: boolean; error?: string;
}) {
    const anim = useRef(new Animated.Value(0)).current;
    const onFocus = () => Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    const onBlur  = () => Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start();

    const borderColor = anim.interpolate({
        inputRange:  [0, 1],
        outputRange: [error ? C.red : '#EAECF0', error ? C.red : C.purpleMid],
    });

    return (
        <View style={s.fieldWrap}>
            <Text style={[s.fieldLabel, isRTL && s.rtl]}>{label}</Text>
            <Animated.View style={[s.fieldOuter, { borderColor }]}>
                <TextInput
                    style={[s.fieldInput, multiline && s.fieldMulti, isRTL && s.fieldRTL]}
                    placeholder={placeholder}
                    placeholderTextColor="#C0C6D0"
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                    textAlign={isRTL ? 'right' : 'left'}
                    textAlignVertical={multiline ? 'top' : 'center'}
                />
            </Animated.View>
            {!!error && <Text style={[s.fieldError, isRTL && s.rtl]}>{error}</Text>}
        </View>
    );
}

export default function PostTaskScreen({ lang, onBack, onSuccess }: Props) {
    const isFr    = lang === 'fr';
    const isRTL   = lang === 'ar';
    const authFetch = useAuthFetch();

    const [form, setForm] = useState<FormState>({
        serviceType:    '',
        title:          '',
        description:    '',
        address:        '',
        scheduledDate:  '',
        scheduledStart: '',
        budgetMin:      '',
        budgetMax:      '',
        isUrgent:       false,
    });
    const [errors,  setErrors]  = useState<FieldErrors>({});
    const [loading, setLoading] = useState(false);
    const [apiErr,  setApiErr]  = useState('');
    const [banner,  setBanner]  = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const headerY = useRef(new Animated.Value(-20)).current;
    const headerO = useRef(new Animated.Value(0)).current;
    const bodyY   = useRef(new Animated.Value(24)).current;
    const bodyO   = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(headerY, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(headerO, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(bodyY,   { toValue: 0, duration: 460, delay: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(bodyO,   { toValue: 1, duration: 460, delay: 80, useNativeDriver: true }),
        ]).start();
    }, [headerY, headerO, bodyY, bodyO]);

    const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
        setForm(prev => ({ ...prev, [k]: v }));
        setErrors(prev => ({ ...prev, [k]: undefined }));
        setApiErr('');
    }, []);

    function validate(): boolean {
        const e: FieldErrors = {};
        if (!form.serviceType)
            e.serviceType = isFr ? 'Choisissez un service' : 'اختر نوع الخدمة';
        if (!form.title.trim() || form.title.trim().length < 5)
            e.title = isFr ? 'Titre trop court (min. 5 car.)' : 'العنوان قصير جداً (5 أحرف على الأقل)';
        if (!form.description.trim() || form.description.trim().length < 10)
            e.description = isFr ? 'Description trop courte (min. 10 car.)' : 'الوصف قصير جداً (10 أحرف على الأقل)';
        if (!form.address.trim())
            e.address = isFr ? 'Adresse requise' : 'العنوان مطلوب';
        if (!form.scheduledDate.trim() || !/^\d{2}\/\d{2}\/\d{4}$/.test(form.scheduledDate.trim()))
            e.scheduledDate = isFr ? 'Format: JJ/MM/AAAA' : 'الصيغة: يي/شش/سسسس';
        if (!form.scheduledStart.trim() || !/^\d{2}:\d{2}$/.test(form.scheduledStart.trim()))
            e.scheduledStart = isFr ? 'Format: HH:MM' : 'الصيغة: سس:دد';
        if (form.budgetMin && isNaN(Number(form.budgetMin)))
            e.budgetMin = isFr ? 'Nombre invalide' : 'رقم غير صالح';
        if (form.budgetMax && isNaN(Number(form.budgetMax)))
            e.budgetMax = isFr ? 'Nombre invalide' : 'رقم غير صالح';
        if (form.budgetMin && form.budgetMax && Number(form.budgetMin) > Number(form.budgetMax))
            e.budgetMax = isFr ? 'Max doit être ≥ Min' : 'الحد الأقصى يجب أن يكون ≥ الحد الأدنى';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function parseDate(str: string): string {
        const [d, m, y] = str.split('/');
        return `${y}-${m}-${d}`;
    }

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (event.type === 'dismissed') return;
        if (selectedDate) {
            const day = selectedDate.getDate().toString().padStart(2, '0');
            const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
            const year = selectedDate.getFullYear();
            set('scheduledDate', `${day}/${month}/${year}`);
        }
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (event.type === 'dismissed') return;
        if (selectedTime) {
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            set('scheduledStart', `${hours}:${minutes}`);
        }
    };

    async function handleSubmit() {
        if (!validate()) return;
        setLoading(true);
        setApiErr('');
        try {
            const session = await import('../../storage/token').then(m => m.TokenStorage.get());
            if (!session) throw new Error('Session expirée');
            const body: Record<string, unknown> = {
                serviceType:    form.serviceType,
                title:          form.title.trim(),
                description:    form.description.trim(),
                address:        form.address.trim(),
                scheduledDate:  parseDate(form.scheduledDate.trim()),
                scheduledStart: form.scheduledStart.trim() + ':00',
                isUrgent:       form.isUrgent,
            };
            if (form.budgetMin) body.budgetMin = Number(form.budgetMin);
            if (form.budgetMax) body.budgetMax = Number(form.budgetMax);

            const res = await fetch(`http://192.168.1.13:8080/api/v1/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.accessToken}`,
                },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.message || (isFr ? 'Erreur lors de la création' : 'خطأ في الإنشاء'));
            }
            setBanner(isFr ? '✓ Demande publiée avec succès !' : '✓ تم نشر الطلب بنجاح!');
            setTimeout(() => onSuccess(), 1000);
        } catch (err: any) {
            setApiErr(err.message || (isFr ? 'Une erreur est survenue' : 'حدث خطأ ما'));
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

                <Animated.View style={{ opacity: headerO, transform: [{ translateY: headerY }] }}>
                    <LinearGradient colors={['#FFFFFF', '#F8F9FC']} style={s.header}>
                        <TouchableOpacity
                            style={[s.backBtn, isRTL && s.backBtnRTL]}
                            onPress={onBack}
                            activeOpacity={0.7}
                        >
                            <Text style={s.backText}>{isRTL ? '›' : '‹'}</Text>
                        </TouchableOpacity>
                        <View style={s.headerContent}>
                            <Text style={[s.headerTitle, isRTL && s.rtl]}>
                                {isFr ? '+ Nouvelle demande' : '+ طلب جديد'}
                            </Text>
                            <Text style={[s.headerSub, isRTL && s.rtl]}>
                                {isFr ? 'Décrivez votre besoin' : 'صف احتياجك'}
                            </Text>
                        </View>
                    </LinearGradient>
                </Animated.View>

                <ScrollView
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[s.body, { opacity: bodyO, transform: [{ translateY: bodyY }] }]}>

                        {!!banner && (
                            <View style={s.bannerSuccess}>
                                <Text style={s.bannerSuccessText}>{banner}</Text>
                            </View>
                        )}
                        {!!apiErr && (
                            <View style={s.bannerError}>
                                <Text style={s.bannerErrorText}>⚠  {apiErr}</Text>
                            </View>
                        )}

                        <SectionCard>
                            <SectionTitle text={isFr ? 'Type de service' : 'نوع الخدمة'} isRTL={isRTL} />
                            {!!errors.serviceType && (
                                <Text style={[s.fieldError, isRTL && s.rtl]}>{errors.serviceType}</Text>
                            )}
                            <View style={s.pillGrid}>
                                {SERVICES.map((svc) => {
                                    const selected = form.serviceType === svc.key;
                                    return (
                                        <TouchableOpacity
                                            key={svc.key}
                                            style={[
                                                s.pill,
                                                { borderColor: svc.color + (selected ? 'FF' : '40') },
                                                selected && { backgroundColor: svc.color + '18' },
                                            ]}
                                            onPress={() => set('serviceType', svc.key)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={s.pillEmoji}>{svc.icon}</Text>
                                            <Text style={[s.pillLabel, { color: selected ? svc.color : '#6B7280' }, selected && s.pillLabelSelected]}>
                                                {isFr ? svc.fr : svc.ar}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </SectionCard>

                        <SectionCard>
                            <SectionTitle text={isFr ? 'Détails de la demande' : 'تفاصيل الطلب'} isRTL={isRTL} />
                            <Field
                                label={isFr ? 'Titre' : 'العنوان'}
                                placeholder={isFr ? 'Ex: Réparation fuite robinet cuisine' : 'مثال: إصلاح تسرب صنبور المطبخ'}
                                value={form.title}
                                onChangeText={v => set('title', v)}
                                isRTL={isRTL}
                                error={errors.title}
                            />
                            <Field
                                label={isFr ? 'Description' : 'الوصف'}
                                placeholder={isFr ? 'Décrivez votre problème en détail…' : 'صف مشكلتك بالتفصيل...'}
                                value={form.description}
                                onChangeText={v => set('description', v)}
                                multiline
                                isRTL={isRTL}
                                error={errors.description}
                            />
                        </SectionCard>

                        <SectionCard>
                            <SectionTitle text={isFr ? 'Lieu et horaire' : 'المكان والموعد'} isRTL={isRTL} />
                            <Field
                                label={isFr ? 'Adresse' : 'العنوان'}
                                placeholder={isFr ? 'Ex: 12 Rue Ibn Khaldoun, Casablanca' : 'مثال: 12 شارع ابن خلدون، الدار البيضاء'}
                                value={form.address}
                                onChangeText={v => set('address', v)}
                                isRTL={isRTL}
                                error={errors.address}
                            />
                            <View style={s.row}>
                                <View style={s.rowHalf}>
                                    <Text style={[s.fieldLabel, isRTL && s.rtl]}>{isFr ? 'Date' : 'التاريخ'}</Text>
                                    <TouchableOpacity
                                        style={[s.pickerButton, errors.scheduledDate && s.pickerButtonError]}
                                        onPress={() => setShowDatePicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[s.pickerButtonText, !form.scheduledDate && s.pickerPlaceholder]}>
                                            {form.scheduledDate || (isFr ? 'JJ/MM/AAAA' : 'يي/شش/سسسس')}
                                        </Text>
                                    </TouchableOpacity>
                                    {!!errors.scheduledDate && <Text style={[s.fieldError, isRTL && s.rtl]}>{errors.scheduledDate}</Text>}
                                </View>
                                <View style={s.rowHalf}>
                                    <Text style={[s.fieldLabel, isRTL && s.rtl]}>{isFr ? 'Heure' : 'الوقت'}</Text>
                                    <TouchableOpacity
                                        style={[s.pickerButton, errors.scheduledStart && s.pickerButtonError]}
                                        onPress={() => setShowTimePicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[s.pickerButtonText, !form.scheduledStart && s.pickerPlaceholder]}>
                                            {form.scheduledStart || (isFr ? 'HH:MM' : 'سس:دد')}
                                        </Text>
                                    </TouchableOpacity>
                                    {!!errors.scheduledStart && <Text style={[s.fieldError, isRTL && s.rtl]}>{errors.scheduledStart}</Text>}
                                </View>
                            </View>
                        </SectionCard>

                        <SectionCard>
                            <SectionTitle text={isFr ? 'Budget (optionnel)' : 'الميزانية (اختياري)'} isRTL={isRTL} />
                            <View style={s.row}>
                                <View style={s.rowHalf}>
                                    <Field
                                        label={isFr ? 'Min (MAD)' : 'الحد الأدنى (د.م.)'}
                                        placeholder="0"
                                        value={form.budgetMin}
                                        onChangeText={v => set('budgetMin', v)}
                                        keyboardType="numeric"
                                        isRTL={isRTL}
                                        error={errors.budgetMin}
                                    />
                                </View>
                                <View style={s.rowHalf}>
                                    <Field
                                        label={isFr ? 'Max (MAD)' : 'الحد الأقصى (د.م.)'}
                                        placeholder="0"
                                        value={form.budgetMax}
                                        onChangeText={v => set('budgetMax', v)}
                                        keyboardType="numeric"
                                        isRTL={isRTL}
                                        error={errors.budgetMax}
                                    />
                                </View>
                            </View>
                        </SectionCard>

                        <SectionCard>
                            <View style={[s.urgentRow, isRTL && s.urgentRowRTL]}>
                                <View style={s.urgentLeft}>
                                    <Text style={[s.urgentLabel, isRTL && s.rtl]}>
                                        {isFr ? '🔥 Demande urgente' : '🔥 طلب عاجل'}
                                    </Text>
                                    <Text style={[s.urgentSub, isRTL && s.rtl]}>
                                        {isFr ? 'Priorité maximale dans la recherche' : 'أولوية قصوى في البحث'}
                                    </Text>
                                </View>
                                <Switch
                                    value={form.isUrgent}
                                    onValueChange={v => set('isUrgent', v)}
                                    trackColor={{ false: '#E5E7EB', true: C.orange + '70' }}
                                    thumbColor={form.isUrgent ? C.orange : '#fff'}
                                />
                            </View>
                        </SectionCard>

                        <TouchableOpacity activeOpacity={0.88} onPress={handleSubmit} disabled={loading}>
                            <LinearGradient
                                colors={[C.orange, C.red]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={s.submitBtn}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={s.submitText}>
                                        {isFr ? 'Publier la demande' : 'نشر الطلب'}
                                    </Text>
                                }
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={{ height: 32 }} />
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {showDatePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onDateChange}
                />
            )}
            {showTimePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root:   { flex: 1, backgroundColor: '#F5F6FA' },
    flex:   { flex: 1 },

    header: { paddingTop: 12, paddingBottom: 22, paddingHorizontal: 24, position: 'relative', borderBottomWidth: 1, borderBottomColor: '#F0F2F5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
    backBtn: {
        position: 'absolute', left: 16, top: 14,
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#F0F2F5',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
    },
    backBtnRTL: {
        position: 'absolute', right: 16, left: undefined, top: 14,
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#F0F2F5',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
    },
    backText:    { color: '#374151', fontSize: 24, lineHeight: 28 },
    headerContent: { paddingTop: 10, paddingHorizontal: 4, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
    headerSub:   { fontSize: 13, color: '#6B7280', marginTop: 2 },

    scroll: { flexGrow: 1 },
    body:   { padding: 16, gap: 14 },

    bannerSuccess: {
        backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#6EE7B7',
    },
    bannerSuccessText: { color: '#065F46', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    bannerError: {
        backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#FECACA',
    },
    bannerErrorText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },

    card: {
        backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 14,
        borderWidth: 1, borderColor: '#F0F2F5',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    cardTitleRowRTL: { flexDirection: 'row-reverse' },
    cardTitleDot:    { width: 4, height: 16, borderRadius: 2, backgroundColor: C.orange },
    cardTitleText:   { fontSize: 13, fontWeight: '700', color: '#374151', letterSpacing: 0.2 },

    pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1.5, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 8,
    },
    pillEmoji:         { fontSize: 15 },
    pillLabel:         { fontSize: 12, fontWeight: '500' },
    pillLabelSelected: { fontWeight: '700' },

    fieldWrap:  { gap: 5 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.3 },
    fieldOuter: {
        borderWidth: 1.5, borderRadius: 12, overflow: 'hidden',
    },
    fieldInput: {
        paddingVertical: 12, paddingHorizontal: 14,
        fontSize: 14, color: '#111827',
    },
    fieldMulti: { height: 96, paddingTop: 12 },
    fieldRTL:   { textAlign: 'right' },
    fieldError: { fontSize: 11, color: C.red, marginTop: 2 },

    row:     { flexDirection: 'row', gap: 12 },
    rowHalf: { flex: 1 },

    pickerButton: {
        borderWidth: 1.5, borderColor: '#EAECF0', borderRadius: 12,
        paddingVertical: 12, paddingHorizontal: 14,
        backgroundColor: '#fff',
    },
    pickerButtonError: { borderColor: C.red },
    pickerButtonText: { fontSize: 14, color: '#111827' },
    pickerPlaceholder: { color: '#C0C6D0' },

    urgentRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    urgentRowRTL: { flexDirection: 'row-reverse' },
    urgentLeft:   { flex: 1, gap: 2 },
    urgentLabel:  { fontSize: 14, fontWeight: '700', color: '#111827' },
    urgentSub:    { fontSize: 11, color: '#9CA3AF' },

    submitBtn: {
        borderRadius: 16, paddingVertical: 16, alignItems: 'center',
        shadowColor: C.orange, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
    },
    submitText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

    rtl: { textAlign: 'right' },
});