import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
    Image,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palette, radius, spacing, typography } from '@/constants/theme';
import { clearAllHistory } from '@/src/services/HistoryService';
import ClawAccessibilityModule from '@/src/native/ClawAccessibilityModule';

/* ─── Types ─── */
interface ActionLog {
    time: string;
    action: string;
}

type TrustLevel = 'prudent' | 'normal' | 'advanced';

const TRUST_LEVELS: { key: TrustLevel; label: string; desc: string; icon: string }[] = [
    { key: 'prudent', label: 'Prudent', desc: 'Confirmation pour TOUTE action', icon: '🛡️' },
    { key: 'normal', label: 'Normal', desc: 'Confirmation pour actions sensibles', icon: '⚖️' },
    { key: 'advanced', label: 'Avancé', desc: 'Agent agit librement', icon: '⚡' },
];

const BLOCKED_ACTIONS = [
    { icon: '🔴', label: 'Paiements & achats' },
    { icon: '🔴', label: 'Suppression de fichiers' },
    { icon: '🔴', label: 'Saisie de mots de passe' },
    { icon: '🔴', label: 'Accès aux apps bancaires' },
    { icon: '🔴', label: 'Envoi de ta localisation' },
];

type SecureApp = { name: string; pkg: string; allowed: boolean; icon?: string };

const DEFAULT_APPS: SecureApp[] = [
    { name: 'WhatsApp', pkg: 'com.whatsapp', allowed: true },
    { name: 'Chrome', pkg: 'com.android.chrome', allowed: true },
    { name: 'YouTube', pkg: 'com.google.android.youtube', allowed: true },
    { name: 'Paramètres', pkg: 'com.android.settings', allowed: true },
    { name: 'Banque', pkg: 'banking', allowed: false },
    { name: 'PayPal', pkg: 'com.paypal.android.p2pmobile', allowed: false },
];

const SECURITY_STORAGE_KEY = 'opendroid_security';

export default function SecurityScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [trustLevel, setTrustLevel] = useState<TrustLevel>('normal');
    const [allowedApps, setAllowedApps] = useState(DEFAULT_APPS);
    const [actionLog] = useState<ActionLog[]>([]);

    useEffect(() => {
        async function init() {
            // 1. Fetch saved preferences
            const raw = await AsyncStorage.getItem(SECURITY_STORAGE_KEY);
            let savedData: any = {};
            if (raw) {
                try {
                    savedData = JSON.parse(raw);
                    if (savedData.trustLevel) setTrustLevel(savedData.trustLevel);
                } catch { }
            }

            // 2. Fetch Native Apps list
            let nativeApps = await ClawAccessibilityModule.getInstalledApps();
            if (!nativeApps || nativeApps.length === 0) {
                // mock/fallback
                nativeApps = DEFAULT_APPS.map(a => ({ label: a.name, packageName: a.pkg }));
            }

            const savedList: typeof DEFAULT_APPS = savedData.allowedApps || [];
            
            // 3. Reconcile
            const mergedApps = nativeApps
                .map(app => {
                    const savedApp = savedList.find(s => s.pkg === app.packageName);
                    if (savedApp) return savedApp;

                    // New app: default true, unless it looks like a bank/payment app
                    const p = app.packageName.toLowerCase();
                    const n = app.label.toLowerCase();
                    const isFinance = p.includes('bank') || p.includes('pay') || p.includes('finance') || n.includes('banque') || n.includes('pay');
                    return {
                        name: app.label,
                        pkg: app.packageName,
                        icon: app.icon,
                        allowed: !isFinance,
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            setAllowedApps(mergedApps);
        }
        init();
    }, []);

    // Auto-save on change
    const save = useCallback(async (trust: TrustLevel, apps: typeof DEFAULT_APPS) => {
        await AsyncStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify({
            trustLevel: trust,
            allowedApps: apps,
        }));
    }, []);

    const handleTrustChange = (level: TrustLevel) => {
        setTrustLevel(level);
        save(level, allowedApps);
    };

    const toggleApp = (index: number) => {
        const app = allowedApps[index];
        const p = app.pkg.toLowerCase();
        const n = app.name.toLowerCase();
        const isFinance = p.includes('bank') || p.includes('pay') || p.includes('finance') || n.includes('banque') || n.includes('pay');
        
        if (isFinance) {
            Alert.alert('Bloqué', 'Les apps financières sont toujours bloquées pour ta sécurité.');
            return;
        }
        const updated = [...allowedApps];
        updated[index] = { ...updated[index], allowed: !updated[index].allowed };
        setAllowedApps(updated);
        save(trustLevel, updated);
    };

    const handleClearHistory = () => {
        Alert.alert(
            'Effacer tout l\'historique ?',
            'Cette action est irréversible.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Effacer',
                    style: 'destructive',
                    onPress: async () => {
                        await clearAllHistory();
                        Alert.alert('✓', 'Historique effacé.');
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
                <Text style={styles.headerTitle}>Sécurité & Contrôle</Text>
                <Pressable style={styles.closeBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={20} color={palette.textTertiary} />
                </Pressable>
            </Animated.View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Section 1 — Trust Level */}
                <Animated.View entering={FadeInDown.delay(80).duration(300)}>
                    <Text style={styles.sectionLabel}>NIVEAU DE CONFIANCE</Text>
                    <View style={styles.card}>
                        {TRUST_LEVELS.map((level, i) => (
                            <View key={level.key}>
                                {i > 0 && <View style={styles.divider} />}
                                <Pressable
                                    style={[
                                        styles.trustRow,
                                        trustLevel === level.key && styles.trustRowActive,
                                    ]}
                                    onPress={() => handleTrustChange(level.key)}
                                >
                                    <Text style={styles.trustIcon}>{level.icon}</Text>
                                    <View style={styles.trustInfo}>
                                        <Text style={[
                                            styles.trustLabel,
                                            trustLevel === level.key && styles.trustLabelActive,
                                        ]}>{level.label}</Text>
                                        <Text style={styles.trustDesc}>{level.desc}</Text>
                                    </View>
                                    {trustLevel === level.key && (
                                        <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                                    )}
                                </Pressable>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Section 2 — Allowed Apps */}
                <Animated.View entering={FadeInDown.delay(160).duration(300)}>
                    <Text style={styles.sectionLabel}>APPS AUTORISÉES ({allowedApps.length})</Text>
                    <View style={styles.card}>
                        {/* We slice to 50 items here so it doesn't drop frames, in production use a nested FlatList instead of ScrollView */}
                        {allowedApps.slice(0, 50).map((app, i) => (
                            <View key={app.pkg}>
                                {i > 0 && <View style={styles.divider} />}
                                <View style={styles.appRow}>
                                    {app.icon ? (
                                        <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={{ width: 36, height: 36, borderRadius: 8, marginRight: 12 }} />
                                    ) : (
                                        <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: palette.bg3, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="apps" size={18} color={palette.textTertiary} />
                                        </View>
                                    )}
                                    <View style={{ flex: 1, paddingRight: spacing.md }}>
                                        <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
                                        <Text style={styles.pkgName} numberOfLines={1}>{app.pkg}</Text>
                                    </View>
                                    <Switch
                                        value={app.allowed}
                                        onValueChange={() => toggleApp(i)}
                                        trackColor={{ false: palette.bg3, true: palette.success }}
                                        thumbColor={palette.textPrimary}
                                    />
                                </View>
                            </View>
                        ))}
                        {allowedApps.length > 50 && (
                            <View style={styles.moreAppsRow}>
                                <Text style={styles.moreAppsText}>...et {allowedApps.length - 50} autres apps.</Text>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Section 3 — Blocked Actions */}
                <Animated.View entering={FadeInDown.delay(240).duration(300)}>
                    <Text style={styles.sectionLabel}>ACTIONS BLOQUÉES — TOUJOURS</Text>
                    <View style={styles.card}>
                        {BLOCKED_ACTIONS.map((action, i) => (
                            <View key={i}>
                                {i > 0 && <View style={styles.divider} />}
                                <View style={styles.blockedRow}>
                                    <Text style={styles.blockedIcon}>{action.icon}</Text>
                                    <Text style={styles.blockedLabel}>{action.label}</Text>
                                    <Ionicons name="lock-closed" size={14} color={palette.textMuted} />
                                </View>
                            </View>
                        ))}
                        <View style={styles.divider} />
                        <View style={styles.blockedNote}>
                            <Text style={styles.blockedNoteText}>
                                Ces règles ne peuvent pas être désactivées.
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Section 4 — My Data */}
                <Animated.View entering={FadeInDown.delay(320).duration(300)}>
                    <Text style={styles.sectionLabel}>MES DONNÉES</Text>
                    <View style={styles.card}>
                        <DataRow icon="📱" label="Stockage local uniquement" />
                        <View style={styles.divider} />
                        <DataRow icon="🔑" label="Clé API encryptée sur ton appareil" />
                        <View style={styles.divider} />
                        <DataRow icon="📸" label="Screenshots jamais sauvegardés" />
                        <View style={styles.divider} />
                        <Pressable style={styles.dataRow} onPress={handleClearHistory}>
                            <Text style={styles.dataIcon}>💬</Text>
                            <Text style={[styles.dataLabel, { color: palette.error }]}>
                                Effacer tout l'historique
                            </Text>
                            <Ionicons name="trash-outline" size={16} color={palette.error} />
                        </Pressable>
                    </View>
                </Animated.View>

                {/* Section 5 — Action Log */}
                <Animated.View entering={FadeInDown.delay(400).duration(300)}>
                    <Text style={styles.sectionLabel}>JOURNAL DES ACTIONS</Text>
                    <View style={styles.card}>
                        {actionLog.length === 0 ? (
                            <View style={styles.emptyLog}>
                                <Ionicons name="reader-outline" size={24} color={palette.textMuted} />
                                <Text style={styles.emptyLogText}>
                                    Aucune action enregistrée.{'\n'}Le journal se remplit pendant l'exécution de l'agent.
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={actionLog}
                                keyExtractor={(_, i) => String(i)}
                                scrollEnabled={false}
                                renderItem={({ item }) => (
                                    <View style={styles.logRow}>
                                        <Text style={styles.logTime}>[{item.time}]</Text>
                                        <Text style={styles.logAction}>{item.action}</Text>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </Animated.View>

            </ScrollView>
        </View>
    );
}

/* ─── Helper Component ─── */
function DataRow({ icon, label }: { icon: string; label: string }) {
    return (
        <View style={styles.dataRow}>
            <Text style={styles.dataIcon}>{icon}</Text>
            <Text style={styles.dataLabel}>{label}</Text>
        </View>
    );
}

/* ═══ Styles ═══ */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg0 },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        height: 52,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.borderLight,
    },
    headerTitle: { ...typography.title, color: palette.textPrimary },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: palette.bg2,
        justifyContent: 'center',
        alignItems: 'center',
    },

    scroll: { flex: 1 },
    scrollContent: { padding: spacing.xl },

    sectionLabel: {
        ...typography.label,
        color: palette.textMuted,
        marginTop: spacing.xxl,
        marginBottom: spacing.sm,
        marginLeft: 2,
    },

    card: {
        backgroundColor: palette.bg2,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.borderLight,
        overflow: 'hidden',
    },

    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: palette.border,
        marginHorizontal: spacing.lg,
    },

    /* ── Trust Level ── */
    trustRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    trustRowActive: {
        backgroundColor: 'rgba(74, 222, 128, 0.05)',
    },
    trustIcon: {
        fontSize: 20,
    },
    trustInfo: {
        flex: 1,
    },
    trustLabel: {
        ...typography.body,
        color: palette.textSecondary,
        fontWeight: '500',
    },
    trustLabelActive: {
        color: palette.success,
    },
    trustDesc: {
        ...typography.caption,
        color: palette.textMuted,
        textTransform: 'none',
        letterSpacing: 0,
        marginTop: 2,
    },

    /* ── Apps ── */
    appRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    appName: {
        ...typography.body,
        color: palette.textSecondary,
        fontWeight: '500',
    },
    pkgName: {
        ...typography.caption,
        color: palette.textMuted,
        textTransform: 'none',
        letterSpacing: 0,
        marginTop: 2,
    },
    moreAppsRow: {
        padding: spacing.md,
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: palette.borderLight,
    },
    moreAppsText: {
        ...typography.bodySm,
        color: palette.textMuted,
    },

    /* ── Blocked Actions ── */
    blockedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    blockedIcon: {
        fontSize: 14,
    },
    blockedLabel: {
        ...typography.bodySm,
        color: palette.textSecondary,
        flex: 1,
    },
    blockedNote: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    blockedNoteText: {
        ...typography.caption,
        color: palette.textMuted,
        fontStyle: 'italic',
        textTransform: 'none',
        letterSpacing: 0,
    },

    /* ── Data ── */
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    dataIcon: {
        fontSize: 16,
    },
    dataLabel: {
        ...typography.bodySm,
        color: palette.textSecondary,
        flex: 1,
    },

    /* ── Action Log ── */
    emptyLog: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.sm,
    },
    emptyLogText: {
        ...typography.caption,
        color: palette.textMuted,
        textAlign: 'center',
        textTransform: 'none',
        letterSpacing: 0,
        lineHeight: 18,
    },
    logRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        gap: spacing.sm,
    },
    logTime: {
        ...typography.mono,
        color: palette.textMuted,
        fontSize: 11,
    },
    logAction: {
        ...typography.bodySm,
        color: palette.textSecondary,
        flex: 1,
    },
});
