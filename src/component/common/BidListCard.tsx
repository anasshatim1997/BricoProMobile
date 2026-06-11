import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { C } from '../../constants';
import { Bid } from '../../../../../Desktop/BricoProApp/src/api/bids';
import { Lang } from '../../i18n';

interface Props {
  bid:            Bid;
  lang:           Lang;
  onAccept:       () => void;
  onViewProfile:  () => void;
  accepting?:     boolean;
}

function Stars({ rating }: { rating: number }) {
  return (
    <View style={s.starsRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <Text key={n} style={[s.star, n <= Math.round(rating) && s.starActive]}>★</Text>
      ))}
    </View>
  );
}

export function BidListCard({ bid, lang, onAccept, onViewProfile, accepting }: Props) {
  const isFr     = lang === 'fr';
  const initials = bid.workerName.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2);

  return (
    <View style={s.card}>
      {/* ─── Top row: avatar + info + price ─── */}
      <View style={s.topRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>

        <View style={s.workerInfo}>
          <View style={s.nameRow}>
            <Text style={s.workerName} numberOfLines={1}>{bid.workerName}</Text>
            {bid.isPremium && (
              <View style={s.premiumBadge}>
                <Text style={s.premiumText}>⭐ PRO</Text>
              </View>
            )}
          </View>
          <View style={s.metaRow}>
            <Stars rating={bid.workerRating} />
            <Text style={s.ratingVal}>{bid.workerRating.toFixed(1)}</Text>
            <Text style={s.missionCount}>
              · {bid.workerMissions} {isFr ? 'missions' : 'مهمة'}
            </Text>
          </View>
        </View>

        <View style={s.priceWrap}>
          <Text style={s.price}>{bid.offeredPrice}</Text>
          <Text style={s.currency}>MAD</Text>
        </View>
      </View>

      {/* ─── ETA badge ─── */}
      <View style={s.etaWrap}>
        <View style={s.etaBadge}>
          <Text style={s.etaText}>
            ⏱ {isFr
            ? `Arrivée dans ~${bid.etaMinutes} min`
            : `الوصول خلال ~${bid.etaMinutes} دقيقة`}
          </Text>
        </View>
      </View>

      {/* ─── Message preview ─── */}
      {!!bid.message && (
        <Text style={s.message} numberOfLines={2}>{bid.message}</Text>
      )}

      {/* ─── Actions ─── */}
      <View style={s.actions}>
        <TouchableOpacity
          style={s.profileBtn}
          onPress={onViewProfile}
          activeOpacity={0.78}
        >
          <Text style={s.profileBtnText}>
            {isFr ? '👤 Voir profil' : '👤 عرض الملف'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.acceptBtnWrap, accepting && s.acceptBtnBusy]}
          onPress={onAccept}
          disabled={!!accepting}
          activeOpacity={0.82}
        >
          <LinearGradient
            colors={[C.orange, C.orangeDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.acceptBtn}
          >
            {accepting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.acceptBtnText}>{isFr ? '✓ Accepter' : '✓ قبول'}</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius:    18,
    padding:         16,
    marginBottom:    12,
    gap:             11,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.07,
    shadowRadius:    10,
    elevation:       3,
  },

  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: C.orange + '1F', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.orange },

  workerInfo: { flex: 1, gap: 4 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  workerName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },

  premiumBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  premiumText:  { fontSize: 9,  fontWeight: '800', color: '#92400E' },

  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starsRow:     { flexDirection: 'row', gap: 1 },
  star:         { fontSize: 10, color: '#D1D5DB' },
  starActive:   { color: '#F59E0B' },
  ratingVal:    { fontSize: 11, color: '#6B7280', fontWeight: '600', marginLeft: 3 },
  missionCount: { fontSize: 11, color: '#9CA3AF' },

  priceWrap:  { alignItems: 'flex-end' },
  price:      { fontSize: 22, fontWeight: '800', color: C.orange, letterSpacing: -0.5 },
  currency:   { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },

  etaWrap:  { flexDirection: 'row' },
  etaBadge: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  etaText:  { fontSize: 11, color: '#15803D', fontWeight: '600' },

  message: { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  actions: { flexDirection: 'row', gap: 10 },

  profileBtn: {
    flex:            1,
    borderWidth:     1.5,
    borderColor:     '#E5E7EB',
    borderRadius:    12,
    paddingVertical: 11,
    alignItems:      'center',
  },
  profileBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  acceptBtnWrap: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  acceptBtnBusy: { opacity: 0.6 },
  acceptBtn:     { paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});