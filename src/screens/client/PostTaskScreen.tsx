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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants';
import { SERVICES } from '../../constants/services';
import { Lang } from '../../i18n';
import { tasksApi } from '../../api/tasks';
import { TokenStorage } from '../../storage/token';

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

const TITLE_MAX       = 255;
const DESCRIPTION_MAX = 1000;
const ADDRESS_MAX     = 255;
const TITLE_MIN       = 5;
const DESCRIPTION_MIN = 10;

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
                   label,
                   placeholder,
                   value,
                   onChangeText,
                   multiline   = false,
                   keyboardType = 'default',
                   isRTL        = false,
                   error,
                   hint,
                   maxLength,
                   minLength,
                   showCounter  = false,
                   required     = false,
               }: {
    label:        string;
    placeholder:  string;
    value:        string;
    onChangeText: (v: string) => void;
    multiline?:   boolean;
    keyboardType?: any;
    isRTL?:       boolean;
    error?:       string;
    hint?:        string;
    maxLength?:   number;
    minLength?:   number;
    showCounter?: boolean;
    required?:    boolean;
}) {
    const anim = useRef(new Animated.Value(0)).current;
    const onFocus = () => Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    const onBlur  = () => Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start();

    const len       = value.length;
    const nearLimit = maxLength ? len >= Math.floor(maxLength * 0.85) : false;
    const atLimit   = maxLength ? len >= maxLength : false;
    const belowMin  = minLength ? len > 0 && len < minLength : false;

    const borderColor = anim.interpolate({
        inputRange:  [0, 1],
        outputRange: [error ? C.red : '#EAECF0', error ? C.red : C.purpleMid],
    });

    const counterColor = atLimit ? C.red : nearLimit ? C.orange : '#C0C6D0';

    return (
        <View style={s.fieldWrap}>
            <View style={[s.fieldTopRow, isRTL && s.rowReverse]}>
                <View style={[s.fieldLabelGroup, isRTL && s.rowReverse]}>
                    <Text style={[s.fieldLabel, isRTL && s.rtl]}>{label}</Text>
                    {required && <Text style={s.requiredDot}>*</Text>}
                </View>
                {showCounter && maxLength && (
                    <Text style={[s.counter, { color: counterColor }]}>{len}/{maxLength}</Text>
                )}
            </View>
            {!!hint && (
                <Text style={[s.fieldHint, isRTL && s.rtl]}>{hint}</Text>
            )}
            <Animated.View style={[s.fieldOuter, { borderColor }]}>
                <TextInput
                    style={[s.fieldInput, multiline && s.fieldMulti, isRTL && s.fieldRTL]}
                    placeholder={placeholder}
                    placeholderTextColor="#C0C6D0"
                    value={value}
                    onChangeText={v => onChangeText(maxLength ? v.slice(0, maxLength) : v)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    keyboardType={keyboardType}
                    autoCapitalize="none"
                    textAlign={isRTL ? 'right' : 'left'}
                    textAlignVertical={multiline ? 'top' : 'center'}
                    maxLength={maxLength}
                />
            </Animated.View>
            {!!error && (
                <Text style={[s.fieldError, isRTL && s.rtl]}>⚠ {error}</Text>
            )}
            {!error && belowMin && minLength && (
                <Text style={[s.fieldWarn, isRTL && s.rtl]}>
                    {isRTL
                        ? `${minLength - len} أحرف إضافية على الأقل`
                        : `Encore ${minLength - len} caractère${minLength - len > 1 ? 's' : ''} minimum`}
                </Text>
            )}
        </View>
    );
}

export default function PostTaskScreen({ lang, onBack, onSuccess }: Props) {
    const isFr  = lang === 'fr';
    const isRTL = lang === 'ar';

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
    const [errors,         setErrors]         = useState<FieldErrors>({});
    const [loading,        setLoading]        = useState(false);
    const [apiErr,         setApiErr]         = useState('');
    const [banner,         setBanner]         = useState('');
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
    }, [bodyO, bodyY, headerO, headerY]);

    const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
        setForm(prev => ({ ...prev, [k]: v }));
        setErrors(prev => ({ ...prev, [k]: undefined }));
        setApiErr('');
    }, []);

    function validate(): boolean {
        const e: FieldErrors = {};

        if (!form.serviceType)
            e.serviceType = isFr ? 'Choisissez un type de service' : 'اختر نوع الخدمة';

        if (!form.title.trim())
            e.title = isFr ? 'Le titre est requis' : 'العنوان مطلوب';
        else if (form.title.trim().length < TITLE_MIN)
            e.title = isFr
                ? `Minimum ${TITLE_MIN} caractères (actuellement ${form.title.trim().length})`
                : `الحد الأدنى ${TITLE_MIN} أحرف (حالياً ${form.title.trim().length})`;

        if (!form.description.trim())
            e.description = isFr ? 'La description est requise' : 'الوصف مطلوب';
        else if (form.description.trim().length < DESCRIPTION_MIN)
            e.description = isFr
                ? `Minimum ${DESCRIPTION_MIN} caractères (actuellement ${form.description.trim().length})`
                : `الحد الأدنى ${DESCRIPTION_MIN} أحرف (حالياً ${form.description.trim().length})`;

        if (!form.address.trim())
            e.address = isFr ? 'L\'adresse est requise' : 'العنوان مطلوب';

        if (!form.scheduledDate.trim())
            e.scheduledDate = isFr ? 'Sélectionnez une date' : 'اختر تاريخاً';
        else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.scheduledDate.trim()))
            e.scheduledDate = isFr ? 'Format requis: JJ/MM/AAAA' : 'الصيغة المطلوبة: يي/شش/سسسس';
        else {
            const [d, m, y] = form.scheduledDate.split('/').map(Number);
            const picked = new Date(y, m - 1, d);
            const today  = new Date(); today.setHours(0, 0, 0, 0);
            if (picked <= today)
                e.scheduledDate = isFr ? 'La date doit être dans le futur' : 'يجب أن يكون التاريخ في المستقبل';
        }

        if (!form.scheduledStart.trim())
            e.scheduledStart = isFr ? 'Sélectionnez une heure' : 'اختر وقتاً';
        else if (!/^\d{2}:\d{2}$/.test(form.scheduledStart.trim()))
            e.scheduledStart = isFr ? 'Format requis: HH:MM' : 'الصيغة المطلوبة: سس:دد';

        const minN = Number(form.budgetMin);
        const maxN = Number(form.budgetMax);
        if (form.budgetMin && (isNaN(minN) || minN <= 0))
            e.budgetMin = isFr ? 'Entier positif requis (ex: 150)' : 'رقم موجب مطلوب (مثال: 150)';
        if (form.budgetMax && (isNaN(maxN) || maxN <= 0))
            e.budgetMax = isFr ? 'Entier positif requis (ex: 500)' : 'رقم موجب مطلوب (مثال: 500)';
        if (form.budgetMin && form.budgetMax && !e.budgetMin && !e.budgetMax && minN >= maxN)
            e.budgetMax = isFr
                ? `Max (${maxN}) doit être strictement supérieur au Min (${minN})`
                : `الأقصى (${maxN}) يجب أن يكون أكبر من الأدنى (${minN})`;

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function parseDate(str: string): string {
        const [d, m, y] = str.split('/');
        return `${y}-${m}-${d}`;
    }

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (event.type === 'dismissed') return;
        if (selectedDate) {
            const day   = selectedDate.getDate().toString().padStart(2, '0');
            const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
            const year  = selectedDate.getFullYear();
            set('scheduledDate', `${day}/${month}/${year}`);
        }
    };

    const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (event.type === 'dismissed') return;
        if (selectedTime) {
            const hours   = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            set('scheduledStart', `${hours}:${minutes}`);
        }
    };

    async function handleSubmit() {
        if (!validate()) return;
        setLoading(true);
        setApiErr('');
        try {
            const session = await TokenStorage.get();
            if (!session?.accessToken) throw new Error(isFr ? 'Session expirée — reconnectez-vous' : 'انتهت الجلسة — أعد تسجيل الدخول');

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

            await tasksApi.create(session.accessToken, body);

            setBanner(isFr ? '✓ Demande publiée avec succès !' : '✓ تم نشر الطلب بنجاح!');
            setTimeout(() => onSuccess(), 1200);
        } catch (err: any) {
            const raw = err?.message ?? '';
            if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('failed to fetch')) {
                setApiErr(isFr
                    ? '🔌 Connexion impossible au serveur. Vérifiez votre réseau et que le backend est démarré (192.168.1.12:8080).'
                    : '🔌 تعذّر الاتصال بالخادم. تحقق من الشبكة وتشغيل الخادم (192.168.1.12:8080).');
            } else {
                setApiErr(raw || (isFr ? 'Une erreur est survenue' : 'حدث خطأ ما'));
            }
        } finally {
            setLoading(false);
        }
    }

    const filledCount = [
        form.serviceType, form.title.trim().length >= TITLE_MIN,
        form.description.trim().length >= DESCRIPTION_MIN,
        form.address, form.scheduledDate, form.scheduledStart,
    ].filter(Boolean).length;
    const progressPct = Math.round((filledCount / 6) * 100);

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
                    <View style={s.progressWrap}>
                        <View style={s.progressTrack}>
                            <View style={[s.progressFill, { width: `${progressPct}%` }]} />
                        </View>
                        <Text style={s.progressLabel}>{progressPct}%</Text>
                    </View>
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
                                <Text style={s.bannerErrorText}>{apiErr}</Text>
                            </View>
                        )}

                        <SectionCard>
                            <SectionTitle text={isFr ? 'Type de service' : 'نوع الخدمة'} isRTL={isRTL} />
                            <Text style={[s.fieldHint, isRTL && s.rtl]}>
                                {isFr ? 'Champ requis — sélectionnez une catégorie' : 'حقل مطلوب — اختر فئة'}
                            </Text>
                            {!!errors.serviceType && (
                                <Text style={[s.fieldError, isRTL && s.rtl]}>⚠ {errors.serviceType}</Text>
                            )}
                            <View style={s.pillGrid}>
                                {SERVICES.map(svc => {
                                    const selected = form.serviceType === svc.key;
                                    const pillLabelColor = { color: selected ? svc.color : '#6B7280' };
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
                                            <Text style={[s.pillLabel, pillLabelColor, selected && s.pillLabelSelected]}>
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
                                hint={isFr
                                    ? `Minimum ${TITLE_MIN} caractères · Maximum ${TITLE_MAX} caractères`
                                    : `الحد الأدنى ${TITLE_MIN} أحرف · الحد الأقصى ${TITLE_MAX} حرفاً`}
                                minLength={TITLE_MIN}
                                maxLength={TITLE_MAX}
                                showCounter
                                required
                            />

                            <Field
                                label={isFr ? 'Description' : 'الوصف'}
                                placeholder={isFr ? 'Décrivez votre problème en détail (localisation, gravité, tentatives précédentes…)' : 'صف مشكلتك بالتفصيل (الموقع، الحدة، المحاولات السابقة...)'}
                                value={form.description}
                                onChangeText={v => set('description', v)}
                                multiline
                                isRTL={isRTL}
                                error={errors.description}
                                hint={isFr
                                    ? `Minimum ${DESCRIPTION_MIN} caractères · Maximum ${DESCRIPTION_MAX} caractères`
                                    : `الحد الأدنى ${DESCRIPTION_MIN} أحرف · الحد الأقصى ${DESCRIPTION_MAX} حرفاً`}
                                minLength={DESCRIPTION_MIN}
                                maxLength={DESCRIPTION_MAX}
                                showCounter
                                required
                            />
                        </SectionCard>

                        <SectionCard>
                            <SectionTitle text={isFr ? 'Lieu et horaire' : 'المكان والموعد'} isRTL={isRTL} />

                            <Field
                                label={isFr ? 'Adresse complète' : 'العنوان الكامل'}
                                placeholder={isFr ? 'Ex: 12 Rue Ibn Khaldoun, Casablanca' : 'مثال: 12 شارع ابن خلدون، الدار البيضاء'}
                                value={form.address}
                                onChangeText={v => set('address', v)}
                                isRTL={isRTL}
                                error={errors.address}
                                hint={isFr ? 'Rue, quartier et ville — Maximum 255 caractères' : 'الشارع والحي والمدينة — الحد الأقصى 255 حرفاً'}
                                maxLength={ADDRESS_MAX}
                                showCounter
                                required
                            />

                            <View style={s.row}>
                                <View style={s.rowHalf}>
                                    <Text style={[s.fieldLabel, isRTL && s.rtl]}>
                                        {isFr ? 'Date' : 'التاريخ'}
                                        <Text style={s.requiredDot}> *</Text>
                                    </Text>
                                    <Text style={[s.fieldHint, isRTL && s.rtl]}>
                                        {isFr ? 'Doit être dans le futur' : 'يجب أن يكون في المستقبل'}
                                    </Text>
                                    <TouchableOpacity
                                        style={[s.pickerButton, !!errors.scheduledDate && s.pickerButtonError]}
                                        onPress={() => setShowDatePicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            s.pickerButtonText,
                                            !form.scheduledDate && s.pickerPlaceholder,
                                        ]}>
                                            {form.scheduledDate || (isFr ? 'JJ/MM/AAAA' : 'يي/شش/سسسس')}
                                        </Text>
                                    </TouchableOpacity>
                                    {!!errors.scheduledDate && (
                                        <Text style={[s.fieldError, isRTL && s.rtl]}>⚠ {errors.scheduledDate}</Text>
                                    )}
                                </View>

                                <View style={s.rowHalf}>
                                    <Text style={[s.fieldLabel, isRTL && s.rtl]}>
                                        {isFr ? 'Heure de début' : 'وقت البدء'}
                                        <Text style={s.requiredDot}> *</Text>
                                    </Text>
                                    <Text style={[s.fieldHint, isRTL && s.rtl]}>
                                        {isFr ? 'Format 24h (HH:MM)' : 'صيغة 24 ساعة (سس:دد)'}
                                    </Text>
                                    <TouchableOpacity
                                        style={[s.pickerButton, !!errors.scheduledStart && s.pickerButtonError]}
                                        onPress={() => setShowTimePicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            s.pickerButtonText,
                                            !form.scheduledStart && s.pickerPlaceholder,
                                        ]}>
                                            {form.scheduledStart || (isFr ? 'HH:MM' : 'سس:دد')}
                                        </Text>
                                    </TouchableOpacity>
                                    {!!errors.scheduledStart && (
                                        <Text style={[s.fieldError, isRTL && s.rtl]}>⚠ {errors.scheduledStart}</Text>
                                    )}
                                </View>
                            </View>
                        </SectionCard>

                        <SectionCard>
                            <SectionTitle text={isFr ? 'Budget (optionnel)' : 'الميزانية (اختياري)'} isRTL={isRTL} />
                            <Text style={[s.fieldHint, isRTL && s.rtl]}>
                                {isFr
                                    ? 'Indiquez une fourchette pour aider les prestataires à faire une offre adaptée. Montants en MAD, entiers positifs.'
                                    : 'حدد نطاقاً لمساعدة مقدمي الخدمة على تقديم عروض مناسبة. المبالغ بالدرهم، أرقام صحيحة موجبة.'}
                            </Text>
                            <View style={s.row}>
                                <View style={s.rowHalf}>
                                    <Field
                                        label={isFr ? 'Minimum (MAD)' : 'الحد الأدنى (درهم)'}
                                        placeholder="150"
                                        value={form.budgetMin}
                                        onChangeText={v => set('budgetMin', v.replace(/[^0-9]/g, ''))}
                                        keyboardType="numeric"
                                        isRTL={isRTL}
                                        error={errors.budgetMin}
                                        hint={isFr ? 'Optionnel · ex: 150' : 'اختياري · مثال: 150'}
                                    />
                                </View>
                                <View style={s.rowHalf}>
                                    <Field
                                        label={isFr ? 'Maximum (MAD)' : 'الحد الأقصى (درهم)'}
                                        placeholder="500"
                                        value={form.budgetMax}
                                        onChangeText={v => set('budgetMax', v.replace(/[^0-9]/g, ''))}
                                        keyboardType="numeric"
                                        isRTL={isRTL}
                                        error={errors.budgetMax}
                                        hint={isFr ? 'Optionnel · doit être > Min' : 'اختياري · يجب > الأدنى'}
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
                                        {isFr
                                            ? 'Priorité maximale — apparaît en tête de liste pour les prestataires'
                                            : 'أولوية قصوى — يظهر في أعلى قائمة مقدمي الخدمة'}
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

                        <View style={s.requiredNote}>
                            <Text style={[s.requiredNoteText, isRTL && s.rtl]}>
                                {isFr
                                    ? '* Champs obligatoires — les autres champs sont optionnels'
                                    : '* حقول إلزامية — بقية الحقول اختيارية'}
                            </Text>
                        </View>

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
                                        {isFr ? 'Publier la demande →' : 'نشر الطلب ←'}
                                    </Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={s.bottomSpacer} />
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {showDatePicker && (
                <DateTimePicker
                    value={new Date()}
                    minimumDate={new Date(Date.now() + 86400000)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={handleDateChange}
                />
            )}
            {showTimePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                />
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F6FA' },
    flex: { flex: 1 },

    header: {
        paddingTop: 12, paddingBottom: 22, paddingHorizontal: 24,
        position: 'relative',
        borderBottomWidth: 1, borderBottomColor: '#F0F2F5',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    },
    backBtn: {
        position: 'absolute', left: 16, top: 14,
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#F0F2F5',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
    },
    backBtnRTL: {
        position: 'absolute', right: 16, top: 14,
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#F0F2F5',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
    },
    backText:    { color: '#374151', fontSize: 24, lineHeight: 28 },
    headerContent: { paddingTop: 10, paddingHorizontal: 4, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
    headerSub:   { fontSize: 13, color: '#6B7280', marginTop: 2 },

    progressWrap:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#fff', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
    progressTrack: { flex: 1, height: 4, backgroundColor: '#F0F2F5', borderRadius: 2, overflow: 'hidden' },
    progressFill:  { height: '100%', backgroundColor: C.orange, borderRadius: 2 },
    progressLabel: { fontSize: 11, fontWeight: '700', color: C.orange, minWidth: 32, textAlign: 'right' },

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
    bannerErrorText: { color: '#991B1B', fontSize: 13, lineHeight: 18 },

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

    fieldWrap:       { gap: 4 },
    fieldTopRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowReverse:      { flexDirection: 'row-reverse' },
    fieldLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    fieldLabel:      { fontSize: 12, fontWeight: '600', color: '#6B7280', letterSpacing: 0.3 },
    requiredDot:     { fontSize: 13, color: C.red, fontWeight: '700' },
    fieldHint:       { fontSize: 11, color: '#9CA3AF', lineHeight: 15 },
    counter:         { fontSize: 11, fontWeight: '600' },
    fieldOuter:      { borderWidth: 1.5, borderRadius: 12, overflow: 'hidden', marginTop: 2 },
    fieldInput:      { paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#111827' },
    fieldMulti:      { height: 100, paddingTop: 12 },
    fieldRTL:        { textAlign: 'right' },
    fieldError:      { fontSize: 11, color: C.red, fontWeight: '600' },
    fieldWarn:       { fontSize: 11, color: C.orange, fontWeight: '500' },

    row:     { flexDirection: 'row', gap: 12 },
    rowHalf: { flex: 1 },

    pickerButton: {
        borderWidth: 1.5, borderColor: '#EAECF0', borderRadius: 12,
        paddingVertical: 13, paddingHorizontal: 14,
        backgroundColor: '#fff', marginTop: 2,
    },
    pickerButtonError: { borderColor: C.red },
    pickerButtonText:  { fontSize: 14, color: '#111827' },
    pickerPlaceholder: { color: '#C0C6D0' },

    urgentRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    urgentRowRTL: { flexDirection: 'row-reverse' },
    urgentLeft:   { flex: 1, gap: 3 },
    urgentLabel:  { fontSize: 14, fontWeight: '700', color: '#111827' },
    urgentSub:    { fontSize: 11, color: '#9CA3AF', lineHeight: 16 },

    requiredNote:     { alignItems: 'center', paddingVertical: 4 },
    requiredNoteText: { fontSize: 11, color: '#9CA3AF' },

    submitBtn: {
        borderRadius: 16, paddingVertical: 16, alignItems: 'center',
        shadowColor: C.orange, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
    },
    submitText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

    bottomSpacer: { height: 40 },

    rtl: { textAlign: 'right' },
});