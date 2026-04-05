import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, Pressable, Linking } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palette, radius, spacing, typography } from '@/constants/theme';

export default function OnboardingScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleStart = async () => {
        await AsyncStorage.setItem('opendroid_onboarding_done', 'true');
        router.replace('/settings');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.content}>
                <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.logoWrap}>
                    <Ionicons name="aperture" size={64} color={palette.accent} />
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(600).delay(200)}>
                    <Text style={styles.title}>Bienvenue sur OpenDroid</Text>
                    <Text style={styles.subtitle}>
                        Ton agent IA personnel qui contrôle ton téléphone pour toi. Pense à lui, dis-lui, et il le fait.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="key-outline" size={24} color={palette.accent} />
                        <Text style={styles.cardTitle}>Clé API requise</Text>
                    </View>
                    <Text style={styles.cardText}>
                        OpenDroid a besoin d'un "cerveau" pour fonctionner. Tu peux utiliser Gemini ou Groq, les deux offrent des clés API <Text style={{ color: palette.success }}>100% gratuites</Text>.
                    </Text>
                    
                    <View style={styles.links}>
                        <Pressable style={styles.linkRow} onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}>
                            <Ionicons name="sparkles" size={16} color={palette.textMuted} />
                            <Text style={styles.linkText}>Obtenir une clé Gemini (Recommandé)</Text>
                        </Pressable>
                        <Pressable style={styles.linkRow} onPress={() => Linking.openURL('https://console.groq.com/keys')}>
                            <Ionicons name="flash" size={16} color={palette.textMuted} />
                            <Text style={styles.linkText}>Obtenir une clé Groq</Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>

            <Animated.View entering={FadeInUp.duration(600).delay(800)} style={styles.footer}>
                <Pressable style={styles.btn} onPress={handleStart}>
                    <Text style={styles.btnText}>Configurer ma clé API</Text>
                    <Ionicons name="arrow-forward" size={20} color={palette.bg0} />
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg0 },
    content: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
    },
    logoWrap: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: palette.accentSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xxl,
        alignSelf: 'center',
        shadowColor: palette.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: palette.accentSoft,
    },
    title: {
        ...typography.hero,
        color: palette.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    subtitle: {
        ...typography.body,
        color: palette.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.huge,
        paddingHorizontal: spacing.md,
    },
    card: {
        backgroundColor: palette.bg2,
        borderRadius: radius.md,
        padding: spacing.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.borderLight,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    cardTitle: {
        ...typography.title,
        color: palette.textPrimary,
    },
    cardText: {
        ...typography.bodySm,
        color: palette.textSecondary,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    links: { gap: spacing.md },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        backgroundColor: palette.bg3,
        borderRadius: radius.sm,
    },
    linkText: {
        ...typography.bodySm,
        color: palette.textPrimary,
        textDecorationLine: 'underline',
    },
    footer: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },
    btn: {
        backgroundColor: palette.accent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: 16,
        borderRadius: radius.md,
    },
    btnText: {
        ...typography.title,
        color: palette.bg0,
    },
});
