import React, { useRef } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen              from './src/screens/SplashScreen';
import { RoleSelectionScreen }   from './src/screens';
import { LoginScreen }           from './src/screens';
import SignupScreen              from './src/screens/auth/SignupScreen.tsx';
import { OtpVerificationScreen } from './src/screens';
import { ClientHomeScreen }      from './src/screens/client/ClientHomeScreen';
import { WorkerHomeScreen }      from './src/screens/worker/WorkerHomeScreen';
import PostTaskScreen            from './src/screens/client/PostTaskScreen';
import TaskDetailScreen          from './src/screens/shared/TaskDetailScreen';

import { Lang }                          from './src/i18n';
import { AuthResponse, Role, authApi }   from './src/api/auth.ts';
import { TokenStorage }                  from './src/storage/token';

export type RootStackParamList = {
    Splash:      undefined;
    Role:        { lang: Lang };
    Login:       { lang: Lang; role: Role };
    Signup:      { lang: Lang; role: Role };
    Verify:      { lang: Lang; userId: number; email: string; password: string; role: Role };
    ClientHome:  { lang: Lang };
    WorkerHome:  { lang: Lang };
    PostTask:    { lang: Lang };
    TaskDetail:  { lang: Lang; taskId: number; role: Role };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

    function handleAutoLogin(storedRole: Role) {
        const target = storedRole === 'WORKER' ? 'WorkerHome' : 'ClientHome';
        navRef.current?.reset({ index: 0, routes: [{ name: target, params: { lang: 'fr' } }] });
    }

    async function handleLoginSuccess(res: AuthResponse, lang: Lang) {
        await TokenStorage.save({
            accessToken:  res.accessToken,
            refreshToken: res.refreshToken,
            userId:       res.userId,
            role:         res.role,
        });
        const target = res.role === 'WORKER' ? 'WorkerHome' : 'ClientHome';
        navRef.current?.reset({ index: 0, routes: [{ name: target, params: { lang } }] });
    }

    async function handleLogout() {
        await TokenStorage.clear();
        navRef.current?.reset({ index: 0, routes: [{ name: 'Role', params: { lang: 'fr' } }] });
    }

    return (
        <SafeAreaProvider>
            <NavigationContainer ref={navRef}>
                <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">

                    <Stack.Screen name="Splash">
                        {({ navigation }) => (
                            <SplashScreen
                                onFinish={() => navigation.replace('Role', { lang: 'fr' })}
                                onAutoLogin={handleAutoLogin}
                            />
                        )}
                    </Stack.Screen>

                    <Stack.Screen name="Role">
                        {({ navigation, route }) => {
                            const lang = route.params?.lang ?? 'fr';
                            const toggleLang = () => {
                                const next: Lang = lang === 'fr' ? 'ar' : 'fr';
                                navigation.setParams({ lang: next });
                            };
                            return (
                                <RoleSelectionScreen
                                    lang={lang}
                                    onToggleLang={toggleLang}
                                    onLogin={() => navigation.navigate('Login', { lang, role: 'CLIENT' })}
                                    onSignup={(role: Role) => navigation.navigate('Signup', { lang, role })}
                                />
                            );
                        }}
                    </Stack.Screen>

                    <Stack.Screen name="Login">
                        {({ navigation, route }) => {
                            const { lang, role } = route.params;
                            const toggleLang = () => {
                                const next: Lang = lang === 'fr' ? 'ar' : 'fr';
                                navigation.setParams({ lang: next });
                            };
                            return (
                                <LoginScreen
                                    lang={lang}
                                    onToggleLang={toggleLang}
                                    onBack={() => navigation.goBack()}
                                    onSignup={() => navigation.navigate('Signup', { lang, role })}
                                    onSuccess={(res: AuthResponse) => handleLoginSuccess(res, lang)}
                                />
                            );
                        }}
                    </Stack.Screen>

                    <Stack.Screen name="Signup">
                        {({ navigation, route }) => {
                            const { lang, role } = route.params;
                            const toggleLang = () => {
                                const next: Lang = lang === 'fr' ? 'ar' : 'fr';
                                navigation.setParams({ lang: next });
                            };
                            return (
                                <SignupScreen
                                    lang={lang}
                                    onToggleLang={toggleLang}
                                    onBack={() => navigation.goBack()}
                                    onLogin={() => navigation.navigate('Login', { lang, role })}
                                    initialRole={role}
                                    onSuccess={(userId: number, email: string, password: string) =>
                                        navigation.navigate('Verify', { lang, userId, email, password, role })
                                    }
                                />
                            );
                        }}
                    </Stack.Screen>

                    <Stack.Screen name="Verify">
                        {({ navigation, route }) => {
                            const { lang, userId, email, password, role } = route.params;
                            return (
                                <OtpVerificationScreen
                                    lang={lang}
                                    userId={userId}
                                    email={email}
                                    onSuccess={async () => {
                                        try {
                                            const res = await authApi.login({ email, password });
                                            await handleLoginSuccess(res, lang);
                                        } catch {
                                            const target = role === 'WORKER' ? 'WorkerHome' : 'ClientHome';
                                            navRef.current?.reset({ index: 0, routes: [{ name: target, params: { lang } }] });
                                        }
                                    }}
                                    onBack={() => navigation.goBack()}
                                />
                            );
                        }}
                    </Stack.Screen>

                    <Stack.Screen name="ClientHome">
                        {({ navigation, route }) => {
                            const lang = route.params?.lang ?? 'fr';
                            return (
                                <ClientHomeScreen
                                    lang={lang}
                                    onLogout={handleLogout}
                                    onPostTask={() => navigation.navigate('PostTask', { lang })}
                                    onTaskPress={(taskId: number) => navigation.navigate('TaskDetail', { lang, taskId, role: 'CLIENT' })}
                                />
                            );
                        }}
                    </Stack.Screen>

                    <Stack.Screen name="WorkerHome">
                        {({ navigation, route }) => {
                            const lang = route.params?.lang ?? 'fr';
                            return (
                                <WorkerHomeScreen
                                    lang={lang}
                                    onLogout={handleLogout}
                                    onTaskPress={(taskId: number) => navigation.navigate('TaskDetail', { lang, taskId, role: 'WORKER' })}
                                />
                            );
                        }}
                    </Stack.Screen>

                    <Stack.Screen name="PostTask">
                        {({ navigation, route }) => {
                            const lang = route.params?.lang ?? 'fr';
                            return (
                                <PostTaskScreen
                                    lang={lang}
                                    onBack={() => navigation.goBack()}
                                    onSuccess={() => navigation.goBack()}
                                />
                            );
                        }}
                    </Stack.Screen>

                    <Stack.Screen name="TaskDetail">
                        {({ navigation, route }) => {
                            const { lang, taskId, role } = route.params;
                            return (
                                <TaskDetailScreen
                                    lang={lang}
                                    taskId={taskId}
                                    role={role}
                                    onBack={() => navigation.goBack()}
                                />
                            );
                        }}
                    </Stack.Screen>

                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}