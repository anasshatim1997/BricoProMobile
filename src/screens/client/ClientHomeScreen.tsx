import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
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
import { Lang } from '../../i18n';
import { TokenStorage } from '../../storage/token';
import { tasksApi, Task, TaskStatus } from '../../api/tasks';
import { TaskCard } from '../../component/common/TaskCard';
import {useFocusEffect} from "@react-navigation/core";

interface Props {
    lang: Lang;
    onLogout: () => void;
    onPostTask: () => void;
    onTaskPress: (taskId: number) => void;
}

type TabKey = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

const TABS: { key: TabKey; fr: string; ar: string; statuses?: TaskStatus[] }[] = [
    { key: 'ALL',       fr: 'Toutes',    ar: 'الكل' },
    { key: 'ACTIVE',    fr: 'En cours',  ar: 'النشطة',  statuses: ['SEARCHING', 'CONFIRMED', 'STARTED'] },
    { key: 'COMPLETED', fr: 'Terminées', ar: 'المنجزة', statuses: ['COMPLETED'] },
    { key: 'CANCELLED', fr: 'Annulées',  ar: 'الملغاة', statuses: ['CANCELLED'] },
];

export function ClientHomeScreen({ lang, onLogout, onPostTask, onTaskPress }: Props) {
    const isFr  = lang === 'fr';
    const isRTL = lang === 'ar';

    const [allTasks,   setAllTasks]   = useState<Task[]>([]);
    const [tasks,      setTasks]      = useState<Task[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab,        setTab]        = useState<TabKey>('ALL');

    // Fetch always reads the token fresh — no race condition
    const fetchAll = useCallback(async () => {
        const session = await TokenStorage.get();
        if (!session?.accessToken) return;
        const token = session.accessToken;
        try {
            const res = await tasksApi.getClientTasks(token, undefined, 0, 50);
            const content = res.content ?? [];
            setAllTasks(content);
        } catch (e) {
            console.error('fetchAll error:', e);
            setAllTasks([]);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchAll().finally(() => setLoading(false));
        }, [fetchAll]),
    );

    useEffect(() => {
        const tabMeta = TABS.find(t => t.key === tab);
        if (!tabMeta?.statuses) {
            setTasks(allTasks);
        } else {
            setTasks(allTasks.filter(t => tabMeta.statuses!.includes(t.status)));
        }
    }, [tab, allTasks]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAll();
        setRefreshing(false);
    };

    const activeCount = allTasks.filter(t =>
        ['SEARCHING', 'CONFIRMED', 'STARTED'].includes(t.status),
    ).length;

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <LinearGradient colors={['#FFFFFF', '#F8F9FC']} style={s.header}>
                <View>
                    <Text style={[s.headerTitle, isRTL && s.rtl]}>
                        {isFr ? 'Mes demandes' : 'طلباتي'}
                    </Text>
                    {activeCount > 0 && (
                        <Text style={[s.headerSub, isRTL && s.rtl]}>
                            {isFr
                                ? `${activeCount} demande${activeCount > 1 ? 's' : ''} en cours`
                                : `${activeCount} طلب نشط`}
                        </Text>
                    )}
                </View>
                <TouchableOpacity style={s.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
                    <Text style={s.logoutText}>{isFr ? 'Déconn.' : 'خروج'}</Text>
                </TouchableOpacity>
            </LinearGradient>

            <View style={s.tabsWrap}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.tabs}
                >
                    {TABS.map(t => (
                        <TouchableOpacity
                            key={t.key}
                            style={[s.tab, tab === t.key && s.tabActive]}
                            onPress={() => setTab(t.key)}
                            activeOpacity={0.75}
                        >
                            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>
                                {isFr ? t.fr : t.ar}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator color={C.orange} size="large" />
                </View>
            ) : tasks.length === 0 ? (
                <View style={s.empty}>
                    <Text style={s.emptyEmoji}>📋</Text>
                    <Text style={[s.emptyTitle, isRTL && s.rtl]}>
                        {tab === 'ALL'
                            ? (isFr ? 'Aucune demande' : 'لا توجد طلبات')
                            : (isFr ? 'Aucun résultat' : 'لا يوجد نتائج')}
                    </Text>
                    {tab === 'ALL' && (
                        <Text style={[s.emptySub, isRTL && s.rtl]}>
                            {isFr
                                ? 'Appuyez sur + pour créer votre première demande'
                                : 'اضغط + لإنشاء أول طلب'}
                        </Text>
                    )}
                </View>
            ) : (
                <FlatList
                    data={tasks}
                    keyExtractor={item => String(item.id)}
                    renderItem={({ item }) => (
                        <TaskCard
                            task={item}
                            lang={lang}
                            onPress={() => onTaskPress(item.id)}
                        />
                    )}
                    contentContainerStyle={s.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={C.orange}
                            colors={[C.orange]}
                        />
                    }
                />
            )}

            <TouchableOpacity style={s.fab} onPress={onPostTask} activeOpacity={0.85}>
                <LinearGradient
                    colors={[C.orange, C.red]}
                    style={s.fabGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={s.fabPlus}>+</Text>
                </LinearGradient>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F6FA' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
    headerSub:   { fontSize: 12, color: C.orange, marginTop: 2, fontWeight: '600' },
    logoutBtn:   { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 10 },
    logoutText:  { fontSize: 13, fontWeight: '600', color: '#374151' },

    tabsWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
    tabs:     { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
    tab:      {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    tabActive:     { backgroundColor: C.orange + '18', borderColor: C.orange },
    tabText:       { fontSize: 13, fontWeight: '500', color: '#6B7280' },
    tabTextActive: { color: C.orange, fontWeight: '700' },

    list:   { padding: 16, paddingBottom: 100 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', textAlign: 'center' },
    emptySub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: C.orange,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 10,
    },
    fabGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    fabPlus: { color: '#fff', fontSize: 32, fontWeight: '300', lineHeight: 36, marginTop: -2 },

    rtl: { textAlign: 'right' },
});