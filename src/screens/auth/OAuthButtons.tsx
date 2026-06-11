import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Svg, { Path } from 'react-native-svg';
import { LoginManager, AccessToken, Settings } from 'react-native-fbsdk-next';
import { authApi, AuthResponse } from '../../api/auth.ts';

const GOOGLE_WEB_CLIENT_ID = '439210157228-fs7euehh2sl6mcto3guivgrccjk78dlg.apps.googleusercontent.com';

Settings.initializeSDK();

GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
});

interface Props {
    onSuccess: (res: AuthResponse) => void;
    onError:   (message: string)   => void;
    lang:      'fr' | 'ar';
}

function GoogleLogo() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
            <Path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-.98.66-2.26 1.06-4.07 1.06-3.13 0-5.78-2.11-6.73-4.96H1.19v3.09C3.18 21.31 7.31 24 12 24z" />
            <Path fill="#FBBC05" d="M5.27 14.19c-.25-.72-.38-1.49-.38-2.19 0-.7.14-1.47.38-2.19V6.72H1.19C.43 8.22 0 9.91 0 12c0 2.09.43 3.78 1.19 5.28l4.08-3.09z" />
            <Path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.69 1.19 6.72l4.08 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
        </Svg>
    );
}

function FacebookLogo() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path fill="#fff" d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" />
        </Svg>
    );
}

export function OAuthButtons({ onSuccess, onError, lang }: Props) {
    const [googleLoading, setGoogleLoading] = useState(false);
    const [fbLoading,     setFbLoading]     = useState(false);
    const isRTL      = lang === 'ar';
    const anyLoading = googleLoading || fbLoading;

    const handleGoogle = async () => {
        setGoogleLoading(true);
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const signInResult = await GoogleSignin.signIn();
            const idToken =
                (signInResult as any).data?.idToken ??
                (signInResult as any).idToken;
            if (!idToken) throw new Error('No ID token received from Google');
            const response = await authApi.googleLogin({ idToken });
            onSuccess(response);
        } catch (error: any) {
            if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
                let message = error.message;
                if (message && message.includes('DEVELOPER_ERROR')) {
                    message = lang === 'fr'
                        ? 'Erreur de configuration Google. Vérifiez SHA-1 et clé Web.'
                        : 'خطأ في إعدادات Google. تأكد من SHA-1 ومفتاح الويب.';
                }
                onError(message || (lang === 'fr' ? 'Échec Google' : 'فشل تسجيل جوجل'));
            }
        } finally {
            setGoogleLoading(false);
        }
    };

    const handleFacebook = async () => {
        setFbLoading(true);
        try {
            const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
            if (result.isCancelled) return;
            const data = await AccessToken.getCurrentAccessToken();
            if (!data) throw new Error('No Facebook access token');
            const response = await authApi.facebookLogin({ accessToken: data.accessToken });
            onSuccess(response);
        } catch (error: any) {
            onError(error.message || (lang === 'fr' ? 'Échec Facebook' : 'فشل تسجيل فيسبوك'));
        } finally {
            setFbLoading(false);
        }
    };

    return (
        <View style={s.container}>
            <View style={s.dividerRow}>
                <View style={s.line} />
                <Text style={s.orText}>{lang === 'fr' ? 'Ou continuer avec' : 'أو المتابعة عبر'}</Text>
                <View style={s.line} />
            </View>

            <View style={s.buttonsContainer}>
                <TouchableOpacity
                    style={[s.btn, s.googleBtn, anyLoading && s.disabled]}
                    onPress={handleGoogle}
                    disabled={anyLoading}
                    activeOpacity={0.8}
                >
                    {googleLoading ? (
                        <ActivityIndicator color="#4285F4" size="small" />
                    ) : (
                        <View style={[s.inner, isRTL && s.innerRTL]}>
                            <GoogleLogo />
                            <Text style={s.googleText}>Google</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[s.btn, s.fbBtn, anyLoading && s.disabled]}
                    onPress={handleFacebook}
                    disabled={anyLoading}
                    activeOpacity={0.8}
                >
                    {fbLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <View style={[s.inner, isRTL && s.innerRTL]}>
                            <FacebookLogo />
                            <Text style={s.fbText}>Facebook</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container:        { gap: 12, marginTop: 4 },
    dividerRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
    line:             { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
    orText:           { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    buttonsContainer: { gap: 10 },
    btn:              { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
    disabled:         { opacity: 0.55 },
    inner:            { flexDirection: 'row', alignItems: 'center', gap: 8 },
    innerRTL:         { flexDirection: 'row-reverse' },
    googleBtn:        { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0', shadowColor: '#000' },
    fbBtn:            { backgroundColor: '#1877F2', shadowColor: '#1877F2' },
    googleText:       { fontSize: 13, fontWeight: '600', color: '#1E293B' },
    fbText:           { fontSize: 13, fontWeight: '600', color: '#fff' },
});