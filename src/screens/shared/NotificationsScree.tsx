import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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

const BASE_URL = 'http://192.168.1.13:8080/api/v1';

interface Props {
  lang:               Lang;
  onBack:             () => void;
  onNavigateToTask?:  (taskId: number, role: string) => void;
}

interface Notification {
  id:              number;
  type:            string;
  title:           string;
  body:            string;
  isRead:          boolean;
  referenceType?:  string;
  referenceId?:    number;
  createdAt:       string;
}

const NOTIF_ICON: Record<string, string> = {
  NEW_TASK:         '🔧',
  TASK_ACCEPTED:    '✅',
  TASK_COMPLETED:   '🏆',
  NEW_MESSAGE:      '💬',
  PAYMENT_RECEIVED: '💰',
  REVIEW_RECEIVED:  '⭐',
};

function relativeTime(createdAt: string, isFr: boolean): string {
  const diff  = Date.now() - new Date(createdAt).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (isFr) {
    if (mins < 1)   return "à l'instant";
    if (mins < 60)  return `il y a ${mins} min`;
    if (hours < 24) return `il y a ${hours}h`;
    return `il y a ${days}j`;
  } else {
    if (mins < 1)   return 'الآن';
    if (mins < 60)  return `منذ ${mins} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  }
}

export default function NotificationsScreen({ lang, onBack, onNavigateToTask }: Props) {
  const isFr  = lang === 'fr';
  const isRTL = lang === 'ar';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [page,          setPage]          = useState(0);
  const [hasMore,       setHasMore]       = useState(true);
  const [markingAll,    setMarkingAll]    = useState(false);

  // ── fetch a page ──────────────────────────────────────────────────────────
  async function fetchPage(pageNum: number, reset = false) {
    try {
      const session = await TokenStorage.get();
      if (!session) return;
      const res = await fetch(
        `${BASE_URL}/notifications?sort=createdAt,desc&page=${pageNum}&size=20`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      if (!res.ok) return;
      const data = await res.json();

      // Support both paginated {content, last} and plain array responses
      const items: Notification[] = Array.isArray(data) ? data : (data.content ?? []);
      setHasMore(Array.isArray(data) ? false : !data.last);
      setNotifications(prev => reset ? items : [...prev, ...items]);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const refresh = useCallback(() => {
    setRefreshing(true);
    setPage(0);
    fetchPage(0, true);
  }, []);

  useEffect(() => { fetchPage(0, true); }, []);

  // ── mark one read ─────────────────────────────────────────────────────────
  async function markOneRead(id: number) {
    try {
      const session = await TokenStorage.get();
      if (!session) return;
      await fetch(`${BASE_URL}/notifications/${id}/read`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  }

  // ── mark all read ─────────────────────────────────────────────────────────
  async function markAllRead() {
    setMarkingAll(true);
    try {
      const session = await TokenStorage.get();
      if (!session) return;
      await fetch(`${BASE_URL}/notifications/read-all`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
    } finally {
      setMarkingAll(false);
    }
  }

  // ── tap card ──────────────────────────────────────────────────────────────
  function handleTap(notif: Notification) {
    if (!notif.isRead) markOneRead(notif.id);
    if (notif.referenceType === 'TASK' && notif.referenceId != null && onNavigateToTask) {
      onNavigateToTask(notif.referenceId, 'CLIENT');
    }
  }

  // ── load more ─────────────────────────────────────────────────────────────
  function loadMore() {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }

  // ── loading state ─────────────────────────────────────────────────────────
  if (loading && notifications.length === 0) {
    return (
      <View style={s.loaderWrap}>
        <ActivityIndicator size="large" color={C.orange} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0912" />

      {/* ── header ── */}
      <LinearGradient colors={['#0A0912', '#131221']} style={s.header}>
        <View style={[s.headerRow, isRTL && s.rowRev]}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={s.backText}>{isRTL ? '›' : '‹'}</Text>
          </TouchableOpacity>

          <Text style={s.headerTitle}>
            {isFr ? 'Notifications' : 'الإشعارات'}
          </Text>

          <TouchableOpacity
            style={s.markAllBtn}
            onPress={markAllRead}
            disabled={markingAll}
            activeOpacity={0.7}
          >
            {markingAll
              ? <ActivityIndicator size="small" color={C.orange} />
              : <Text style={s.markAllText}>{isFr ? 'Tout lire' : 'قراءة الكل'}</Text>
            }
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── list ── */}
      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={[s.list, notifications.length === 0 && s.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={C.orange}
            colors={[C.orange]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🔔</Text>
            <Text style={s.emptyText}>
              {isFr ? 'Aucune notification' : 'لا توجد إشعارات'}
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMore && notifications.length > 0
            ? <ActivityIndicator size="small" color={C.orange} style={s.footer} />
            : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, item.isRead ? s.cardRead : s.cardUnread]}
            onPress={() => handleTap(item)}
            activeOpacity={0.78}
          >
            <Text style={s.cardIcon}>{NOTIF_ICON[item.type] ?? '🔔'}</Text>

            <View style={s.cardBody}>
              <Text style={[s.cardTitle, isRTL && s.rtl]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[s.cardBodyText, isRTL && s.rtl]} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={[s.cardTime, isRTL && s.rtl]}>
                {relativeTime(item.createdAt, isFr)}
              </Text>
            </View>

            {!item.isRead && <View style={s.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F2F3F7' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F3F7' },

  // header
  header:      { paddingTop: 12, paddingBottom: 18, paddingHorizontal: 20 },
  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowRev:      { flexDirection: 'row-reverse' },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backText:    { color: '#fff', fontSize: 24, lineHeight: 28 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 6 },
  markAllText: { fontSize: 12, color: C.orange, fontWeight: '700' },

  // list
  list:      { padding: 16, paddingTop: 12 },
  listEmpty: { flexGrow: 1 },
  footer:    { paddingVertical: 20 },

  // card
  card: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    borderRadius:   16,
    padding:        14,
    marginBottom:   8,
    gap:            12,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.05,
    shadowRadius:   6,
    elevation:      2,
  },
  cardRead:    { backgroundColor: '#F5F6FA' },
  cardUnread:  { backgroundColor: '#fff', borderLeftWidth: 3, borderLeftColor: C.orange },
  cardIcon:    { fontSize: 22, marginTop: 1 },
  cardBody:    { flex: 1, gap: 3 },
  cardTitle:   { fontSize: 13, fontWeight: '700', color: '#111827' },
  cardBodyText:{ fontSize: 12, color: '#6B7280', lineHeight: 18 },
  cardTime:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange, marginTop: 6 },

  rtl: { textAlign: 'right' },

  // empty
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText:  { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
});