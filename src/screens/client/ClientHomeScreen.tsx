import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
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
import { SERVICES, SVC_ICON } from '../../constants/services';
import { Lang } from '../../i18n';
import { TokenStorage } from '../../storage/token';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { NotificationBell, StatStrip, UrgentPill } from '../../component';

interface Props {
    lang:        Lang;
    onLogout:    () => void;
    onPostTask:  () => void;
    onTaskPress: (taskId: number) => void;
}

interface DashStats {
    activeRequests:    number;
    completedRequests: number;
    cancelledRequests: number;
    currentMonthSpent: number;
    totalSpent:        number;
}

interface TaskItem {
    id:             number;
    title:          string;
    serviceType:    string;
    status:         string;
    scheduledDate:  string;
    scheduledStart: string;
    address:        string;
    isUrgent:       boolean;
    agreedPrice?:   number;
    budgetMin?:     number;
    worker?: { firstName: string; lastName: string; avatarUrl?: string };
}

const STATUS_META: Record<string, { dot: string; fr: string; ar: string }> = {
    SEARCHING: { dot: '#F59E0B', fr: 'En recherche', ar: 'قيد البحث' },
    CONFIRMED: { dot: '#3B82F6', fr: 'Confirmé',     ar: 'مؤكد'     },
    STARTED:   { dot: '#8B5CF6', fr: 'En cours',     ar: 'جارٍ'     },
    COMPLETED: { dot: '#10B981', fr: 'Terminé',       ar: 'منتهٍ'    },
    CANCELLED: { dot: '#EF4444', fr: 'Annulé',        ar: 'ملغى'     },
    DISPUTED:  { dot: '#EF4444', fr: 'Litige',        ar: 'نزاع'     },
};

function greeting(fr: boolean): string {
    const h = new Date().getHours();
    if (fr) {
        if (h < 12) return 'Bonjour 🌅';
        if (h < 18) return 'Bon après-midi ☀️';
        return 'Bonsoir 🌙';
    }
    if (h < 12) return 'صباح الخير 🌅';
    if (h < 18) return 'مساء النهار ☀️';
    return 'مساء الخير 🌙';
}

function Chevron() {
    return (
        <View style={ch.wrap}>
            <View style={ch.stem} />
            <View style={ch.top} />
            <View style={ch.bot} />
        </View>
    );
}

const ch = StyleSheet.create({
    wrap: { width: 18, height: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    stem: { position: 'absolute', right: 5, width: 7, height: 1.8, backgroundColor: '#C8CDD8', borderRadius: 1 },
    top:  { position: 'absolute', right: 5, top: 4,  width: 5, height: 1.8, backgroundColor: '#C8CDD8', borderRadius: 1, transform: [{ rotate: '-45deg' }] },
    bot:  { position: 'absolute', right: 5, bottom: 4, width: 5, height: 1.8, backgroundColor: '#C8CDD8', borderRadius: 1, transform: [{ rotate: '45deg' }] },
});

export function ClientHomeScreen({ lang, onLogout, onPostTask, onTaskPress }: Props) {
    const isFr      = lang === 'fr';
    const authFetch = useAuthFetch();

    const [stats, setStats]           = useState<DashStats>({ activeRequests: 0, completedRequests: 0, cancelledRequests: 0, currentMonthSpent: 0, totalSpent: 0 });
    const [tasks, setTasks]           = useState<TaskItem[]>([]);
    const [notifCount, setNotifCount] = useState(0);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const headerY = useRef(new Animated.Value(-12)).current;
    const headerO = useRef(new Animated.Value(0)).current;
    const bodyO   = useRef(new Animated.Value(0)).current;
    const bodyY   = useRef(new Animated.Value(18)).current;

    const fetchAll = useCallback(async () => {
        try {
            const [dash, tasksPage, notif] = await Promise.all([
                authFetch('/analytics/client'),
                authFetch('/tasks/mine/client?size=4&sort=createdAt,desc'),
                authFetch('/notifications/unread-count'),
            ]);
            if (dash) {
                setStats({
                    activeRequests:    dash.activeRequests    ?? 0,
                    completedRequests: dash.completedRequests ?? 0,
                    cancelledRequests: dash.cancelledRequests ?? 0,
                    currentMonthSpent: dash.currentMonthSpent ?? 0,
                    totalSpent:        dash.totalSpent        ?? 0,
                });
            }
            if (tasksPage?.content) setTasks(tasksPage.content);
            if (notif?.count !== undefined) setNotifCount(notif.count);
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

    async function handleLogout() {
        await TokenStorage.clear();
        onLogout();
    }

    function fmtDate(d: string) {
        return new Date(d).toLocaleDateString(isFr ? 'fr-FR' : 'ar-MA', { day: 'numeric', month: 'short' });
    }

    function fmtPrice(t: TaskItem) {
        if (t.agreedPrice) return `${t.agreedPrice} MAD`;
        if (t.budgetMin)   return `~${t.budgetMin} MAD`;
        return isFr ? 'À négocier' : 'قابل للتفاوض';
    }

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

                    <View style={s.topBar}>
                        <View style={s.brandRow}>
                            <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
                            <Text style={s.appName}>BricoPro</Text>
                        </View>
                        <View style={s.topActions}>
                            <NotificationBell count={notifCount} />
                            <TouchableOpacity style={s.exitChip} onPress={handleLogout} activeOpacity={0.7}>
                                <Text style={s.exitDot}>·</Text>
                                <Text style={s.exitText}>{isFr ? 'Quitter' : 'خروج'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={s.greetTitle}>{greeting(isFr)}</Text>
                    <Text style={s.greetSub}>
                        {isFr ? "Que souhaitez-vous faire aujourd'hui ?" : 'ماذا تريد أن تفعل اليوم؟'}
                    </Text>

                    <StatStrip items={[
                        { value: stats.activeRequests,    label: isFr ? 'En cours'    : 'نشطة'          },
                        { value: stats.completedRequests, label: isFr ? 'Terminées'   : 'منجزة'          },
                        { value: stats.currentMonthSpent > 0 ? Math.round(stats.currentMonthSpent) : 0,
                            label: isFr ? 'MAD ce mois'  : 'د.م. الشهر' },
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
                    <TouchableOpacity onPress={onPostTask} activeOpacity={0.88} style={s.ctaWrap}>
                        <LinearGradient
                            colors={['#F97316', '#EF4444']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={s.ctaGrad}
                        >
                            <View style={s.ctaLeft}>
                                <Text style={s.ctaTitle}>
                                    {isFr ? 'Demander un service' : 'طلب خدمة جديدة'}
                                </Text>
                                <Text style={s.ctaSub}>
                                    {isFr ? 'Trouvez un pro en quelques minutes' : 'ابحث عن محترف في دقائق'}
                                </Text>
                            </View>
                            <View style={s.ctaIconWrap}>
                                <Text style={s.ctaPlus}>+</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={s.section}>
                        <Text style={s.sectionTitle}>
                            {isFr ? 'Services populaires' : 'الخدمات الشائعة'}
                        </Text>
                        <View style={s.svcGrid}>
                            {SERVICES.map((svc) => (
                                <TouchableOpacity
                                    key={svc.key}
                                    style={[s.svcChip, { backgroundColor: svc.color + '12', borderColor: svc.color + '30' }]}
                                    activeOpacity={0.72}
                                    onPress={onPostTask}
                                >
                                    <Text style={s.svcEmoji}>{svc.icon}</Text>
                                    <Text style={[s.svcLabel, { color: svc.color }]} numberOfLines={1}>
                                        {isFr ? svc.fr : svc.ar}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={s.section}>
                        <View style={s.sectionRow}>
                            <Text style={s.sectionTitle}>
                                {isFr ? 'Mes demandes' : 'طلباتي'}
                            </Text>
                            {tasks.length > 0 && (
                                <TouchableOpacity activeOpacity={0.7}>
                                    <Text style={s.seeAll}>{isFr ? 'Tout voir' : 'عرض الكل'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {tasks.length === 0 ? (
                            <View style={s.emptyBox}>
                                <View style={s.emptyIconWrap}>
                                    <Text style={s.emptyEmoji}>📋</Text>
                                </View>
                                <Text style={s.emptyTitle}>
                                    {isFr ? 'Aucune demande en cours' : 'لا توجد طلبات نشطة'}
                                </Text>
                                <Text style={s.emptySub}>
                                    {isFr
                                        ? 'Postez votre première demande et trouvez un prestataire rapidement.'
                                        : 'انشر طلبك الأول وابحث عن مزود خدمة بسرعة.'}
                                </Text>
                                <TouchableOpacity style={s.emptyBtn} onPress={onPostTask} activeOpacity={0.85}>
                                    <Text style={s.emptyBtnText}>
                                        {isFr ? 'Commencer maintenant' : 'ابدأ الآن'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            tasks.map((task) => {
                                const sm = STATUS_META[task.status] ?? STATUS_META.SEARCHING;
                                return (
                                    <TouchableOpacity
                                        key={task.id}
                                        style={s.taskCard}
                                        activeOpacity={0.78}
                                        onPress={() => onTaskPress(task.id)}
                                    >
                                        <View style={s.taskIconWrap}>
                                            <Text style={s.taskEmoji}>{SVC_ICON[task.serviceType] ?? '🔧'}</Text>
                                        </View>
                                        <View style={s.taskBody}>
                                            <View style={s.taskTitleRow}>
                                                <Text style={s.taskTitle} numberOfLines={1}>{task.title}</Text>
                                                {task.isUrgent && <UrgentPill lang={lang} />}
                                            </View>
                                            <Text style={s.taskSub} numberOfLines={1}>
                                                {task.worker
                                                    ? `${task.worker.firstName} ${task.worker.lastName}`
                                                    : (isFr ? "Recherche d'un prestataire…" : 'البحث عن مزود…')}
                                                {'  ·  '}
                                                {fmtDate(task.scheduledDate)}
                                            </Text>
                                            <View style={s.taskFoot}>
                                                <View style={[s.statusPill, { backgroundColor: sm.dot + '18' }]}>
                                                    <View style={[s.statusDot, { backgroundColor: sm.dot }]} />
                                                    <Text style={[s.statusTxt, { color: sm.dot }]}>
                                                        {isFr ? sm.fr : sm.ar}
                                                    </Text>
                                                </View>
                                                <Text style={s.taskPrice}>{fmtPrice(task)}</Text>
                                            </View>
                                        </View>
                                        <Chevron />
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>

                    <View style={s.scrollBottom} />
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    loader:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F3F7' },
    root:     { flex: 1, backgroundColor: '#F2F3F7' },
    bodyWrap: { flex: 1 },

    header:    { paddingTop: 10, paddingBottom: 24, paddingHorizontal: 20 },

    topBar:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    brandRow:   { flexDirection: 'row', alignItems: 'center', gap: 9 },
    logo:       { width: 28, height: 28, borderRadius: 8 },
    appName:    { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    exitChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    exitDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 2 },
    exitText:   { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },

    greetTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.6, marginBottom: 4 },
    greetSub:   { fontSize: 13, color: 'rgba(155,143,204,0.8)', marginBottom: 22 },

    scroll:       { padding: 16 },
    scrollBottom: { height: 40 },

    ctaWrap: { marginBottom: 24 },
    ctaGrad: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#F97316', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 12 },
    ctaLeft: { flex: 1 },
    ctaTitle:{ fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 4 },
    ctaSub:  { fontSize: 12, color: 'rgba(255,255,255,0.72)' },
    ctaIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    ctaPlus:     { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32, marginTop: -2 },

    section:     { marginBottom: 28 },
    sectionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle:{ fontSize: 16, fontWeight: '700', color: '#111827', letterSpacing: -0.2, marginBottom: 14 },
    seeAll:      { fontSize: 13, color: C.purpleMid, fontWeight: '600', marginBottom: 14 },

    svcGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    svcChip:  { width: '30.5%', borderRadius: 16, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 6 },
    svcEmoji: { fontSize: 24 },
    svcLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 15 },

    taskCard:    { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#0A0912', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
    taskIconWrap:{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginRight: 13, flexShrink: 0 },
    taskEmoji:   { fontSize: 21 },
    taskBody:    { flex: 1, gap: 5 },
    taskTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 7 },
    taskTitle:   { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827', letterSpacing: -0.2 },
    taskSub:     { fontSize: 11, color: '#9CA3AF' },
    taskFoot:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    statusDot:   { width: 5, height: 5, borderRadius: 3 },
    statusTxt:   { fontSize: 10, fontWeight: '700' },
    taskPrice:   { fontSize: 13, fontWeight: '700', color: '#111827' },

    emptyBox:     { backgroundColor: '#fff', borderRadius: 24, padding: 36, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    emptyIconWrap:{ width: 72, height: 72, borderRadius: 22, backgroundColor: '#F4F5F7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyEmoji:   { fontSize: 36 },
    emptyTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
    emptySub:     { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyBtn:     { backgroundColor: C.orange, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13, shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
    emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});