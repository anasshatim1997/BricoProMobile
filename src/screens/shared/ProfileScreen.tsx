import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { TokenStorage } from '../../storage/token';

const BASE_URL = 'http://192.168.1.13:8080/api/v1';

type Role = 'CLIENT' | 'WORKER';

interface Props {
  lang:     Lang;
  role:     Role;
  onBack:   () => void;
  onLogout: () => void;
}

interface UserInfo {
  id:         number;
  firstName:  string;
  lastName:   string;
  email:      string;
  phone?:     string;
  avatarUrl?: string;
}

interface WorkerProfile {
  bio?:                  string;
  city?:                 string;
  interventionRadiusKm?: number;
  services?:             Array<{ serviceType: string; hourlyRate: number }>;
  isVerified?:           boolean;
  totalReviews?:         number;
  averageRating?:        number;
}

interface ClientProfile {
  city?:           string;
  defaultAddress?: string;
  totalTasks?:     number;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

function SectionTitle({ text, isRTL }: { text: string; isRTL: boolean }) {
  return (
    <View style={[s.cardTitleRow, isRTL && s.rowRev]}>
      <View style={s.cardTitleDot} />
      <Text style={s.cardTitleText}>{text}</Text>
    </View>
  );
}

function FieldRow({
                    label, value, onChangeText, multiline, placeholder, isRTL, keyboardType,
                  }: {
  label:         string;
  value:         string;
  onChangeText:  (v: string) => void;
  multiline?:    boolean;
  placeholder?:  string;
  isRTL:         boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={[s.fieldLabel, isRTL && s.rtl]}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && s.fieldMulti, isRTL && s.fieldRTL]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor="#C0C6D0"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        textAlign={isRTL ? 'right' : 'left'}
        keyboardType={keyboardType ?? 'default'}
      />
    </View>
  );
}

export default function ProfileScreen({ lang, role, onBack, onLogout }: Props) {
  const isFr  = lang === 'fr';
  const isRTL = lang === 'ar';

  const [user,      setUser]      = useState<UserInfo | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');

  const [workerProfile, setWorkerProfile] = useState<WorkerProfile>({});
  const [bio,           setBio]           = useState('');
  const [city,          setCity]          = useState('');
  const [radius,        setRadius]        = useState('');
  const [selectedSvcs,  setSelectedSvcs]  = useState<Record<string, string>>({});

  const [clientProfile,  setClientProfile]  = useState<ClientProfile>({});
  const [clientCity,     setClientCity]     = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [banner,  setBanner]  = useState('');
  const [apiErr,  setApiErr]  = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const session = await TokenStorage.get();
      if (!session) return;
      const authHeader = { Authorization: `Bearer ${session.accessToken}` };

      const userRes = await fetch(`${BASE_URL}/users/me`, { headers: authHeader });
      if (userRes.ok) {
        const u: UserInfo = await userRes.json();
        setUser(u);
        setFirstName(u.firstName ?? '');
        setLastName(u.lastName ?? '');
      }

      if (role === 'WORKER') {
        const wRes = await fetch(`${BASE_URL}/users/workers/${session.userId}`, { headers: authHeader });
        if (wRes.ok) {
          const wp: WorkerProfile = await wRes.json();
          setWorkerProfile(wp);
          setBio(wp.bio ?? '');
          setCity(wp.city ?? '');
          setRadius(String(wp.interventionRadiusKm ?? ''));
          const svcMap: Record<string, string> = {};
          (wp.services ?? []).forEach(sv => { svcMap[sv.serviceType] = String(sv.hourlyRate); });
          setSelectedSvcs(svcMap);
        }
      }

      if (role === 'CLIENT') {
        const cRes = await fetch(`${BASE_URL}/users/me/client-profile`, { headers: authHeader });
        if (cRes.ok) {
          const cp: ClientProfile = await cRes.json();
          setClientProfile(cp);
          setClientCity(cp.city ?? '');
          setDefaultAddress(cp.defaultAddress ?? '');
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleSave() {
    setSaving(true);
    setApiErr('');
    setBanner('');
    try {
      const session = await TokenStorage.get();
      if (!session) return;
      const authHeader = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      };

      const userRes = await fetch(`${BASE_URL}/users/me`, {
        method:  'PATCH',
        headers: authHeader,
        body:    JSON.stringify({ firstName, lastName }),
      });
      if (!userRes.ok) throw new Error(isFr ? 'Erreur mise à jour profil.' : 'خطأ في تحديث الملف.');

      if (role === 'WORKER') {
        const services = Object.entries(selectedSvcs).map(([serviceType, rate]) => ({
          serviceType,
          hourlyRate: Number(rate) || 0,
        }));
        const wRes = await fetch(`${BASE_URL}/users/me/worker-profile`, {
          method:  'PUT',
          headers: authHeader,
          body:    JSON.stringify({
            bio,
            city,
            interventionRadiusKm: Number(radius) || undefined,
            services,
          }),
        });
        if (!wRes.ok) throw new Error(isFr ? 'Erreur profil prestataire.' : 'خطأ في ملف مقدم الخدمة.');
      }

      if (role === 'CLIENT') {
        const cRes = await fetch(`${BASE_URL}/users/me/client-profile`, {
          method:  'PUT',
          headers: authHeader,
          body:    JSON.stringify({ city: clientCity, defaultAddress }),
        });
        if (!cRes.ok) throw new Error(isFr ? 'Erreur profil client.' : 'خطأ في ملف العميل.');
      }

      setBanner(isFr ? '✓ Profil mis à jour avec succès !' : '✓ تم تحديث الملف الشخصي!');
    } catch (err: any) {
      setApiErr(err.message ?? (isFr ? 'Une erreur est survenue.' : 'حدث خطأ.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      isFr ? 'Se déconnecter' : 'تسجيل الخروج',
      isFr ? 'Êtes-vous sûr de vouloir vous déconnecter ?' : 'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: isFr ? 'Annuler' : 'إلغاء', style: 'cancel' },
        {
          text:    isFr ? 'Déconnecter' : 'خروج',
          style:   'destructive',
          onPress: async () => {
            await TokenStorage.clear();
            onLogout();
          },
        },
      ],
    );
  }

  function toggleService(key: string) {
    setSelectedSvcs(prev => {
      if (key in prev) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: '0' };
    });
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';

  const workerRating     = workerProfile.averageRating ?? 0;
  const workerReviews    = workerProfile.totalReviews ?? 0;
  const workerIsVerified = workerProfile.isVerified ?? false;
  const clientTotalTasks = clientProfile.totalTasks ?? 0;

  if (loading) {
    return (
      <View style={s.loaderWrap}>
        <ActivityIndicator size="large" color={C.orange} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0912" />

      <LinearGradient colors={['#0A0912', '#131221']} style={s.header}>
        <View style={[s.headerRow, isRTL && s.rowRev]}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={s.backText}>{isRTL ? '›' : '‹'}</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {isFr ? 'Mon profil' : 'ملفي الشخصي'}
          </Text>
          <View style={s.headerSpacer} />
        </View>

        <View style={s.avatarSection}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
          <TouchableOpacity
            style={s.changePhotoBtn}
            onPress={() => Alert.alert(
              isFr ? 'Photo de profil' : 'صورة الملف',
              isFr ? 'Fonctionnalité bientôt disponible.' : 'الميزة قريبًا.',
            )}
            activeOpacity={0.7}
          >
            <Text style={s.changePhotoText}>
              {isFr ? '📷 Changer la photo' : '📷 تغيير الصورة'}
            </Text>
          </TouchableOpacity>
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>
              {role === 'WORKER'
                ? (isFr ? '🔧 Prestataire' : '🔧 مقدم خدمة')
                : (isFr ? '👤 Client'      : '👤 عميل')}
            </Text>
          </View>

          {role === 'WORKER' && workerIsVerified && (
            <View style={s.verifiedBadge}>
              <Text style={s.verifiedBadgeText}>
                {isFr ? '✓ Profil vérifié' : '✓ ملف موثق'}
              </Text>
            </View>
          )}
          {role === 'WORKER' && workerReviews > 0 && (
            <Text style={s.ratingText}>
              ⭐ {workerRating.toFixed(1)} ({workerReviews} {isFr ? 'avis' : 'تقييم'})
            </Text>
          )}
          {role === 'CLIENT' && clientTotalTasks > 0 && (
            <Text style={s.ratingText}>
              📋 {clientTotalTasks} {isFr ? 'tâches postées' : 'مهمة منشورة'}
            </Text>
          )}
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
            <SectionTitle text={isFr ? 'Informations personnelles' : 'المعلومات الشخصية'} isRTL={isRTL} />
            <FieldRow
              label={isFr ? 'Prénom' : 'الاسم الأول'}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={isFr ? 'Votre prénom' : 'اسمك الأول'}
              isRTL={isRTL}
            />
            <FieldRow
              label={isFr ? 'Nom' : 'اسم العائلة'}
              value={lastName}
              onChangeText={setLastName}
              placeholder={isFr ? 'Votre nom' : 'اسم عائلتك'}
              isRTL={isRTL}
            />
            {!!user?.email && (
              <View style={s.readonlyRow}>
                <Text style={[s.fieldLabel, isRTL && s.rtl]}>{isFr ? 'E-mail' : 'البريد الإلكتروني'}</Text>
                <Text style={[s.readonlyValue, isRTL && s.rtl]}>{user.email}</Text>
              </View>
            )}
            {!!user?.phone && (
              <View style={s.readonlyRow}>
                <Text style={[s.fieldLabel, isRTL && s.rtl]}>{isFr ? 'Téléphone' : 'الهاتف'}</Text>
                <Text style={[s.readonlyValue, isRTL && s.rtl]}>{user.phone}</Text>
              </View>
            )}
          </SectionCard>

          {role === 'WORKER' && (
            <SectionCard>
              <SectionTitle text={isFr ? 'Profil professionnel' : 'الملف المهني'} isRTL={isRTL} />
              <FieldRow
                label={isFr ? 'Biographie' : 'نبذة عني'}
                value={bio}
                onChangeText={setBio}
                multiline
                placeholder={isFr ? 'Décrivez votre expérience…' : 'صف خبرتك...'}
                isRTL={isRTL}
              />
              <FieldRow
                label={isFr ? 'Ville' : 'المدينة'}
                value={city}
                onChangeText={setCity}
                placeholder="Casablanca"
                isRTL={isRTL}
              />
              <FieldRow
                label={isFr ? "Rayon d'intervention (km)" : 'نطاق التدخل (كم)'}
                value={radius}
                onChangeText={setRadius}
                placeholder="25"
                isRTL={isRTL}
                keyboardType="numeric"
              />

              <Text style={[s.fieldLabel, isRTL && s.rtl, s.svcSectionLabel]}>
                {isFr ? 'Services proposés' : 'الخدمات المقدمة'}
              </Text>
              <View style={s.chipGrid}>
                {SERVICES.map(svc => {
                  const isSelected = svc.key in selectedSvcs;
                  return (
                    <TouchableOpacity
                      key={svc.key}
                      style={[
                        s.svcChip,
                        isSelected ? s.svcChipSelected : s.svcChipUnselected,
                        isSelected && { borderColor: svc.color, backgroundColor: svc.color + '18' },
                      ]}
                      onPress={() => toggleService(svc.key)}
                      activeOpacity={0.78}
                    >
                      <Text style={s.svcChipEmoji}>{svc.icon}</Text>
                      <Text style={[s.svcChipLabel, isSelected && { color: svc.color }]}>
                        {isFr ? svc.fr : svc.ar}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {Object.keys(selectedSvcs).length > 0 && (
                <View style={s.rateSection}>
                  <Text style={[s.fieldLabel, isRTL && s.rtl]}>
                    {isFr ? 'Tarif horaire (MAD)' : 'الأجر بالساعة (د.م.)'}
                  </Text>
                  {Object.keys(selectedSvcs).map(key => {
                    const svc = SERVICES.find(sv => sv.key === key);
                    if (!svc) return null;
                    return (
                      <View key={key} style={[s.rateRow, isRTL && s.rowRev]}>
                        <Text style={s.rateLabel}>
                          {svc.icon} {isFr ? svc.fr : svc.ar}
                        </Text>
                        <TextInput
                          style={s.rateInput}
                          value={selectedSvcs[key]}
                          onChangeText={v => setSelectedSvcs(prev => ({ ...prev, [key]: v }))}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#C0C6D0"
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </SectionCard>
          )}

          {role === 'CLIENT' && (
            <SectionCard>
              <SectionTitle text={isFr ? 'Préférences' : 'التفضيلات'} isRTL={isRTL} />
              <FieldRow
                label={isFr ? 'Ville' : 'المدينة'}
                value={clientCity}
                onChangeText={setClientCity}
                placeholder="Casablanca"
                isRTL={isRTL}
              />
              <FieldRow
                label={isFr ? 'Adresse par défaut' : 'العنوان الافتراضي'}
                value={defaultAddress}
                onChangeText={setDefaultAddress}
                placeholder={isFr ? 'Votre adresse habituelle' : 'عنوانك المعتاد'}
                isRTL={isRTL}
                multiline
              />
            </SectionCard>
          )}

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[s.saveBtnWrap, saving && s.saveBtnBusy]}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[C.orange, C.orangeDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.saveBtn}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.saveBtnText}>{isFr ? '✓ Sauvegarder' : '✓ حفظ التغييرات'}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <SectionCard>
            <SectionTitle text={isFr ? 'Zone de danger' : 'منطقة الخطر'} isRTL={isRTL} />
            <TouchableOpacity
              style={s.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.78}
            >
              <Text style={s.logoutBtnText}>
                {isFr ? '⏏ Se déconnecter' : '⏏ تسجيل الخروج'}
              </Text>
            </TouchableOpacity>
          </SectionCard>

          <View style={s.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F2F3F7' },
  flex1:      { flex: 1 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F3F7' },

  header:        { paddingTop: 12, paddingBottom: 28, paddingHorizontal: 20 },
  headerRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  rowRev:        { flexDirection: 'row-reverse' },
  backBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backText:      { color: '#fff', fontSize: 24, lineHeight: 28 },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  headerSpacer:  { width: 36 },

  avatarSection:    { alignItems: 'center', gap: 10 },
  avatarCircle:     { width: 80, height: 80, borderRadius: 40, backgroundColor: C.orange + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.orange + '44' },
  avatarInitials:   { fontSize: 28, fontWeight: '800', color: C.orange },
  changePhotoBtn:   { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10 },
  changePhotoText:  { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  roleBadge:        { backgroundColor: 'rgba(249,115,22,0.22)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText:    { fontSize: 11, color: C.orange, fontWeight: '700' },
  verifiedBadge:    { backgroundColor: 'rgba(16,185,129,0.18)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  verifiedBadgeText:{ fontSize: 11, color: '#10B981', fontWeight: '700' },
  ratingText:       { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  scroll: { padding: 16, gap: 0 },

  bannerSuccess:     { backgroundColor: '#D1FAE5', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#6EE7B7', marginBottom: 12 },
  bannerSuccessText: { color: '#065F46', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  bannerError:       { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FECACA', marginBottom: 12 },
  bannerErrorText:   { color: '#991B1B', fontSize: 13, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 14,
    borderWidth: 1, borderColor: '#F0F2F5', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitleDot: { width: 4, height: 16, borderRadius: 2, backgroundColor: C.orange },
  cardTitleText:{ fontSize: 13, fontWeight: '700', color: '#374151', letterSpacing: 0.2 },

  fieldWrap:  { gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput: { borderWidth: 1.5, borderColor: '#EAECF0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827', backgroundColor: '#FAFAFA' },
  fieldMulti: { height: 80, paddingTop: 11 },
  fieldRTL:   { textAlign: 'right' },

  readonlyRow:  { gap: 4 },
  readonlyValue:{ fontSize: 14, color: '#6B7280', fontWeight: '500' },

  svcSectionLabel: { marginTop: 4 },

  chipGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  svcChip:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#F9FAFB' },
  svcChipSelected:  { borderColor: '#E5E7EB' },
  svcChipUnselected:{ borderColor: '#E5E7EB' },
  svcChipEmoji:     { fontSize: 14 },
  svcChipLabel:     { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  rateSection: { gap: 10, marginTop: 4 },
  rateRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateLabel:   { fontSize: 13, color: '#374151', fontWeight: '500' },
  rateInput:   { width: 80, borderWidth: 1.5, borderColor: '#EAECF0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: '#111827', textAlign: 'center', backgroundColor: '#FAFAFA' },

  saveBtnWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  saveBtnBusy: { opacity: 0.65 },
  saveBtn:     { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

  logoutBtn:     { borderWidth: 1.5, borderColor: C.red, borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: C.red + '0D' },
  logoutBtnText: { fontSize: 14, fontWeight: '700', color: C.red },

  bottomSpacer: { height: 40 },
  rtl:          { textAlign: 'right' },
});