import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants';
import { SVC_ICON, SVC_COLOR } from '../../constants/services';
import { Lang } from '../../i18n';
import { TokenStorage } from '../../storage/token';
import {NotificationBell, StatStrip, UrgentPill} from "../../component";
import {useAuthFetch} from "../../hooks/useAuthFetch.ts";

interface Props {
    lang: Lang;
    onLogout: () => void;
    onTaskPress: (taskId: number) => void;
}

interface WorkerDash {
    totalMissions: number;
    activeMissions: number;
    completedMissions: number;
    averageRating: number;
    totalReviews: number;
    currentMonthRevenue: number;
    totalRevenue: number;
}

interface AvailTask {
    id: number;
    title: string;
    serviceType: string;
    address: string;
    scheduledDate: string;
    scheduledStart: string;
    budgetMin?: number;
    budgetMax?: number;
    isUrgent: boolean;
    client: { firstName: string; lastName: string };
}

interface ActiveTask {
    id: number;
    title: string;
    serviceType: string;
    status: string;
    scheduledDate: string;
    scheduledStart: string;
    agreedPrice?: number;
    client: { firstName: string; lastName: string };
}

export function WorkerHomeScreen({ lang, onLogout, onTaskPress }: Props) {
    const isFr = lang === 'fr';
    const authFetch = useAuthFetch();

    const [dash, setDash]             = useState<WorkerDash | null>(null);
    const [available, setAvailable]   = useState<AvailTask[]>([]);
    const [active, setActive]         = useState<ActiveTask[]>([]);
    const [notifCount, setNotifCount] = useState(0);
    const [accepting, setAccepting]   = useState<number | null>(null);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const headerY = useRef(new Animated.Value(-12)).current;
    const headerO = useRef(new Animated.Value(0)).current;
    const bodyO   = useRef(new Animated.Value(0)).current;
    const bodyY   = useRef(new Animated.Value(18)).current;

    const fetchAll = useCallback(async () => {
        try {
            const [dashData, availData, allTasks, notifData] = await Promise.all([
                authFetch('/analytics/worker'),
                authFetch('/tasks/available?size=5&sort=createdAt,desc'),
                authFetch('/tasks/mine/worker?size=10'),
                authFetch('/notifications/unread-count'),
            ]);

            if (dashData) setDash(dashData);
            if (availData?.content) setAvailable(availData.content);
            if (allTasks?.content) {
                const running = (allTasks.content as ActiveTask[]).filter(
                    (t) => t.status === 'CONFIRMED' || t.status === 'STARTED'
                );
                setActive(running.slice(0, 3));
            }
            if (notifData?.count !== undefined) setNotifCount(notifData.count);
        } catch {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authFetch]);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(headerY, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
            Animated.timing(headerO, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.timing(bodyY,   { toValue: 0, duration: 440, delay: 90, useNativeDriver: true }),
            Animated.timing(bodyO,   { toValue: 1, duration: 440, delay: 90, useNativeDriver: true }),
        ]).start();
        fetchAll();
    }, [bodyO, bodyY, fetchAll, headerO, headerY]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAll();
    }, [fetchAll]);

    async function handleAccept(taskId: number) {
        setAccepting(taskId);
        try {
            const result = await authFetch(`/tasks/${taskId}/accept`, 'POST');
            if (result) {
                setAvailable((prev) => prev.filter((t) => t.id !== taskId));
                Alert.alert(
                    isFr ? '✅ Mission acceptée !' : '✅ تم قبول المهمة!',
                    isFr
                        ? 'La mission apparaît maintenant dans vos missions actives.'
                        : 'ستظهر المهمة الآن في مهامك النشطة.'
                );
                fetchAll();
            } else {
                Alert.alert(
                    isFr ? 'Erreur' : 'خطأ',
                    isFr ? 'Impossible d\'accepter cette mission pour le moment.' : 'لا يمكن قبول هذه المهمة الآن.'
                );
            }
        } finally {
            setAccepting(null);
        }
    }

    async function handleLogout() {
        await TokenStorage.clear();
        onLogout();
    }

    function fmtDate(dateStr: string, timeStr?: string) {
        const d    = new Date(dateStr);
        const date = d.toLocaleDateString(isFr ? 'fr-FR' : 'ar-MA', { weekday: 'short', day: 'numeric', month: 'short' });
        return timeStr ? `${date} • ${timeStr.slice(0, 5)}` : date;
    }

    function fmtBudget(t: AvailTask) {
        if (t.budgetMin && t.budgetMax) return `${t.budgetMin} – ${t.budgetMax} MAD`;
        if (t.budgetMin)                return `~${t.budgetMin} MAD`;
        return isFr ? 'À négocier' : 'قابل للتفاوض';
    }

    const rating  = dash?.averageRating      ?? 0;
    const revenue = dash?.currentMonthRevenue ?? 0;
    const total   = dash?.totalMissions      ?? 0;
    const active_ = dash?.activeMissions     ?? 0;

    if (loading) {
        return (
            <View style={s.loader}>
                <ActivityIndicator size="large" color={C.orange} />
            </View>
        );
    }

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0912" />

            <Animated.View style={{ opacity: headerO, transform: [{ translateY: headerY }] }}>
                <LinearGradient colors={['#0A0912', '#131221']} style={s.header}>
                    <View style={s.headerRow}>
                        <View style={s.brandRow}>
                            <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
                            <View>
                                <Text style={s.appName}>BricoPro</Text>
                                <View style={s.workerPill}>
                                    <Text style={s.workerPillText}>🔧 {isFr ? 'Prestataire' : 'مقدم خدمة'}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={s.headerRight}>
                            <NotificationBell count={notifCount} />
                            <TouchableOpacity style={s.iconBtn} onPress={handleLogout} activeOpacity={0.7}>
                                <Text style={s.iconBtnText}>⏏</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={s.greeting}>{isFr ? 'Bonjour 👷' : 'مرحباً 👷'}</Text>
                    <Text style={s.subGreeting}>
                        {isFr ? 'Prêt pour de nouvelles missions ?' : 'هل أنت مستعد لمهام جديدة؟'}
                    </Text>

                    <StatStrip items={[
                        { value: rating > 0 ? rating.toFixed(1) : '–', label: isFr ? 'Note'      : 'التقييم', emoji: '⭐' },
                        { value: total,                                  label: isFr ? 'Missions'  : 'المهام',  emoji: '📋' },
                        { value: revenue > 0 ? Math.round(revenue) : 0, label: isFr ? 'MAD/mois'  : 'د.م./شهر', emoji: '💰' },
                    ]} />
                </LinearGradient>
            </Animated.View>

            <Animated.View style={[s.bodyWrap, { opacity: bodyO, transform: [{ translateY: bodyY }] }]}>
                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={C.orange}
                            colors={[C.orange]}
                        />
                    }
                >
                    {active_ > 0 && (
                        <View style={s.alertBanner}>
                            <Text style={s.alertEmoji}>⚡</Text>
                            <Text style={s.alertText}>
                                {isFr
                                    ? `Vous avez ${active_} mission${active_ > 1 ? 's' : ''} en cours aujourd'hui`
                                    : `لديك ${active_} مهمة${active_ > 1 ? '' : ''} جارية اليوم`}
                            </Text>
                        </View>
                    )}

                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionTitle}>
                                {isFr ? 'Missions disponibles' : 'المهام المتاحة'}
                            </Text>
                            {available.length > 0 && (
                                <View style={s.countChip}>
                                    <Text style={s.countChipText}>{available.length}</Text>
                                </View>
                            )}
                        </View>

                        {available.length === 0 ? (
                            <View style={s.emptyBox}>
                                <Text style={s.emptyEmoji}>🔍</Text>
                                <Text style={s.emptyTitle}>
                                    {isFr ? 'Aucune mission disponible' : 'لا توجد مهام متاحة'}
                                </Text>
                                <Text style={s.emptySub}>
                                    {isFr
                                        ? 'De nouvelles demandes arrivent régulièrement. Tirez pour rafraîchir.'
                                        : 'تصل طلبات جديدة بانتظام. اسحب للتحديث.'}
                                </Text>
                            </View>
                        ) : (
                            available.map((task) => {
                                const color = SVC_COLOR[task.serviceType] ?? C.orange;
                                const isAccepting = accepting === task.id;
                                return (
                                    <View key={task.id} style={s.availCard}>
                                        <View style={s.availTop}>
                                            <View style={[s.availIconWrap, { backgroundColor: color + '18' }]}>
                                                <Text style={s.availEmoji}>{SVC_ICON[task.serviceType] ?? '🔧'}</Text>
                                            </View>
                                            <View style={s.availInfo}>
                                                <View style={s.availTitleRow}>
                                                    <Text style={s.availTitle} numberOfLines={1}>{task.title}</Text>
                                                    {task.isUrgent && <UrgentPill lang={lang} />}
                                                </View>
                                                <Text style={s.availMeta} numberOfLines={1}>
                                                    📍 {task.address.length > 32 ? task.address.slice(0, 32) + '…' : task.address}
                                                </Text>
                                                <Text style={s.availMeta}>
                                                    📅 {fmtDate(task.scheduledDate, task.scheduledStart)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={s.availDivider} />

                                        <View style={s.availFoot}>
                                            <View>
                                                <Text style={s.budgetLbl}>{isFr ? 'Budget estimé' : 'الميزانية'}</Text>
                                                <Text style={s.budgetVal}>{fmtBudget(task)}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[s.acceptBtn, isAccepting && s.acceptBtnBusy]}
                                                onPress={() => handleAccept(task.id)}
                                                disabled={accepting !== null}
                                                activeOpacity={0.82}
                                            >
                                                {isAccepting ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Text style={s.acceptTxt}>
                                                        {isFr ? 'Accepter' : 'قبول'} {isFr ? '→' : '←'}
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    <View style={s.section}>
                        <Text style={s.sectionTitle}>
                            {isFr ? 'Missions actives' : 'المهام النشطة'}
                        </Text>

                        {active.length === 0 ? (
                            <View style={s.emptyBoxSm}>
                                <Text style={s.emptySmTxt}>
                                    {isFr ? 'Aucune mission en cours' : 'لا توجد مهام جارية'}
                                </Text>
                            </View>
                        ) : (
                            active.map((task) => {
                                const isStarted    = task.status === 'STARTED';
                                const color        = SVC_COLOR[task.serviceType] ?? C.orange;
                                const chipStyle    = isStarted ? s.statusChipStarted    : s.statusChipConfirmed;
                                const chipTxtStyle = isStarted ? s.statusChipTxtStarted : s.statusChipTxtConfirmed;
                                return (
                                    <TouchableOpacity
                                        key={task.id}
                                        style={s.activeCard}
                                        activeOpacity={0.78}
                                        onPress={() => onTaskPress(task.id)}
                                    >
                                        <View style={[s.activeLeft, { backgroundColor: color + '18' }]}>
                                            <Text style={s.activeEmoji}>{SVC_ICON[task.serviceType] ?? '🔧'}</Text>
                                        </View>
                                        <View style={s.activeBody}>
                                            <Text style={s.activeTitle} numberOfLines={1}>{task.title}</Text>
                                            <Text style={s.activeMeta}>
                                                {task.client.firstName} {task.client.lastName.charAt(0)}.
                                                {'  ·  '}
                                                {fmtDate(task.scheduledDate, task.scheduledStart)}
                                            </Text>
                                        </View>
                                        <View style={s.activeRight}>
                                            {task.agreedPrice ? (
                                                <Text style={s.activePrice}>{task.agreedPrice} MAD</Text>
                                            ) : null}
                                            <View style={[s.statusChip, chipStyle]}>
                                                <Text style={[s.statusChipTxt, chipTxtStyle]}>
                                                    {isStarted
                                                        ? (isFr ? 'En cours' : 'جارٍ')
                                                        : (isFr ? 'Confirmé' : 'مؤكد')}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>

                    <View style={s.section}>
                        <Text style={s.sectionTitle}>{isFr ? 'Actions rapides' : 'إجراءات سريعة'}</Text>
                        <View style={s.quickRow}>
                            <TouchableOpacity
                                style={s.quickBtn}
                                activeOpacity={0.78}
                                onPress={() => Alert.alert(isFr ? 'Disponibilité' : 'الجدول', isFr ? 'Gérez vos créneaux dans votre profil.' : 'أدر مواعيدك من ملفك الشخصي.')}
                            >
                                <Text style={s.quickEmoji}>📅</Text>
                                <Text style={s.quickLabel}>{isFr ? 'Disponibilité' : 'الجدول'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.quickBtn}
                                activeOpacity={0.78}
                                onPress={() => Alert.alert(isFr ? 'Mon profil' : 'ملفي', isFr ? 'Mettez à jour vos informations et services.' : 'حدّث معلوماتك وخدماتك.')}
                            >
                                <Text style={s.quickEmoji}>👤</Text>
                                <Text style={s.quickLabel}>{isFr ? 'Mon profil' : 'ملفي'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.quickBtn}
                                activeOpacity={0.78}
                                onPress={() => Alert.alert(isFr ? 'Revenus' : 'الأرباح', isFr ? `Total ce mois : ${Math.round(revenue)} MAD` : `إجمالي هذا الشهر: ${Math.round(revenue)} د.م.`)}
                            >
                                <Text style={s.quickEmoji}>📊</Text>
                                <Text style={s.quickLabel}>{isFr ? 'Revenus' : 'الأرباح'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.quickBtn}
                                activeOpacity={0.78}
                                onPress={() => Alert.alert(isFr ? 'Messages' : 'الرسائل', isFr ? 'Accédez à vos conversations dans la prochaine mise à jour.' : 'ستصل المحادثات في التحديث القادم.')}
                            >
                                <Text style={s.quickEmoji}>💬</Text>
                                <Text style={s.quickLabel}>{isFr ? 'Messages' : 'الرسائل'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={s.scrollBottom} />
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    loader:                 { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
    root:                   { flex: 1, backgroundColor: '#F2F3F7' },
    bodyWrap:               { flex: 1 },

    header:                 { paddingTop: 10, paddingBottom: 22, paddingHorizontal: 20 },
    headerRow:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    brandRow:               { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logo:                   { width: 28, height: 28, borderRadius: 8 },
    appName:                { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    workerPill:             { backgroundColor: 'rgba(249,115,22,0.22)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3, alignSelf: 'flex-start' },
    workerPillText:         { fontSize: 9, color: C.orange, fontWeight: '700', letterSpacing: 0.2 },
    headerRight:            { flexDirection: 'row', gap: 8 },
    iconBtn:                { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.09)', alignItems: 'center', justifyContent: 'center' },
    iconBtnText:            { fontSize: 14 },

    greeting:               { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 2 },
    subGreeting:            { fontSize: 13, color: 'rgba(155,143,204,0.85)', marginBottom: 20 },

    scroll:                 { padding: 16 },
    scrollBottom:           { height: 40 },

    alertBanner:            { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FED7AA' },
    alertEmoji:             { fontSize: 18 },
    alertText:              { flex: 1, fontSize: 13, fontWeight: '600', color: '#C2410C' },

    section:                { marginBottom: 26 },
    sectionRow:             { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
    sectionTitle:           { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1.2 },
    countChip:              { backgroundColor: C.orange, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
    countChipText:          { fontSize: 11, fontWeight: '800', color: '#fff' },

    availCard:              { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 4 },
    availTop:               { flexDirection: 'row', gap: 13, marginBottom: 14 },
    availIconWrap:          { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    availEmoji:             { fontSize: 22 },
    availInfo:              { flex: 1, gap: 4 },
    availTitleRow:          { flexDirection: 'row', alignItems: 'center', gap: 7 },
    availTitle:             { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827', letterSpacing: -0.2 },
    availMeta:              { fontSize: 11, color: '#9CA3AF', lineHeight: 17 },
    availDivider:           { height: 1, backgroundColor: '#F3F4F6', marginBottom: 13 },
    availFoot:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetLbl:              { fontSize: 10, color: '#9CA3AF', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
    budgetVal:              { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
    acceptBtn:              { backgroundColor: C.orange, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 11, shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
    acceptBtnBusy:          { opacity: 0.65 },
    acceptTxt:              { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

    emptyBox:               { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    emptyEmoji:             { fontSize: 40, marginBottom: 12 },
    emptyTitle:             { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 7 },
    emptySub:               { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
    emptyBoxSm:             { backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center' },
    emptySmTxt:             { fontSize: 13, color: '#9CA3AF' },

    activeCard:             { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7, elevation: 2 },
    activeLeft:             { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    activeEmoji:            { fontSize: 19 },
    activeBody:             { flex: 1 },
    activeTitle:            { fontSize: 13, fontWeight: '700', color: '#111827', letterSpacing: -0.2, marginBottom: 4 },
    activeMeta:             { fontSize: 11, color: '#9CA3AF' },
    activeRight:            { alignItems: 'flex-end', gap: 5 },
    activePrice:            { fontSize: 13, fontWeight: '800', color: '#111827' },
    statusChip:             { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusChipStarted:      { backgroundColor: '#EDE9FE' },
    statusChipConfirmed:    { backgroundColor: '#DBEAFE' },
    statusChipTxt:          { fontSize: 10, fontWeight: '700' },
    statusChipTxtStarted:   { color: '#7C3AED' },
    statusChipTxtConfirmed: { color: '#1D4ED8' },

    quickRow:               { flexDirection: 'row', gap: 10 },
    quickBtn:               { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7, elevation: 2 },
    quickEmoji:             { fontSize: 22 },
    quickLabel:             { fontSize: 10, fontWeight: '600', color: '#374151', textAlign: 'center' },
});