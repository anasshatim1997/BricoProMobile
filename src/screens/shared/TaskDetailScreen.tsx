import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
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
import { SERVICES } from '../../constants/services';
import { Lang } from '../../i18n';
import { Role } from '../../api/auth';
import { tasksApi, Task, TaskStatus } from '../../api/tasks';
import { TokenStorage } from '../../storage/token';

const STATUS_META: Record<TaskStatus, { color: string; fr: string; ar: string }> = {
    SEARCHING: { color: '#6366F1', fr: 'En recherche',  ar: 'بحث عن مقدم' },
    CONFIRMED: { color: '#F97316', fr: 'Confirmée',     ar: 'مؤكدة' },
    STARTED:   { color: '#F59E0B', fr: 'En cours',      ar: 'جارية' },
    COMPLETED: { color: '#10B981', fr: 'Terminée',      ar: 'منجزة' },
    CANCELLED: { color: '#EF4444', fr: 'Annulée',       ar: 'ملغاة' },
};

const FLOW: TaskStatus[] = ['SEARCHING', 'CONFIRMED', 'STARTED', 'COMPLETED'];

interface Props {
    lang:   Lang;
    taskId: number;
    role:   Role;
    onBack: () => void;
}

function InfoRow({ icon, text, isRTL }: { icon: string; text: string; isRTL: boolean }) {
    return (
        <View style={[ir.row, isRTL && ir.rowRTL]}>
            <Text style={ir.icon}>{icon}</Text>
            <Text style={[ir.text, isRTL && ir.rtl]}>{text}</Text>
        </View>
    );
}
const ir = StyleSheet.create({
    row:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    rowRTL: { flexDirection: 'row-reverse' },
    icon:   { fontSize: 16, marginTop: 1 },
    text:   { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
    rtl:    { textAlign: 'right' },
});

function PersonRow({ label, user, isRTL }: {
    label: string; user: { firstName: string; lastName: string; phone?: string }; isRTL: boolean; isFr: boolean;
}) {
    return (
        <View style={[pr.wrap, isRTL && pr.wrapRTL]}>
            <View style={pr.avatar}>
                <Text style={pr.avatarText}>
                    {user.firstName.charAt(0).toUpperCase()}{user.lastName.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={pr.info}>
                <Text style={[pr.role, isRTL && pr.rtl]}>{label}</Text>
                <Text style={[pr.name, isRTL && pr.rtl]}>{user.firstName} {user.lastName}</Text>
                {user.phone && <Text style={[pr.phone, isRTL && pr.rtl]}>{user.phone}</Text>}
            </View>
        </View>
    );
}
const pr = StyleSheet.create({
    wrap:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
    wrapRTL:    { flexDirection: 'row-reverse' },
    avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: C.orange + '22', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: '700', color: C.orange },
    info:       { flex: 1, gap: 2 },
    role:       { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.4, textTransform: 'uppercase' },
    name:       { fontSize: 14, fontWeight: '700', color: '#111827' },
    phone:      { fontSize: 12, color: '#6B7280' },
    rtl:        { textAlign: 'right' },
});

export default function TaskDetailScreen({ lang, taskId, role, onBack }: Props) {
    const isFr  = lang === 'fr';
    const isRTL = lang === 'ar';

    const [token,   setToken]   = useState<string | null>(null);
    const [userId,  setUserId]  = useState<number | null>(null);
    const [task,    setTask]    = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [err,     setErr]     = useState('');

    const [actionLoad, setActionLoad] = useState(false);

    const [showCancel,   setShowCancel]   = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    const [showReview,    setShowReview]    = useState(false);
    const [reviewRating,  setReviewRating]  = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [hasReviewed,   setHasReviewed]   = useState(false);

    useEffect(() => {
        TokenStorage.get().then(s => {
            if (s) { setToken(s.accessToken); setUserId(s.userId); }
        });
    }, []);

    const load = useCallback(async () => {
        if (!token) return;
        try {
            const t = await tasksApi.get(taskId, token);
            setTask(t);
        } catch (e: any) {
            setErr(e?.message ?? 'Erreur de chargement');
        }
    }, [token, taskId]);

    useEffect(() => {
        if (token) {
            setLoading(true);
            load().finally(() => setLoading(false));
        }
    }, [token]);

    const refresh = async () => {
        if (!token) return;
        const t = await tasksApi.get(taskId, token);
        setTask(t);
    };

    const handleAccept = async () => {
        if (!token || !task) return;
        setActionLoad(true);
        try {
            const updated = await tasksApi.accept(task.id, token);
            setTask(updated);
        } catch (e: any) {
            Alert.alert(isFr ? 'Erreur' : 'خطأ', e?.message ?? '');
        } finally { setActionLoad(false); }
    };

    const handleStart = async () => {
        if (!token || !task) return;
        setActionLoad(true);
        try {
            const updated = await tasksApi.updateStatus(task.id, token, { status: 'STARTED' });
            setTask(updated);
        } catch (e: any) {
            Alert.alert(isFr ? 'Erreur' : 'خطأ', e?.message ?? '');
        } finally { setActionLoad(false); }
    };

    const handleComplete = async () => {
        if (!token || !task) return;
        setActionLoad(true);
        try {
            const updated = await tasksApi.updateStatus(task.id, token, { status: 'COMPLETED' });
            setTask(updated);
        } catch (e: any) {
            Alert.alert(isFr ? 'Erreur' : 'خطأ', e?.message ?? '');
        } finally { setActionLoad(false); }
    };

    const handleCancel = async () => {
        if (!token || !task || cancelReason.trim().length < 10) return;
        setActionLoad(true);
        try {
            await tasksApi.updateStatus(task.id, token, {
                status: 'CANCELLED',
                cancellationReason: cancelReason.trim(),
            });
            setShowCancel(false);
            setCancelReason('');
            await refresh();
        } catch (e: any) {
            Alert.alert(isFr ? 'Erreur' : 'خطأ', e?.message ?? '');
        } finally { setActionLoad(false); }
    };

    const handleReview = async () => {
        if (!token || !task) return;
        setActionLoad(true);
        try {
            await tasksApi.submitReview(task.id, token, {
                rating:  reviewRating,
                comment: reviewComment.trim() || undefined,
            });
            setShowReview(false);
            setHasReviewed(true);
            setReviewComment('');
            Alert.alert(
                isFr ? 'Avis envoyé ✓' : 'تم الإرسال ✓',
                isFr ? 'Merci pour votre retour !' : 'شكراً على تقييمك!',
            );
        } catch (e: any) {
            const msg = e?.message ?? '';
            if (msg.includes('Already reviewed')) {
                setHasReviewed(true);
                setShowReview(false);
                Alert.alert(
                    isFr ? 'Déjà soumis' : 'سبق التقييم',
                    isFr ? 'Vous avez déjà évalué cette mission.' : 'لقد قيّمت هذه المهمة مسبقاً.',
                );
            } else {
                Alert.alert(isFr ? 'Erreur' : 'خطأ', msg);
            }
        } finally { setActionLoad(false); }
    };

    if (loading) {
        return (
            <SafeAreaView style={s.root} edges={['top']}>
                <View style={s.center}>
                    <ActivityIndicator color={C.orange} size="large" />
                    <Text style={s.loadingText}>
                        {isFr ? 'Chargement de la mission…' : 'جار تحميل المهمة…'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (err || !task) {
        return (
            <SafeAreaView style={s.root} edges={['top']}>
                <TouchableOpacity style={s.backFallback} onPress={onBack}>
                    <Text style={s.backFallbackText}>{isRTL ? '›' : '‹'}</Text>
                </TouchableOpacity>
                <View style={s.center}>
                    <Text style={s.errEmoji}>⚠️</Text>
                    <Text style={s.errText}>{err || (isFr ? 'Mission introuvable' : 'المهمة غير موجودة')}</Text>
                    <TouchableOpacity style={s.retryBtn} onPress={() => { setErr(''); setLoading(true); load().finally(() => setLoading(false)); }}>
                        <Text style={s.retryText}>{isFr ? 'Réessayer' : 'إعادة المحاولة'}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const sm         = STATUS_META[task.status];
    const svc        = SERVICES.find(sv => sv.key === task.serviceType);
    const isMyTask   = role === 'WORKER' ? task.worker?.id === userId : task.client.id === userId;
    const hasPenalty = (task.status === 'CONFIRMED' || task.status === 'STARTED') && !!task.agreedPrice;
    const penaltyPct = role === 'WORKER' ? '10%' : '5%';
    const penaltyAmt = hasPenalty && task.agreedPrice
        ? (task.agreedPrice * (role === 'WORKER' ? 0.1 : 0.05)).toFixed(2)
        : null;

    const flowIdx = FLOW.indexOf(task.status);

    const cancelReasonLen = cancelReason.trim().length;
    const cancelReasonOk  = cancelReasonLen >= 10;
    const reviewCommentLen = reviewComment.length;

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />

            <View style={[s.header, isRTL && s.headerRTL]}>
                <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
                    <Text style={s.backText}>{isRTL ? '›' : '‹'}</Text>
                </TouchableOpacity>
                <Text style={[s.headerTitle, isRTL && s.rtl]} numberOfLines={1}>{task.title}</Text>
                <View style={[s.statusBadge, { backgroundColor: sm.color + '1A', borderColor: sm.color + '44' }]}>
                    <Text style={[s.statusBadgeText, { color: sm.color }]}>
                        {isFr ? sm.fr : sm.ar}
                    </Text>
                </View>
            </View>

            {task.status !== 'CANCELLED' && (
                <View style={s.flowBar}>
                    {FLOW.map((step, i) => {
                        const done    = i < flowIdx;
                        const current = i === flowIdx;
                        const stepSm  = STATUS_META[step];
                        return (
                            <React.Fragment key={step}>
                                <View style={s.flowStep}>
                                    <View style={[
                                        s.flowDot,
                                        done    && { backgroundColor: '#10B981', borderColor: '#10B981' },
                                        current && { backgroundColor: stepSm.color, borderColor: stepSm.color },
                                    ]}>
                                        {done && <Text style={s.flowCheck}>✓</Text>}
                                    </View>
                                    <Text style={[
                                        s.flowLabel,
                                        done    && { color: '#10B981' },
                                        current && { color: stepSm.color, fontWeight: '700' },
                                    ]}>
                                        {isFr ? stepSm.fr : stepSm.ar}
                                    </Text>
                                </View>
                                {i < FLOW.length - 1 && (
                                    <View style={[s.flowLine, done && { backgroundColor: '#10B981' }]} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </View>
            )}

            <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                    <View style={s.card}>
                        <View style={[s.heroRow, isRTL && s.heroRowRTL]}>
                            <View style={[s.svcIcon, { backgroundColor: (svc?.color ?? C.orange) + '22' }]}>
                                <Text style={s.svcEmoji}>{svc?.icon ?? '🔧'}</Text>
                            </View>
                            <View style={s.heroInfo}>
                                <Text style={[s.heroSvc, { color: svc?.color ?? C.orange }, isRTL && s.rtl]}>
                                    {isFr ? (svc?.fr ?? task.serviceType) : (svc?.ar ?? task.serviceType)}
                                </Text>
                                <Text style={[s.heroTitle, isRTL && s.rtl]}>{task.title}</Text>
                                {task.urgent && (
                                    <View style={s.urgentTag}>
                                        <Text style={s.urgentTagText}>
                                            {isFr ? '🔥 Demande urgente' : '🔥 طلب عاجل'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <Text style={[s.description, isRTL && s.rtl]}>{task.description}</Text>
                    </View>

                    <View style={s.card}>
                        <Text style={[s.cardLabel, isRTL && s.rtl]}>
                            {isFr ? 'Lieu & horaire' : 'المكان والموعد'}
                        </Text>
                        <InfoRow icon="📍" text={task.address} isRTL={isRTL} />
                        <InfoRow
                            icon="📅"
                            text={`${task.scheduledDate} · ${task.scheduledStart.slice(0, 5)}${task.scheduledEnd ? ` – ${task.scheduledEnd.slice(0, 5)}` : ''}`}
                            isRTL={isRTL}
                        />
                        {(task.latitude && task.longitude) && (
                            <InfoRow
                                icon="🗺"
                                text={`${task.latitude.toFixed(5)}, ${task.longitude.toFixed(5)}`}
                                isRTL={isRTL}
                            />
                        )}
                    </View>

                    {(task.budgetMin || task.budgetMax || task.agreedPrice) && (
                        <View style={s.card}>
                            <Text style={[s.cardLabel, isRTL && s.rtl]}>
                                {isFr ? 'Budget' : 'الميزانية'}
                            </Text>
                            <View style={[s.budgetRow, isRTL && s.budgetRowRTL]}>
                                {task.budgetMin != null && (
                                    <View style={s.budgetBox}>
                                        <Text style={s.budgetVal}>{task.budgetMin} MAD</Text>
                                        <Text style={s.budgetMeta}>{isFr ? 'Minimum' : 'الحد الأدنى'}</Text>
                                    </View>
                                )}
                                {task.budgetMax != null && (
                                    <View style={s.budgetBox}>
                                        <Text style={s.budgetVal}>{task.budgetMax} MAD</Text>
                                        <Text style={s.budgetMeta}>{isFr ? 'Maximum' : 'الحد الأقصى'}</Text>
                                    </View>
                                )}
                                {task.agreedPrice != null && (
                                    <View style={[s.budgetBox, s.budgetAgreed]}>
                                        <Text style={[s.budgetVal, s.budgetAgreedVal]}>{task.agreedPrice} MAD</Text>
                                        <Text style={s.budgetMeta}>{isFr ? 'Convenu ✓' : 'متفق عليه ✓'}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <View style={s.card}>
                        <Text style={[s.cardLabel, isRTL && s.rtl]}>
                            {isFr ? 'Participants' : 'المشاركون'}
                        </Text>
                        <PersonRow label={isFr ? 'Client' : 'العميل'} user={task.client} isRTL={isRTL} isFr={isFr} />
                        {task.worker ? (
                            <>
                                <View style={s.divider} />
                                <PersonRow label={isFr ? 'Prestataire' : 'المقدم'} user={task.worker} isRTL={isRTL} isFr={isFr} />
                            </>
                        ) : (
                            <View style={s.noWorkerRow}>
                                <Text style={s.noWorkerText}>
                                    {isFr ? '⏳ En attente d\'un prestataire' : '⏳ في انتظار مقدم خدمة'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={s.card}>
                        <Text style={[s.cardLabel, isRTL && s.rtl]}>
                            {isFr ? 'Actions' : 'الإجراءات'}
                        </Text>

                        {role === 'CLIENT' && task.status === 'SEARCHING' && (
                            <>
                                <Text style={[s.hint, isRTL && s.rtl]}>
                                    {isFr
                                        ? 'Vous pouvez annuler votre demande tant qu\'aucun prestataire n\'a été confirmé (sans frais).'
                                        : 'يمكنك إلغاء طلبك قبل تأكيد أي مقدم خدمة (بدون رسوم).'}
                                </Text>
                                <TouchableOpacity style={s.btnOutlineDanger} onPress={() => setShowCancel(true)}>
                                    <Text style={s.btnOutlineDangerText}>
                                        {isFr ? '✕ Annuler la demande' : '✕ إلغاء الطلب'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {role === 'CLIENT' && task.status === 'CONFIRMED' && (
                            <>
                                <Text style={[s.hint, isRTL && s.rtl]}>
                                    {isFr
                                        ? `Annulation à ce stade entraîne des frais de ${penaltyPct}${penaltyAmt ? ` (${penaltyAmt} MAD)` : ''}.`
                                        : `الإلغاء في هذه المرحلة يستوجب رسوماً بنسبة ${penaltyPct}${penaltyAmt ? ` (${penaltyAmt} درهم)` : ''}.`}
                                </Text>
                                <TouchableOpacity style={s.btnOutlineDanger} onPress={() => setShowCancel(true)}>
                                    <Text style={s.btnOutlineDangerText}>
                                        {isFr ? '✕ Annuler la mission' : '✕ إلغاء المهمة'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {role === 'CLIENT' && task.status === 'STARTED' && (
                            <>
                                <Text style={[s.hint, isRTL && s.rtl]}>
                                    {isFr
                                        ? 'Confirmez la fin des travaux uniquement lorsque le prestataire a terminé.'
                                        : 'أكّد انتهاء العمل فقط عندما ينتهي المقدم من تنفيذه.'}
                                </Text>
                                <TouchableOpacity style={s.btnPrimary} onPress={handleComplete} disabled={actionLoad} activeOpacity={0.85}>
                                    <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                                        {actionLoad
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text style={s.btnPrimaryText}>{isFr ? '✓ Marquer comme terminée' : '✓ تأكيد الإنجاز'}</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                                <View style={s.gap8} />
                                <TouchableOpacity style={s.btnOutlineDanger} onPress={() => setShowCancel(true)}>
                                    <Text style={s.btnOutlineDangerText}>
                                        {isFr
                                            ? `✕ Annuler (frais ${penaltyPct}${penaltyAmt ? ` · ${penaltyAmt} MAD` : ''})`
                                            : `✕ إلغاء (رسوم ${penaltyPct}${penaltyAmt ? ` · ${penaltyAmt} درهم` : ''})`}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {role === 'CLIENT' && task.status === 'COMPLETED' && !hasReviewed && (
                            <>
                                <Text style={[s.hint, isRTL && s.rtl]}>
                                    {isFr
                                        ? 'Évaluez le prestataire (1 à 5 étoiles). L\'avis est définitif.'
                                        : 'قيّم مقدم الخدمة (من 1 إلى 5 نجوم). التقييم نهائي.'}
                                </Text>
                                <TouchableOpacity style={s.btnPrimary} onPress={() => setShowReview(true)} activeOpacity={0.85}>
                                    <LinearGradient colors={[C.orange, C.red]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                                        <Text style={s.btnPrimaryText}>{isFr ? '⭐ Laisser un avis' : '⭐ ترك تقييم'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}

                        {role === 'CLIENT' && task.status === 'COMPLETED' && hasReviewed && (
                            <View style={s.donePill}>
                                <Text style={s.donePillText}>{isFr ? '✓ Avis soumis' : '✓ تم التقييم'}</Text>
                            </View>
                        )}

                        {role === 'CLIENT' && task.status === 'CANCELLED' && (
                            <View style={s.cancelledNote}>
                                <Text style={[s.cancelledNoteText, isRTL && s.rtl]}>
                                    {isFr ? '✕ Cette mission a été annulée.' : '✕ تم إلغاء هذه المهمة.'}
                                </Text>
                                {task.cancellationReason && (
                                    <Text style={[s.cancelledReason, isRTL && s.rtl]}>
                                        {isFr ? 'Motif: ' : 'السبب: '}{task.cancellationReason}
                                    </Text>
                                )}
                            </View>
                        )}

                        {role === 'WORKER' && task.status === 'SEARCHING' && !isMyTask && (
                            <>
                                <Text style={[s.hint, isRTL && s.rtl]}>
                                    {isFr
                                        ? 'Acceptez cette mission pour la confirmer immédiatement.'
                                        : 'اقبل هذه المهمة لتأكيدها فوراً.'}
                                </Text>
                                <TouchableOpacity style={s.btnPrimary} onPress={handleAccept} disabled={actionLoad} activeOpacity={0.85}>
                                    <LinearGradient colors={[C.orange, C.red]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                                        {actionLoad
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text style={s.btnPrimaryText}>{isFr ? '⚡ Accepter la mission' : '⚡ قبول المهمة'}</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}

                        {role === 'WORKER' && task.status === 'SEARCHING' && isMyTask && (
                            <View style={s.donePill}>
                                <Text style={s.donePillText}>
                                    {isFr ? '✓ Vous avez accepté cette mission' : '✓ لقد قبلت هذه المهمة'}
                                </Text>
                            </View>
                        )}

                        {role === 'WORKER' && (task.status === 'CONFIRMED' || task.status === 'STARTED') && !isMyTask && (
                            <View style={s.takenNote}>
                                <Text style={[s.takenNoteText, isRTL && s.rtl]}>
                                    {isFr ? 'Cette mission a déjà été assignée à un autre prestataire.' : 'هذه المهمة مُسندة بالفعل لمقدم آخر.'}
                                </Text>
                            </View>
                        )}

                        {role === 'WORKER' && task.status === 'CONFIRMED' && isMyTask && (
                            <>
                                <Text style={[s.hint, isRTL && s.rtl]}>
                                    {isFr
                                        ? 'Démarrez la mission lorsque vous êtes sur place et que les travaux commencent.'
                                        : 'ابدأ المهمة عندما تكون في الموقع وتبدأ العمل فعلياً.'}
                                </Text>
                                <TouchableOpacity style={s.btnPrimary} onPress={handleStart} disabled={actionLoad} activeOpacity={0.85}>
                                    <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                                        {actionLoad
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text style={s.btnPrimaryText}>{isFr ? '▶ Démarrer la mission' : '▶ بدء المهمة'}</Text>}
                                    </LinearGradient>
                                </TouchableOpacity>
                                <View style={s.gap8} />
                                <TouchableOpacity style={s.btnOutlineDanger} onPress={() => setShowCancel(true)}>
                                    <Text style={s.btnOutlineDangerText}>
                                        {isFr
                                            ? `✕ Annuler (pénalité ${penaltyPct}${penaltyAmt ? ` · ${penaltyAmt} MAD` : ''})`
                                            : `✕ إلغاء (غرامة ${penaltyPct}${penaltyAmt ? ` · ${penaltyAmt} درهم` : ''})`}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {role === 'WORKER' && task.status === 'STARTED' && isMyTask && (
                            <>
                                <View style={s.inProgressNote}>
                                    <Text style={[s.inProgressText, isRTL && s.rtl]}>
                                        {isFr
                                            ? '⏳ Mission en cours. Le client confirmera la fin des travaux.'
                                            : '⏳ المهمة جارية. سيؤكد العميل انتهاء العمل.'}
                                    </Text>
                                </View>
                                <View style={s.gap8} />
                                <TouchableOpacity style={s.btnOutlineDanger} onPress={() => setShowCancel(true)}>
                                    <Text style={s.btnOutlineDangerText}>
                                        {isFr
                                            ? `✕ Annuler (pénalité ${penaltyPct}${penaltyAmt ? ` · ${penaltyAmt} MAD` : ''})`
                                            : `✕ إلغاء (غرامة ${penaltyPct}${penaltyAmt ? ` · ${penaltyAmt} درهم` : ''})`}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {role === 'WORKER' && task.status === 'COMPLETED' && isMyTask && !hasReviewed && (
                            <>
                                <Text style={[s.hint, isRTL && s.rtl]}>
                                    {isFr
                                        ? 'Évaluez le client (1 à 5 étoiles). L\'avis est définitif et visible publiquement.'
                                        : 'قيّم العميل (من 1 إلى 5 نجوم). التقييم نهائي ومرئي للعموم.'}
                                </Text>
                                <TouchableOpacity style={s.btnPrimary} onPress={() => setShowReview(true)} activeOpacity={0.85}>
                                    <LinearGradient colors={[C.orange, C.red]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                                        <Text style={s.btnPrimaryText}>{isFr ? '⭐ Laisser un avis' : '⭐ ترك تقييم'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}

                        {role === 'WORKER' && task.status === 'COMPLETED' && isMyTask && hasReviewed && (
                            <View style={s.donePill}>
                                <Text style={s.donePillText}>{isFr ? '✓ Avis soumis' : '✓ تم التقييم'}</Text>
                            </View>
                        )}

                        {role === 'WORKER' && task.status === 'CANCELLED' && (
                            <View style={s.cancelledNote}>
                                <Text style={[s.cancelledNoteText, isRTL && s.rtl]}>
                                    {isFr ? '✕ Cette mission a été annulée.' : '✕ تم إلغاء هذه المهمة.'}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showCancel} transparent animationType="slide" onRequestClose={() => setShowCancel(false)}>
                <View style={m.overlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={m.kav}>
                        <View style={m.sheet}>
                            <View style={m.handle} />
                            <Text style={[m.title, isRTL && s.rtl]}>
                                {isFr ? 'Annuler la mission' : 'إلغاء المهمة'}
                            </Text>
                            {hasPenalty && (
                                <View style={m.warningBox}>
                                    <Text style={[m.warningText, isRTL && s.rtl]}>
                                        {isFr
                                            ? `⚠ Attention — des frais d'annulation de ${penaltyPct}${penaltyAmt ? ` (${penaltyAmt} MAD)` : ''} seront débités du prix convenu.`
                                            : `⚠ تنبيه — سيتم خصم رسوم إلغاء بنسبة ${penaltyPct}${penaltyAmt ? ` (${penaltyAmt} درهم)` : ''} من السعر المتفق عليه.`}
                                    </Text>
                                </View>
                            )}
                            <Text style={[m.label, isRTL && s.rtl]}>
                                {isFr ? 'Motif d\'annulation' : 'سبب الإلغاء'}
                            </Text>
                            <Text style={[m.hint, isRTL && s.rtl]}>
                                {isFr ? 'Minimum 10 caractères · Maximum 500 caractères' : 'الحد الأدنى 10 أحرف · الحد الأقصى 500 حرف'}
                            </Text>
                            <View style={[m.inputWrap, !cancelReasonOk && cancelReasonLen > 0 && m.inputWrapErr]}>
                                <TextInput
                                    style={[m.input, isRTL && s.rtl]}
                                    placeholder={isFr ? 'Ex: Je ne suis plus disponible à cette date…' : 'مثال: لم أعد متاحاً في هذا الموعد…'}
                                    placeholderTextColor="#C0C6D0"
                                    value={cancelReason}
                                    onChangeText={v => setCancelReason(v.slice(0, 500))}
                                    multiline
                                    numberOfLines={4}
                                    textAlign={isRTL ? 'right' : 'left'}
                                    textAlignVertical="top"
                                />
                            </View>
                            <View style={[m.counter, isRTL && m.counterRTL]}>
                                {!cancelReasonOk && cancelReasonLen > 0 && (
                                    <Text style={m.counterErr}>
                                        {isFr ? `Encore ${10 - cancelReasonLen} caractère(s)` : `${10 - cancelReasonLen} أحرف إضافية`}
                                    </Text>
                                )}
                                <Text style={m.counterNum}>{cancelReasonLen}/500</Text>
                            </View>
                            <View style={m.btns}>
                                <TouchableOpacity style={m.btnSecondary} onPress={() => { setShowCancel(false); setCancelReason(''); }}>
                                    <Text style={m.btnSecondaryText}>{isFr ? 'Fermer' : 'إغلاق'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[m.btnDanger, !cancelReasonOk && m.btnDisabled]}
                                    onPress={handleCancel}
                                    disabled={!cancelReasonOk || actionLoad}
                                >
                                    {actionLoad
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={m.btnDangerText}>{isFr ? 'Confirmer' : 'تأكيد'}</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <Modal visible={showReview} transparent animationType="slide" onRequestClose={() => setShowReview(false)}>
                <View style={m.overlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={m.kav}>
                        <View style={m.sheet}>
                            <View style={m.handle} />
                            <Text style={[m.title, isRTL && s.rtl]}>
                                {isFr ? 'Laisser un avis' : 'ترك تقييم'}
                            </Text>
                            <Text style={[m.hint, isRTL && s.rtl]}>
                                {isFr
                                    ? 'Sélectionnez une note de 1 (mauvais) à 5 (excellent). L\'avis est définitif.'
                                    : 'اختر تقييماً من 1 (ضعيف) إلى 5 (ممتاز). التقييم نهائي لا يمكن تعديله.'}
                            </Text>
                            <View style={m.starsRow}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <TouchableOpacity key={star} onPress={() => setReviewRating(star)} activeOpacity={0.7} style={m.starBtn}>
                                        <Text style={reviewRating >= star ? m.starOn : m.starOff}>★</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={[m.ratingLabel, isRTL && s.rtl]}>
                                {isFr
                                    ? ['', 'Mauvais', 'Médiocre', 'Correct', 'Bien', 'Excellent'][reviewRating]
                                    : ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'][reviewRating]}
                                {' '}({reviewRating}/5)
                            </Text>
                            <Text style={[m.label, isRTL && s.rtl]}>
                                {isFr ? 'Commentaire (optionnel)' : 'تعليق (اختياري)'}
                            </Text>
                            <Text style={[m.hint, isRTL && s.rtl]}>
                                {isFr ? 'Maximum 1000 caractères' : 'الحد الأقصى 1000 حرف'}
                            </Text>
                            <View style={m.inputWrap}>
                                <TextInput
                                    style={[m.input, isRTL && s.rtl]}
                                    placeholder={isFr ? 'Décrivez votre expérience…' : 'صف تجربتك…'}
                                    placeholderTextColor="#C0C6D0"
                                    value={reviewComment}
                                    onChangeText={v => setReviewComment(v.slice(0, 1000))}
                                    multiline
                                    numberOfLines={3}
                                    textAlign={isRTL ? 'right' : 'left'}
                                    textAlignVertical="top"
                                />
                            </View>
                            <View style={[m.counter, m.counterRTL]}>
                                <Text style={m.counterNum}>{reviewCommentLen}/1000</Text>
                            </View>
                            <View style={m.btns}>
                                <TouchableOpacity style={m.btnSecondary} onPress={() => setShowReview(false)}>
                                    <Text style={m.btnSecondaryText}>{isFr ? 'Annuler' : 'إلغاء'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={m.btnPrimary} onPress={handleReview} disabled={actionLoad}>
                                    {actionLoad
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={m.btnPrimaryText}>{isFr ? 'Soumettre' : 'إرسال'}</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root:   { flex: 1, backgroundColor: '#F5F6FA' },
    flex:   { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

    loadingText:      { fontSize: 13, color: '#9CA3AF' },
    errEmoji:         { fontSize: 44 },
    errText:          { fontSize: 15, color: '#374151', fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
    retryBtn:         { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.orange + '18', borderRadius: 12 },
    retryText:        { fontSize: 14, fontWeight: '700', color: C.orange },
    backFallback:     { position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F2F5', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    backFallbackText: { fontSize: 24, color: '#374151', lineHeight: 28 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    headerRTL:       { flexDirection: 'row-reverse' },
    backBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    backText:        { fontSize: 24, color: '#374151', lineHeight: 28 },
    headerTitle:     { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
    statusBadge:     { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
    statusBadgeText: { fontSize: 12, fontWeight: '700' },

    flowBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    flowStep:  { alignItems: 'center', gap: 4 },
    flowDot:   { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    flowCheck: { fontSize: 10, color: '#fff', fontWeight: '900' },
    flowLabel: { fontSize: 9, color: '#9CA3AF', fontWeight: '500', textAlign: 'center', maxWidth: 54 },
    flowLine:  { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4, marginBottom: 12 },

    scroll: { padding: 14, gap: 12 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 18,
        gap: 12,
        borderWidth: 1,
        borderColor: '#F0F2F5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },

    heroRow:         { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    heroRowRTL:      { flexDirection: 'row-reverse' },
    svcIcon:         { width: 52, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    svcEmoji:        { fontSize: 26 },
    heroInfo:        { flex: 1, gap: 4 },
    heroSvc:         { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
    heroTitle:       { fontSize: 18, fontWeight: '800', color: '#111827', lineHeight: 24 },
    urgentTag:       { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
    urgentTagText:   { fontSize: 11, fontWeight: '700', color: '#92400E' },
    description:     { fontSize: 14, color: '#374151', lineHeight: 22 },

    cardLabel:       { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase' },

    budgetRow:       { flexDirection: 'row', gap: 12 },
    budgetRowRTL:    { flexDirection: 'row-reverse' },
    budgetBox:       { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 4, alignItems: 'center', borderWidth: 1, borderColor: '#F0F2F5' },
    budgetVal:       { fontSize: 16, fontWeight: '800', color: '#111827' },
    budgetMeta:      { fontSize: 11, color: '#9CA3AF' },
    budgetAgreed:    { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
    budgetAgreedVal: { color: '#059669' },

    divider:      { height: 1, backgroundColor: '#F0F2F5', marginVertical: 4 },
    noWorkerRow:  { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, alignItems: 'center' },
    noWorkerText: { fontSize: 13, color: '#9CA3AF' },

    hint: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
    gap8: { height: 8 },

    btnPrimary:           { borderRadius: 16, overflow: 'hidden' },
    btnGrad:              { paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
    btnPrimaryText:       { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
    btnOutlineDanger:     { borderRadius: 16, borderWidth: 1.5, borderColor: '#FCA5A5', paddingVertical: 13, alignItems: 'center', backgroundColor: '#FEF2F2' },
    btnOutlineDangerText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },

    donePill:     { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#6EE7B7' },
    donePillText: { fontSize: 14, fontWeight: '700', color: '#059669' },

    inProgressNote: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
    inProgressText: { fontSize: 13, color: '#92400E', lineHeight: 20 },

    takenNote:     { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14 },
    takenNoteText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

    cancelledNote:     { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, gap: 6, borderWidth: 1, borderColor: '#FECACA' },
    cancelledNoteText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
    cancelledReason:   { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },

    rtl: { textAlign: 'right' },
});

const m = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    kav:     { width: '100%' },
    sheet:   { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12, paddingBottom: 36 },
    handle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 8 },
    title:   { fontSize: 18, fontWeight: '800', color: '#111827' },
    label:   { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 4 },
    hint:    { fontSize: 11, color: '#9CA3AF', lineHeight: 16, marginTop: -6 },

    warningBox:  { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FCD34D' },
    warningText: { fontSize: 12, color: '#92400E', lineHeight: 18 },

    inputWrap:    { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
    inputWrapErr: { borderColor: '#EF4444' },
    input:        { paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: '#111827', minHeight: 90 },

    counter:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
    counterRTL: { flexDirection: 'row-reverse' },
    counterNum: { fontSize: 11, color: '#9CA3AF' },
    counterErr: { fontSize: 11, color: '#EF4444', fontWeight: '600' },

    starsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 8 },
    starBtn:     { padding: 4 },
    starOn:      { fontSize: 36, color: '#FBBF24' },
    starOff:     { fontSize: 36, color: '#E5E7EB' },
    ratingLabel: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: '#374151' },

    btns:             { flexDirection: 'row', gap: 12, marginTop: 8 },
    btnSecondary:     { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#F3F4F6' },
    btnSecondaryText: { fontSize: 14, fontWeight: '700', color: '#374151' },
    btnPrimary:       { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: C.orange },
    btnPrimaryText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
    btnDanger:        { flex: 2, paddingVertical: 14, alignItems: 'center', borderRadius: 14, backgroundColor: '#EF4444' },
    btnDangerText:    { fontSize: 14, fontWeight: '700', color: '#fff' },
    btnDisabled:      { opacity: 0.4 },
});