import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../../constants';
import { Lang } from '../../i18n';
import { Role } from '../../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export const ONBOARDING_SEEN_KEY = 'onboarding_seen';

interface Slide {
    key: string;
    emoji: string;
    titleFr: string;
    titleAr: string;
    subFr: string;
    subAr: string;
    accent: string[];
}

const CLIENT_SLIDES: Slide[] = [
    {
        key: 'post',
        emoji: '📋',
        titleFr: 'Décrivez votre besoin',
        titleAr: 'صِف ما تحتاجه',
        subFr: 'Publiez votre demande en quelques secondes. Précisez le lieu, la date et le type de service.',
        subAr: 'انشر طلبك في ثوانٍ. حدد الموقع والتاريخ ونوع الخدمة.',
        accent: [C.orange, C.orangeDeep],
    },
    {
        key: 'choose',
        emoji: '🔍',
        titleFr: 'Choisissez votre prestataire',
        titleAr: 'اختر مزود الخدمة',
        subFr: 'Comparez les offres, consultez les avis et sélectionnez le professionnel qui vous convient.',
        subAr: 'قارن العروض، اطلع على التقييمات واختر المحترف الذي يناسبك.',
        accent: [C.purpleMid, C.purple],
    },
    {
        key: 'done',
        emoji: '✅',
        titleFr: 'Mission accomplie',
        titleAr: 'مهمة منجزة',
        subFr: 'Suivez l\'avancement en temps réel et validez la prestation une fois satisfait.',
        subAr: 'تابع التقدم في الوقت الفعلي وأكّد الخدمة بمجرد رضاك.',
        accent: [C.success, '#059669'],
    },
];

const WORKER_SLIDES: Slide[] = [
    {
        key: 'browse',
        emoji: '🗺️',
        titleFr: 'Trouvez des missions',
        titleAr: 'ابحث عن مهام',
        subFr: 'Parcourez les demandes près de chez vous et filtrez selon vos compétences.',
        subAr: 'تصفح الطلبات القريبة منك وفلتر وفق مهاراتك.',
        accent: [C.orange, C.orangeDeep],
    },
    {
        key: 'bid',
        emoji: '💬',
        titleFr: 'Faites votre offre',
        titleAr: 'قدّم عرضك',
        subFr: 'Proposez votre tarif et votre disponibilité. Le client choisit le meilleur profil.',
        subAr: 'اقترح سعرك وتوافرك. العميل يختار أفضل ملف.',
        accent: [C.purpleMid, C.purple],
    },
    {
        key: 'earn',
        emoji: '💰',
        titleFr: 'Développez votre activité',
        titleAr: 'طوّر نشاطك',
        subFr: 'Gagnez des avis positifs, fidélisez vos clients et augmentez vos revenus.',
        subAr: 'اكسب تقييمات إيجابية، احتفظ بعملائك وزد دخلك.',
        accent: [C.success, '#059669'],
    },
];

interface Props {
    lang: Lang;
    role: Role;
    onDone: () => void;
}

export function OnboardingScreen({ lang, role, onDone }: Props) {
    const isFr  = lang === 'fr';
    const isRTL = lang === 'ar';
    const slides = role === 'WORKER' ? WORKER_SLIDES : CLIENT_SLIDES;

    const [activeIndex, setActiveIndex] = useState(0);
    const flatRef = useRef<FlatList>(null);
    const dotScale = useRef(slides.map(() => new Animated.Value(1))).current;

    const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const idx = viewableItems[0].index ?? 0;
            setActiveIndex(idx);
            dotScale.forEach((scale, i) => {
                Animated.spring(scale, {
                    toValue: i === idx ? 1.4 : 1,
                    useNativeDriver: true,
                    tension: 180,
                    friction: 12,
                }).start();
            });
        }
    });

    const isLast = activeIndex === slides.length - 1;

    const goNext = async () => {
        if (isLast) {
            await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
            onDone();
        } else {
            flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
        }
    };

    const skip = async () => {
        await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, '1');
        onDone();
    };

    const current = slides[activeIndex];

    return (
        <SafeAreaView style={s.root} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

            <TouchableOpacity style={[s.skipBtn, isRTL && s.skipBtnRTL]} onPress={skip} activeOpacity={0.7}>
                <Text style={s.skipText}>{isFr ? 'Passer' : 'تخطي'}</Text>
            </TouchableOpacity>

            <FlatList
                ref={flatRef}
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.key}
                onViewableItemsChanged={onViewRef.current}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                renderItem={({ item }) => (
                    <SlideView slide={item} isFr={isFr} isRTL={isRTL} />
                )}
            />

            <View style={s.footer}>
                <View style={s.dots}>
                    {slides.map((_, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                s.dot,
                                i === activeIndex && { backgroundColor: current.accent[0], width: 24 },
                                { transform: [{ scale: dotScale[i] }] },
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    onPress={goNext}
                    activeOpacity={0.88}
                    style={s.btnWrap}
                >
                    <LinearGradient
                        colors={current.accent as [string, string]}
                        style={s.btn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={s.btnText}>
                            {isLast
                                ? (isFr ? 'Commencer' : 'ابدأ الآن')
                                : (isFr ? 'Suivant' : 'التالي')}
                        </Text>
                        {!isRTL && <Text style={s.btnArrow}>{isLast ? ' 🚀' : ' →'}</Text>}
                        {isRTL && <Text style={s.btnArrow}>{isLast ? '🚀 ' : '← '}</Text>}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function SlideView({ slide, isFr, isRTL }: { slide: Slide; isFr: boolean; isRTL: boolean }) {
    return (
        <View style={s.slide}>
            <View style={s.emojiWrap}>
                <LinearGradient
                    colors={[slide.accent[0] + '22', slide.accent[0] + '08']}
                    style={s.emojiCircle}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={s.emoji}>{slide.emoji}</Text>
                </LinearGradient>
            </View>

            <Text style={[s.title, isRTL && s.rtl]}>
                {isFr ? slide.titleFr : slide.titleAr}
            </Text>
            <Text style={[s.sub, isRTL && s.rtl]}>
                {isFr ? slide.subFr : slide.subAr}
            </Text>
        </View>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },

    skipBtn: {
        position: 'absolute',
        top: 58,
        right: 24,
        zIndex: 10,
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    skipBtnRTL: {
        right: undefined,
        left: 24,
    },
    skipText: {
        fontSize: 13,
        fontWeight: '600',
        color: C.textMuted,
    },

    slide: {
        width,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 36,
        paddingBottom: 40,
    },

    emojiWrap: {
        marginBottom: 40,
    },
    emojiCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 64,
    },

    title: {
        fontSize: 26,
        fontWeight: '800',
        color: C.textDark,
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: 16,
        lineHeight: 34,
    },
    sub: {
        fontSize: 15,
        color: C.textMuted,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 300,
    },
    rtl: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },

    footer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 20,
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },

    btnWrap: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: C.orange,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
    },
    btnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.2,
    },
    btnArrow: {
        fontSize: 16,
        color: '#fff',
    },
});