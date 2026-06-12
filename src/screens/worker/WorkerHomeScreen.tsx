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
import { SERVICES } from '../../constants/services';
import { Lang } from '../../i18n';
import { TokenStorage } from '../../storage/token';
import { tasksApi, Task, TaskStatus } from '../../api/tasks';
import { TaskCard } from '../../component/common/TaskCard';

interface Props {
    lang: Lang;
    onLogout: () => void;
    onTaskPress: (taskId: number) => void;
}

type MainTab   = 'AVAILABLE' | 'MINE';
type MineTab   = 'ALL' | 'CONFIRMED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

const MINE_TABS: { key: MineTab; fr: string; ar: string }[] = [
    { key: 'ALL',       fr: 'Toutes',     ar: 'الكل' },
    { key: 'CONFIRMED', fr: 'Confirmées', ar: 'مؤكدة' },
    { key: 'STARTED',   fr: 'En cours',   ar: 'جارية' },
    { key: 'COMPLETED', fr: 'Terminées',  ar: 'منجزة' },
    { key: 'CANCELLED', fr: 'Annulées',   ar: 'ملغاة' },
];

export function WorkerHomeScreen({ lang, onLogout, onTaskPress }: Props) {
    const isFr  = lang === 'fr';
    const isRTL = lang === 'ar';

    const [token,      setToken]      = useState<string | null>(null);
    const [mainTab,    setMainTab]    = useState<MainTab>('AVAILABLE');
    const [svcFilter,  setSvcFilter]  = useState<string | undefined>(undefined);
    const [mineTab,    setMineTab]    = useState<MineTab>('ALL');
    const [available,  setAvailable]  = useState<Task[]>([]);
    const [mine,       setMine]       = useState<Task[]>([]);
    const [allMine,    setAllMine]    = useState<Task[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        TokenStorage.get().then(session => {
            if (session) setToken(session.accessToken);
        });
    }, []);

    const fetchAvailable = useCallback(async () => {
        if (!token) return;
        try {
            const res = await tasksApi.getAvailable(token, svcFilter, 0, 50);
            setAvailable(res.content ?? []);
        } catch {
            setAvailable([]);
        }
    }, [token, svcFilter]);

    const fetchMine = useCallback(async () => {
        if (!token) return;
        try {
            const res = await tasksApi.getWorkerTasks(token, undefined, 0, 50);
            const content = res.content ?? [];
            setAllMine(content);
            setMine(content);
        } catch {
            setAllMine([]);
            setMine([]);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        const fn = mainTab === 'AVAILABLE' ? fetchAvailable : fetchMine;
        fn().finally(() => setLoading(false));
    }, [token, mainTab, svcFilter]);

    useEffect(() => {
        if (mineTab === 'ALL') {
            setMine(allMine);
        } else {
            setMine(allMine.filter(t => t.status === (mineTab as TaskStatus)));
        }
    }, [mineTab, allMine]);

    const onRefresh = async () => {
        setRefreshing(true);
        await (mainTab === 'AVAILABLE' ? fetchAvailable() : fetchMine());
        setRefreshing(false);
    };

    const activeCount = allMine.filter(t =>
        ['CONFIRMED', 'STARTED'].includes(t.status),
    ).length;

    const data = mainTab === 'AVAILABLE' ? available : mine;

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <LinearGradient colors={['#FFFFFF', '#F8F9FC']} style={s.header}>
                <View>
                    <Text style={[s.headerTitle, isRTL && s.rtl]}>
                        {mainTab === 'AVAILABLE'
                            ? (isFr ? 'Missions disponibles' : 'المهام المتاحة')
                            : (isFr ? 'Mes missions' : 'مهامي')}
                    </Text>
                    {mainTab === 'MINE' && activeCount > 0 && (
                        <Text style={[s.headerSub, isRTL && s.rtl]}>
                            {isFr
                                ? `${activeCount} mission${activeCount > 1 ? 's' : ''} en cours`
                                : `${activeCount} مهمة نشطة`}
                        </Text>
                    )}
                    {mainTab === 'AVAILABLE' && (
                        <Text style={[s.headerSub, isRTL && s.rtl]}>
                            {isFr
                                ? `${available.length} demande${available.length !== 1 ? 's' : ''} trouvée${available.length !== 1 ? 's' : ''}`
                                : `${available.length} طلب متاح`}
                        </Text>
                    )}
                </View>
                <TouchableOpacity style={s.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
                    <Text style={s.logoutText}>{isFr ? 'Déconn.' : 'خروج'}</Text>
                </TouchableOpacity>
            </LinearGradient>

            <View style={s.mainTabs}>
                {(['AVAILABLE', 'MINE'] as MainTab[]).map(key => (
                    <TouchableOpacity
                        key={key}
                        style={[s.mainTab, mainTab === key && s.mainTabActive]}
                        onPress={() => setMainTab(key)}
                        activeOpacity={0.75}
                    >
                        <Text style={[s.mainTabText, mainTab === key && s.mainTabTextActive]}>
                            {key === 'AVAILABLE'
                                ? (isFr ? '🔍 Disponibles' : '🔍 متاحة')
                                : (isFr ? '📋 Mes missions' : '📋 مهامي')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {mainTab === 'AVAILABLE' && (
                <View style={s.filterWrap}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.filters}
                    >
                        <TouchableOpacity
                            style={[s.filterPill, !svcFilter && s.filterPillOn]}
                            onPress={() => setSvcFilter(undefined)}
                        >
                            <Text style={[s.filterText, !svcFilter && s.filterTextOn]}>
                                {isFr ? 'Tous' : 'الكل'}
                            </Text>
                        </TouchableOpacity>
                        {SERVICES.map(svc => {
                            const on = svcFilter === svc.key;
                            return (
                                <TouchableOpacity
                                    key={svc.key}
                                    style={[
                                        s.filterPill,
                                        on && s.filterPillOn,
                                        on && { borderColor: svc.color, backgroundColor: svc.color + '18' },
                                    ]}
                                    onPress={() => setSvcFilter(on ? undefined : svc.key)}
                                >
                                    <Text style={s.filterEmoji}>{svc.icon}</Text>
                                    <Text style={[s.filterText, on && s.filterTextOn, on && { color: svc.color }]}>
                                        {isFr ? svc.fr : svc.ar}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {mainTab === 'MINE' && (
                <View style={s.filterWrap}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.filters}
                    >
                        {MINE_TABS.map(t => (
                            <TouchableOpacity
                                key={t.key}
                                style={[s.filterPill, mineTab === t.key && s.filterPillOn]}
                                onPress={() => setMineTab(t.key)}
                            >
                                <Text style={[s.filterText, mineTab === t.key && s.filterTextOn]}>
                                    {isFr ? t.fr : t.ar}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator color={C.orange} size="large" />
                </View>
            ) : data.length === 0 ? (
                <View style={s.empty}>
                    <Text style={s.emptyEmoji}>
                        {mainTab === 'AVAILABLE' ? '🔍' : '📋'}
                    </Text>
                    <Text style={[s.emptyTitle, isRTL && s.rtl]}>
                        {mainTab === 'AVAILABLE'
                            ? (isFr ? 'Aucune mission disponible' : 'لا توجد مهام متاحة')
                            : (isFr ? 'Aucune mission trouvée' : 'لا توجد مهام')}
                    </Text>
                    <Text style={[s.emptySub, isRTL && s.rtl]}>
                        {mainTab === 'AVAILABLE'
                            ? (isFr ? 'Revenez plus tard ou changez le filtre' : 'عد لاحقاً أو غيّر الفلتر')
                            : (isFr ? 'Acceptez une mission pour qu\'elle apparaisse ici' : 'اقبل مهمة لتظهر هنا')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={data}
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

    mainTabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
    },
    mainTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2.5,
        borderBottomColor: 'transparent',
    },
    mainTabActive:     { borderBottomColor: C.orange },
    mainTabText:       { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    mainTabTextActive: { color: C.orange },

    filterWrap:  { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
    filters:     { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, gap: 8, alignItems: 'center' },
    filterPill:  {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    filterPillOn:  { borderColor: C.orange, backgroundColor: C.orange + '15' },
    filterEmoji:   { fontSize: 13 },
    filterText:    { fontSize: 12, fontWeight: '500', color: '#6B7280' },
    filterTextOn:  { color: C.orange, fontWeight: '700' },

    list:   { padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    emptyEmoji: { fontSize: 52 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', textAlign: 'center' },
    emptySub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

    rtl: { textAlign: 'right' },
});