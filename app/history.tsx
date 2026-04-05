import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, radius, spacing, typography } from '@/constants/theme';
import { loadHistory, Conversation } from '@/src/services/HistoryService';

export default function HistoryScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [history, setHistory] = useState<Conversation[]>([]);

    useEffect(() => {
        loadHistory().then(setHistory);
    }, []);

    const handleSelect = (conv: Conversation) => {
         // TODO: pass into context or state
        router.back();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Animated.View entering={FadeIn.duration(200)} style={styles.header}>
                <Text style={styles.headerTitle}>Historique</Text>
                <Pressable style={styles.closeBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={20} color={palette.textTertiary} />
                </Pressable>
            </Animated.View>

            <FlatList
                data={history}
                keyExtractor={item => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: insets.bottom + 40 },
                    history.length === 0 && { flex: 1, justifyContent: 'center' }
                ]}
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
                        <Pressable 
                            style={styles.historyCard}
                            onPress={() => handleSelect(item)}
                        >
                            <View style={styles.cardHeader}>
                                <Ionicons name="chatbubble-outline" size={16} color={palette.accent} />
                                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            </View>
                            <View style={styles.cardFooter}>
                                <Text style={styles.cardInfo}>{item.messages.length} messages</Text>
                                <Text style={styles.cardInfo}>{new Date(item.date).toLocaleDateString()}</Text>
                            </View>
                        </Pressable>
                    </Animated.View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyWrap}>
                        <Ionicons name="file-tray-outline" size={48} color={palette.borderMed} />
                        <Text style={styles.emptyText}>Aucune conversation passée</Text>
                    </View>
                )}
            />
        </View>
    );
}

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
    listContent: { padding: spacing.xl },
    historyCard: {
        backgroundColor: palette.bg2,
        borderRadius: radius.md,
        padding: spacing.lg,
        marginBottom: spacing.md,
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
        ...typography.body,
        color: palette.textPrimary,
        fontWeight: '500',
        flex: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardInfo: {
        ...typography.caption,
        color: palette.textMuted,
        textTransform: 'none',
        letterSpacing: 0,
    },
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
    },
    emptyText: {
        ...typography.body,
        color: palette.textMuted,
    },
});
