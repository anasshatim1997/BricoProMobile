import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
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
import { SVC_ICON } from '../../constants/services';
import { Lang } from '../../i18n';
import { TokenStorage } from '../../storage/token';

const BASE_URL = 'http://192.168.1.13:8080/api/v1';

type Role = 'CLIENT' | 'WORKER';

interface Props {
    lang:   Lang;
    taskId: number;
    role:   Role;
    onBack: () => void;
}

interface TaskDetail {
    id:             number;
    title:          string;
    serviceType:    string;
    status:         string;
    address:        string;
    scheduledDate:  string;
    scheduledStart: string;
    isUrgent:       boolean;
    agreedPrice?:   number;
    budgetMin?:     number;
    budgetMax?:     number;
    description?:   string;
    worker?: {
        firstName:  string;
        lastName:   string;
        rating?:    number;
        avatarUrl?: string;
    };
}

const STATUS_META: Record<string, { dot: string; fr: string; ar: string }> = {
    SEARCHING: { dot: '#F59E0B', fr: 'En recherche',  ar: 'قيد البحث' },
    CONFIRMED: { dot: '#3B82F6', fr: 'Confirmé',      ar: 'مؤكد' },
    STARTED:   { dot: '#8B5CF6', fr: 'En cours',      ar: 'جارٍ' },
    COMPLETED: { dot: '#10B981', fr: 'Terminé',       ar: 'منتهٍ' },
    CANCELLED: { dot: '#EF4444', fr: 'Annulé',        ar: 'ملغى' },
    DISPUTED:  { dot: '#EF4444', fr: 'Litige',        ar: 'نزاع' },
};

const TIMELINE_STEPS = ['SEARCHING', 'CONFIRMED', 'STARTED', 'COMPLETED'];

function SectionCard({ children }: { children: React.ReactNode }) {
    return <View style={s.card}>{children}</View>;
}

function SectionTitle({ text, isRTL }: { text: string; isRTL: boolean }) {
    return (
        <View style={[s.cardTitleRow, isRTL && s.rowRev]}>
            <View style={s.cardTitleDot} />
            <Text style={[s.cardTitleText, isRTL && s.rtl]}>{text}</Text>
        </View>
    );
}

function StatusPill({ status, isFr }: { status: string; isFr: boolean }) {
    const meta = STATUS_META[status] ?? STATUS_META.SEARCHING;
    return (
        <View style={[s.statusPill, { backgroundColor: meta.dot + '1A' }]}>
            <View style={[s.statusDot, { backgroundColor: meta.dot }]} />
            <Text style={[s.statusTxt, { color: meta.dot }]}>
                {isFr ? meta.fr : meta.ar}
            </Text>
        </View>
    );
}

export default function TaskDetailScreen({ lang, taskId, role, onBack }: Props) {
    const isFr  = lang === 'fr';
    const isRTL = lang === 'ar';

    const [task,      setTask]      = useState<TaskDetail | null>(null);
    const [loading,   setLoading]   = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [apiErr,    setApiErr]    = useState('');
    const [banner,    setBanner]    = useState('');
    const [review,    setReview]    = useState({ rating: 5, comment: '' });
    const [showReview, setShowReview] = useState(false);
    const [reviewDone, setReviewDone] = useState(false);

    const headerY = useRef(new Animated.Value(-20)).current;
    const headerO = useRef(new Animated.Value(0)).current;
    const bodyO   = useRef(new Animated.Value(0)).current;
    const bodyY   = useRef(new Animated.Value(24)).current;

    const fetchTask = useCallback(async () => {
        try {
            const session = await TokenStorage.get();
            if (!session) return;
            const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${session.accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setTask(data);
            }
        } catch {
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(headerY, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(headerO, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(bodyY,   { toValue: 0, duration: 440, delay: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(bodyO,   { toValue: 1, duration: 440, delay: 80, useNativeDriver: true }),
        ]).start();
        fetchTask();
    }, [fetchTask, headerY, headerO, bodyY, bodyO]);

    async function apiAction(path: string, method: string, body?: object) {
        setActionLoading(true);
        setApiErr('');
        try {
            const session = await TokenStorage.get();
            if (!session) throw new Error('Session expirée');
            const res = await fetch(`${BASE_URL}${path}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.accessToken}`,
                },
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.message || (isFr ? 'Erreur serveur' : 'خطأ في الخادم'));
            }
            return true;
        } catch (err: any) {
            setApiErr(err.message);
            return false;
        } finally {
            setActionLoading(false);
        }
    }

    async function handleAccept() {
        const ok = await apiAction(`/tasks/${taskId}/accept`, 'POST');
        if (ok) {
            setBanner(isFr ? '✓ Mission acceptée !' : '✓ تم قبول المهمة!');
            await fetchTask();
        }
    }

    async function handleStartMission() {
        const ok = await apiAction(`/tasks/${taskId}/status`, 'PATCH', { status: 'STARTED' });
        if (ok) {
            setBanner(isFr ? '✓ Mission démarrée !' : '✓ بدأت المهمة!');
            await fetchTask();
        }
    }

    async function handleMarkComplete() {
        const ok = await apiAction(`/tasks/${taskId}/status`, 'PATCH', { status: 'COMPLETED' });
        if (ok) {
            setBanner(isFr ? '✓ Mission terminée !' : '✓ اكتملت المهمة!');
            await fetchTask();
            setShowReview(true);
        }
    }

    async function handleCancel() {
        const ok = await apiAction(`/tasks/${taskId}/cancel`, 'POST');
        if (ok) {
            setBanner(isFr ? 'Demande annulée.' : 'تم إلغاء الطلب.');
            await fetchTask();
        }
    }

    async function handleSubmitReview() {
        const ok = await apiAction(`/tasks/${taskId}/reviews`, 'POST', {
            rating:  review.rating,
            comment: review.comment,
        });
        if (ok) {
            setReviewDone(true);
            setBanner(isFr ? '✓ Avis soumis, merci !' : '✓ تم إرسال التقييم، شكراً!');
        }
    }

    function fmtDate(d: string) {
        return new Date(d).toLocaleDateString(isFr ? 'fr-FR' : 'ar-MA', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function fmtPrice(t: TaskDetail) {
        if (t.agreedPrice) return `${t.agreedPrice} MAD`;
        if (t.budgetMin && t.budgetMax) return `${t.budgetMin}–${t.budgetMax} MAD`;
        if (t.budgetMin) return `~${t.budgetMin} MAD`;
        return isFr ? 'À négocier' : 'قابل للتفاوض';
    }

    if (loading) {
        return (
            <View style={s.loaderWrap}>
                <ActivityIndicator size="large" color={C.orange} />
            </View>
        );
    }

    if (!task) {
        return (
            <SafeAreaView style={s.root} edges={['top']}>
                <LinearGradient colors={['#0A0912', '#131221']} style={s.header}>
                    <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
                        <Text style={s.backText}>‹</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>{isFr ? 'Détail' : 'التفاصيل'}</Text>
                </LinearGradient>
                <View style={s.errorWrap}>
                    <Text style={s.errorText}>{isFr ? 'Tâche introuvable.' : 'المهمة غير موجودة.'}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const statusMeta  = STATUS_META[task.status] ?? STATUS_META.SEARCHING;
    const stepIndex   = TIMELINE_STEPS.indexOf(task.status);
    const isCancelled = task.status === 'CANCELLED' || task.status === 'DISPUTED';
    const isCompleted = task.status === 'COMPLETED';

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0912" />

            <Animated.View style={{ opacity: headerO, transform: [{ translateY: headerY }] }}>
                <LinearGradient colors={['#0A0912', '#131221']} style={s.header}>
                    <TouchableOpacity
                        style={[s.backBtn, isRTL && s.backBtnRTL]}
                        onPress={onBack}
                        activeOpacity={0.7}
                    >
                        <Text style={s.backText}>{isRTL ? '›' : '‹'}</Text>
                    </TouchableOpacity>
                    <View style={s.headerContent}>
                        <Text style={[s.headerTitle, isRTL && s.rtl]} numberOfLines={1}>{task.title}</Text>
                        <View style={[s.headerMeta, isRTL && s.rowRev]}>
                            <Text style={s.headerEmoji}>{SVC_ICON[task.serviceType] ?? '🔧'}</Text>
                            <StatusPill status={task.status} isFr={isFr} />
                            {task.isUrgent && (
                                <View style={s.urgentBadge}>
                                    <Text style={s.urgentBadgeText}>🔥 {isFr ? 'Urgent' : 'عاجل'}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>

            <Animated.View style={[s.bodyWrap, { opacity: bodyO, transform: [{ translateY: bodyY }] }]}>
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

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
                        <SectionTitle text={isFr ? 'Informations' : 'المعلومات'} isRTL={isRTL} />
                        <InfoRow icon="📍" label={isFr ? 'Adresse' : 'العنوان'} value={task.address} isRTL={isRTL} />
                        <InfoRow icon="📅" label={isFr ? 'Date' : 'التاريخ'} value={fmtDate(task.scheduledDate)} isRTL={isRTL} />
                        <InfoRow icon="🕐" label={isFr ? 'Heure' : 'الوقت'} value={task.scheduledStart} isRTL={isRTL} />
                        <InfoRow icon="💰" label={isFr ? 'Budget' : 'الميزانية'} value={fmtPrice(task)} isRTL={isRTL} />
                        {!!task.description && (
                            <View style={s.descWrap}>
                                <Text style={[s.descLabel, isRTL && s.rtl]}>{isFr ? 'Description' : 'الوصف'}</Text>
                                <Text style={[s.descText, isRTL && s.rtl]}>{task.description}</Text>
                            </View>
                        )}
                    </SectionCard>

                    {!TIMELINE_STEPS.includes(task.status) ? null : (
                        <SectionCard>
                            <SectionTitle text={isFr ? 'Progression' : 'التقدم'} isRTL={isRTL} />
                            <View style={[s.timeline, isRTL && s.rowRev]}>
                                {TIMELINE_STEPS.map((step, i) => {
                                    const done    = i <= stepIndex;
                                    const current = i === stepIndex;
                                    const meta    = STATUS_META[step];
                                    return (
                                        <React.Fragment key={step}>
                                            <View style={s.timelineStep}>
                                                <View style={[
                                                    s.timelineCircle,
                                                    done && { backgroundColor: meta.dot, borderColor: meta.dot },
                                                    current && s.timelineCircleCurrent,
                                                ]}>
                                                    {done && <Text style={s.timelineCheck}>✓</Text>}
                                                </View>
                                                <Text style={[s.timelineLabel, done && { color: meta.dot }]}>
                                                    {isFr ? meta.fr : meta.ar}
                                                </Text>
                                            </View>
                                            {i < TIMELINE_STEPS.length - 1 && (
                                                <View style={[s.timelineLine, i < stepIndex && { backgroundColor: STATUS_META[TIMELINE_STEPS[i + 1]].dot }]} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </View>
                        </SectionCard>
                    )}

                    <SectionCard>
                        <SectionTitle text={isFr ? 'Prestataire' : 'المزود'} isRTL={isRTL} />
                        {task.worker ? (
                            <View style={[s.workerRow, isRTL && s.rowRev]}>
                                <View style={s.workerAvatar}>
                                    <Text style={s.workerAvatarText}>
                                        {task.worker.firstName.charAt(0)}{task.worker.lastName.charAt(0)}
                                    </Text>
                                </View>
                                <View style={s.workerInfo}>
                                    <Text style={[s.workerName, isRTL && s.rtl]}>
                                        {task.worker.firstName} {task.worker.lastName}
                                    </Text>
                                    {task.worker.rating != null && (
                                        <Text style={[s.workerRating, isRTL && s.rtl]}>
                                            ⭐ {task.worker.rating.toFixed(1)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <View style={s.searchingWrap}>
                                <ActivityIndicator size="small" color={statusMeta.dot} />
                                <Text style={[s.searchingText, { color: statusMeta.dot }]}>
                                    {isFr ? 'En recherche d\'un prestataire…' : 'جارٍ البحث عن مزود خدمة...'}
                                </Text>
                            </View>
                        )}
                    </SectionCard>

                    {role === 'CLIENT' && (
                        <>
                            {task.status === 'STARTED' && (
                                <ActionButton
                                    label={isFr ? '✓ Marquer comme terminé' : '✓ وضع علامة اكتمل'}
                                    color={C.success}
                                    onPress={handleMarkComplete}
                                    loading={actionLoading}
                                />
                            )}
                            {!isCancelled && !isCompleted && (
                                <ActionButton
                                    label={isFr ? 'Annuler la demande' : 'إلغاء الطلب'}
                                    color={C.red}
                                    outline
                                    onPress={handleCancel}
                                    loading={actionLoading}
                                />
                            )}
                            {isCompleted && showReview && !reviewDone && (
                                <SectionCard>
                                    <SectionTitle text={isFr ? 'Laisser un avis' : 'اترك تقييماً'} isRTL={isRTL} />
                                    <View style={[s.starsRow, isRTL && s.rowRev]}>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <TouchableOpacity key={n} onPress={() => setReview(r => ({ ...r, rating: n }))} activeOpacity={0.7}>
                                                <Text style={[s.star, n <= review.rating && s.starActive]}>★</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TextInput
                                        style={[s.reviewInput, isRTL && s.fieldRTL]}
                                        placeholder={isFr ? 'Votre commentaire…' : 'تعليقك...'}
                                        placeholderTextColor="#C0C6D0"
                                        value={review.comment}
                                        onChangeText={v => setReview(r => ({ ...r, comment: v }))}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                        textAlign={isRTL ? 'right' : 'left'}
                                    />
                                    <ActionButton
                                        label={isFr ? 'Envoyer l\'avis' : 'إرسال التقييم'}
                                        color={C.purpleMid}
                                        onPress={handleSubmitReview}
                                        loading={actionLoading}
                                    />
                                </SectionCard>
                            )}
                        </>
                    )}

                    {role === 'WORKER' && (
                        <>
                            {task.status === 'SEARCHING' && (
                                <ActionButton
                                    label={isFr ? '✓ Accepter la mission' : '✓ قبول المهمة'}
                                    color={C.success}
                                    onPress={handleAccept}
                                    loading={actionLoading}
                                />
                            )}
                            {task.status === 'CONFIRMED' && (
                                <ActionButton
                                    label={isFr ? '▶ Démarrer la mission' : '▶ بدء المهمة'}
                                    color={C.purpleMid}
                                    onPress={handleStartMission}
                                    loading={actionLoading}
                                />
                            )}
                            {task.status === 'STARTED' && (
                                <View style={s.waitingPill}>
                                    <Text style={s.waitingPillText}>
                                        {isFr ? '⏳ En attente de confirmation client' : '⏳ في انتظار تأكيد العميل'}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={{ height: 32 }} />
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

function InfoRow({ icon, label, value, isRTL }: { icon: string; label: string; value: string; isRTL: boolean }) {
    return (
        <View style={[s.infoRow, isRTL && s.rowRev]}>
            <Text style={s.infoIcon}>{icon}</Text>
            <View style={s.infoContent}>
                <Text style={[s.infoLabel, isRTL && s.rtl]}>{label}</Text>
                <Text style={[s.infoValue, isRTL && s.rtl]}>{value}</Text>
            </View>
        </View>
    );
}

function ActionButton({ label, color, outline = false, onPress, loading }: {
    label: string; color: string; outline?: boolean;
    onPress: () => void; loading: boolean;
}) {
    return (
        <TouchableOpacity
            style={[
                s.actionBtn,
                outline
                    ? { borderWidth: 1.5, borderColor: color, backgroundColor: color + '10' }
                    : { backgroundColor: color },
            ]}
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.82}
        >
            {loading
                ? <ActivityIndicator color={outline ? color : '#fff'} />
                : <Text style={[s.actionBtnText, outline && { color }]}>{label}</Text>
            }
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F3F7' },
    root:       { flex: 1, backgroundColor: '#F2F3F7' },
    bodyWrap:   { flex: 1 },
    errorWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText:  { color: '#9CA3AF', fontSize: 14 },

    header: { paddingTop: 12, paddingBottom: 20, paddingHorizontal: 24 },
    backBtn: {
        position: 'absolute', left: 16, top: 14,
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
    },
    backBtnRTL: {
        position: 'absolute', right: 16, left: undefined, top: 14,
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
    },
    backText:    { color: '#fff', fontSize: 24, lineHeight: 28 },
    headerContent: { paddingTop: 10, paddingHorizontal: 4, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3, textAlign: 'center' },
    headerMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    headerEmoji: { fontSize: 20 },

    urgentBadge: {
        backgroundColor: '#FEF3C7', borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    urgentBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },

    scroll:  { padding: 16 },

    bannerSuccess: {
        backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#6EE7B7', marginBottom: 12,
    },
    bannerSuccessText: { color: '#065F46', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    bannerError: {
        backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#FECACA', marginBottom: 12,
    },
    bannerErrorText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },

    card: {
        backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 12,
        borderWidth: 1, borderColor: '#F0F2F5', marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    cardTitleDot:    { width: 4, height: 16, borderRadius: 2, backgroundColor: C.orange },
    cardTitleText:   { fontSize: 13, fontWeight: '700', color: '#374151', letterSpacing: 0.2 },

    infoRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    infoIcon:   { fontSize: 16, marginTop: 2 },
    infoContent: { flex: 1, gap: 1 },
    infoLabel:  { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
    infoValue:  { fontSize: 14, color: '#111827', fontWeight: '500' },

    descWrap:  { gap: 4 },
    descLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
    descText:  { fontSize: 13, color: '#374151', lineHeight: 20 },

    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusDot:  { width: 5, height: 5, borderRadius: 3 },
    statusTxt:  { fontSize: 11, fontWeight: '700' },

    timeline:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
    timelineStep: { alignItems: 'center', gap: 6, flex: 1 },
    timelineCircle: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 2, borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        alignItems: 'center', justifyContent: 'center',
    },
    timelineCircleCurrent: { borderWidth: 2.5 },
    timelineCheck: { fontSize: 11, color: '#fff', fontWeight: '800' },
    timelineLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '600', textAlign: 'center' },
    timelineLine:  { flex: 0.5, height: 2, backgroundColor: '#E5E7EB', marginBottom: 18 },

    workerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    workerAvatar: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: C.orange + '20',
        alignItems: 'center', justifyContent: 'center',
    },
    workerAvatarText: { fontSize: 16, fontWeight: '700', color: C.orange },
    workerInfo:   { flex: 1, gap: 3 },
    workerName:   { fontSize: 15, fontWeight: '700', color: '#111827' },
    workerRating: { fontSize: 12, color: '#6B7280' },

    searchingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchingText: { fontSize: 13, fontWeight: '600' },

    actionBtn: {
        borderRadius: 16, paddingVertical: 15, alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
    },
    actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },

    waitingPill: {
        backgroundColor: '#F3F4F6', borderRadius: 14, padding: 14,
        alignItems: 'center', marginBottom: 10,
    },
    waitingPillText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

    starsRow: { flexDirection: 'row', gap: 6 },
    star:     { fontSize: 28, color: '#D1D5DB' },
    starActive: { color: '#F59E0B' },

    reviewInput: {
        borderWidth: 1.5, borderColor: '#EAECF0', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 14, color: '#111827', height: 80,
    },
    fieldRTL: { textAlign: 'right' },

    rtl:    { textAlign: 'right' },
    rowRev: { flexDirection: 'row-reverse' },
});