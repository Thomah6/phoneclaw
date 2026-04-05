import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

import { palette, radius, spacing, typography } from '@/constants/theme';
import { AgentCore } from '@/src/agent/AgentCore';
import { loadSettings } from '@/src/agent/settings';
import { AgentSettings, DEFAULT_SETTINGS, UIMessage } from '@/src/agent/types';
import ClawAccessibilityModule from '@/src/native/ClawAccessibilityModule';
import { saveConversation } from '@/src/services/HistoryService';
import { VoiceService } from '@/src/services/VoiceService';

let msgId = Date.now();
const uid = () => String(++msgId);

/* ─── Suggestion Cards ─── */
const SUGGESTIONS = [
    { icon: 'car-outline' as const, label: 'Commande un Uber', desc: 'Ouvre Uber et commande pour la maison' },
    { icon: 'musical-notes-outline' as const, label: 'Mets de la musique', desc: 'Ouvre Spotify et lance un bon mix' },
    { icon: 'restaurant-outline' as const, label: 'Trouve un resto', desc: 'Cherche un bon dîner sur Maps' },
    { icon: 'paper-plane-outline' as const, label: 'Envoie une photo', desc: 'Partage la dernière photo sur WhatsApp' },
];

/* ─── Dashed Separator ─── */
const DashedSeparator = memo(({ label }: { label?: string }) => (
    <View style={styles.dashedRow}>
        <View style={styles.dashedLine} />
        {label && <Text style={styles.dashedLabel}>{label}</Text>}
        <View style={styles.dashedLine} />
    </View>
));

/* ─── Animated Thinking Indicator ─── */
const ThinkingIndicator = memo(() => {
    const dot1 = useSharedValue(0);
    const dot2 = useSharedValue(0);
    const dot3 = useSharedValue(0);

    useEffect(() => {
        const bounce = (delay: number) =>
            withDelay(delay, withRepeat(
                withSequence(
                    withTiming(-5, { duration: 280 }),
                    withTiming(0, { duration: 280 })
                ), -1, true
            ));
        dot1.value = bounce(0);
        dot2.value = bounce(140);
        dot3.value = bounce(280);
    }, []);

    const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
    const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
    const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

    return (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.thinkingRow}>
            <View style={styles.thinkingIcon}>
                <Ionicons name="sparkles" size={14} color={palette.textTertiary} />
            </View>
            <View style={styles.thinkingBubble}>
                <Text style={styles.thinkingLabel}>Thinking</Text>
                <View style={styles.dotsWrap}>
                    <Animated.View style={[styles.dot, s1]} />
                    <Animated.View style={[styles.dot, s2]} />
                    <Animated.View style={[styles.dot, s3]} />
                </View>
            </View>
        </Animated.View>
    );
});


/* ─── Tool Execution Card ─── */
const ToolCard = memo(({
    toolName, params, result, isResult,
}: {
    toolName?: string;
    params?: Record<string, any>;
    result?: string;
    isResult: boolean;
}) => {
    const [expanded, setExpanded] = useState(false);
    const accent = isResult ? palette.toolGreen : palette.toolBlue;
    const bg = isResult ? palette.toolGreenBg : palette.toolBlueBg;

    return (
        <Animated.View entering={FadeInDown.duration(200)}>
            <Pressable
                onPress={() => setExpanded(p => !p)}
                style={[styles.toolCard, { borderColor: isResult ? 'rgba(74,222,128,0.15)' : 'rgba(96,165,250,0.15)' }]}
            >
                <View style={styles.toolHeader}>
                    <View style={[styles.toolDot, { backgroundColor: accent }]} />
                    <Text style={[styles.toolName, { color: accent }]}>
                        {isResult ? '✓ ' : ''}{toolName}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={12}
                        color={palette.textMuted}
                    />
                </View>
                {expanded && (
                    <View style={[styles.toolBody, { backgroundColor: bg }]}>
                        <Text style={styles.toolCode} numberOfLines={isResult ? 15 : 8}>
                            {isResult ? result : JSON.stringify(params, null, 2)}
                        </Text>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
});

/* ─── Empty State Content ─── */
const APP_SPECIFIC_SUGGESTIONS: Record<string, { icon: any, label: string, desc: string }> = {
    'com.whatsapp': { icon: 'logo-whatsapp', label: 'Envoie un message', desc: 'Dis bonjour sur WhatsApp' },
    'com.spotify.music': { icon: 'musical-notes-outline', label: 'Mets de la musique', desc: 'Lance ta playlist Spotify' },
    'com.ubercab': { icon: 'car-outline', label: 'Commande un Uber', desc: 'Pour rentrer à la maison' },
    'com.google.android.apps.maps': { icon: 'map-outline', label: 'Trouve un resto', desc: 'Cherche un bon dîner sur Maps' },
    'com.google.android.youtube': { icon: 'logo-youtube', label: 'Mets une vidéo', desc: 'Lance du Squeezie sur YouTube' },
    'com.instagram.android': { icon: 'logo-instagram', label: 'Check Insta', desc: 'Ouvre Insta et regarde le feed' },
};

const EmptyState = memo(({ onSend }: { onSend: (text: string) => void }) => {
    const [dynamicSuggestions, setDynamicSuggestions] = useState(SUGGESTIONS);

    useEffect(() => {
        ClawAccessibilityModule.getInstalledApps().then(apps => {
            if (!apps || apps.length === 0) return;
            
            const matched: typeof SUGGESTIONS = [];
            for (const app of apps) {
                if (APP_SPECIFIC_SUGGESTIONS[app.packageName]) {
                    matched.push(APP_SPECIFIC_SUGGESTIONS[app.packageName]);
                }
            }

            // Shuffle and pick up to 4
            const shuffled = matched.sort(() => 0.5 - Math.random());
            let finalSuggestions = shuffled.slice(0, 4);

            // Backfill with generic ones if we don't have 4
            if (finalSuggestions.length < 4) {
                const remaining = 4 - finalSuggestions.length;
                finalSuggestions = [...finalSuggestions, ...SUGGESTIONS.slice(0, remaining)];
            }
            
            setDynamicSuggestions(finalSuggestions);
        }).catch(console.error);
    }, []);

    return (
        <View style={styles.emptyContainer}>
            <Animated.View entering={FadeIn.duration(500)} style={styles.emptyTop}>
                <View style={styles.emptyLogoOuter}>
                    <View style={styles.emptyLogoInner}>
                        <Ionicons name="aperture" size={32} color={palette.accent} />
                    </View>
                </View>
                <Text style={styles.emptyTitle}>OpenDroid</Text>
                <Text style={styles.emptyDesc}>Ton agent IA pour Android.{'\n'}Dis-moi quoi faire — je m'en occupe.</Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.suggestionsWrap}>
                <Text style={styles.suggestionsLabel}>Essaie quelque chose</Text>
                <View style={styles.suggestionsGrid}>
                    {dynamicSuggestions.map((s, i) => (
                        <Pressable
                            key={i}
                            style={({ pressed }) => [
                                styles.suggestionCard,
                                pressed && styles.suggestionCardPressed,
                            ]}
                            onPress={() => onSend(s.label)}
                        >
                            <Ionicons name={s.icon} size={18} color={palette.textTertiary} style={{ marginBottom: 6 }} />
                            <Text style={styles.suggestionTitle}>{s.label}</Text>
                            <Text style={styles.suggestionDesc}>{s.desc}</Text>
                        </Pressable>
                    ))}
                </View>
            </Animated.View>
        </View>
    );
});

function formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════════════════════════
   MAIN CHAT SCREEN
   ══════════════════════════════════════════════════════════ */
export default function ChatScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [input, setInput] = useState('');
    const inputRef = useRef('');
    const [running, setRunning] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS);
    const agentRef = useRef<AgentCore | null>(null);
    const listRef = useRef<FlatList>(null);
    const voiceService = useRef(new VoiceService());

    useEffect(() => {
        inputRef.current = input;
    }, [input]);

    useEffect(() => {
        const init = async () => {
            const hasOnboarded = await AsyncStorage.getItem('opendroid_onboarding_done');
            if (!hasOnboarded) {
                router.replace('/onboarding' as any);
                return;
            }
            const s = await loadSettings();
            setSettings(s);
            if (!s.apiKey) {
                router.push('/settings' as any);
            }
        };
        init();
    }, []);

    const scrollToEnd = useCallback(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }, []);

    const addMessage = useCallback((msg: Omit<UIMessage, 'id' | 'timestamp'>) => {
        const full: UIMessage = { ...msg, id: uid(), timestamp: Date.now() };
        setMessages(prev => [...prev, full]);
        scrollToEnd();
    }, [scrollToEnd]);

    const handleSend = useCallback(async (text?: string) => {
        const msg = (text || inputRef.current).trim();
        if (!msg || running) return;

        Keyboard.dismiss();
        setInput('');
        inputRef.current = '';
        addMessage({ type: 'user', text: msg });

        if (!settings.apiKey) {
            addMessage({ type: 'error', text: 'No API key configured. Tap the gear icon to add one.' });
            return;
        }

        setRunning(true);

        const agent = new AgentCore(settings, {
            onThinking: () => setIsThinking(true),
            onToolCall: (name, params) => {
                setIsThinking(false);
                addMessage({ type: 'tool_call', text: `${name}(${JSON.stringify(params)})`, toolName: name, toolParams: params });
            },
            onToolResult: (name, result) =>
                addMessage({ type: 'tool_result', text: result.slice(0, 500), toolName: name, toolResult: result }),
            onResponse: (text) => {
                setIsThinking(false);
                addMessage({ type: 'assistant', text });
            },
            onError: (error) => {
                setIsThinking(false);
                addMessage({ type: 'error', text: error });
            },
        });

        agentRef.current = agent;
        await ClawAccessibilityModule.startAgentService();

        try {
            await agent.run(msg);
        } catch (e: any) {
            addMessage({ type: 'error', text: e.message || 'Unknown error' });
        }

        await ClawAccessibilityModule.stopAgentService();
        agentRef.current = null;
        setRunning(false);
        setIsThinking(false);

        // Save conversation to history
        setMessages(cur => {
            saveConversation(cur);
            return cur;
        });
    }, [running, settings, addMessage]);

    const handleStop = useCallback(() => {
        setIsThinking(false);
        agentRef.current?.abort();
        ClawAccessibilityModule.stopAgentService();
    }, []);

    const handleNewConversation = useCallback(() => {
        if (running) return;
        if (messages.length > 0) {
            saveConversation(messages);
        }
        setMessages([]);
    }, [running, messages]);

    const handleMicPress = useCallback(async () => {
        if (isRecording) {
            setIsRecording(false);
            const text = await voiceService.current.stopAndTranscribe(settings.apiKey, settings.baseUrl);
            if (text) setInput(text);
        } else {
            setIsRecording(true);
            try {
                await voiceService.current.startRecording();
            } catch (e: any) {
                setIsRecording(false);
                Alert.alert('Erreur micro', e.message || 'Impossible d\'accéder au micro.');
            }
        }
    }, [isRecording, settings]);

    // Handle Floating Bubble Clicks
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('onOverlayClicked', () => {
            // Slight delay ensures the native Android Intent has fully reopened the main Activity
            // and the Mic Permission dialog (if any) can render natively without immediate background suppression.
            setTimeout(() => {
                handleMicPress(); // Trigger voice recording globally
            }, 300);
        });
        return () => sub.remove();
    }, [handleMicPress]);

    /* ─── Message Renderer ─── */
    const renderMessage = useCallback(({ item, index }: { item: UIMessage; index: number }) => {
        const prev = index > 0 ? messages[index - 1] : null;
        const showSep = item.type === 'user' && prev && prev.type !== 'user' && index > 0;

        return (
            <View>
                {showSep && <DashedSeparator />}

                {item.type === 'user' && (
                    <Animated.View entering={FadeInDown.duration(200)} style={styles.userRow}>
                        <View style={styles.userBubble}>
                            <Text style={styles.userText}>{item.text}</Text>
                        </View>
                        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
                    </Animated.View>
                )}

                {item.type === 'assistant' && (
                    <Animated.View entering={FadeInDown.duration(200)} style={styles.assistantRow}>
                        <View style={styles.assistantBubble}>
                            <View style={styles.assistantHeader}>
                                <View style={styles.assistantDot} />
                                <Text style={styles.assistantLabel}>OpenDroid</Text>
                            </View>
                            <Text style={styles.assistantText}>{item.text}</Text>
                        </View>
                        <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
                    </Animated.View>
                )}

                {item.type === 'tool_call' && (
                    <ToolCard toolName={item.toolName} params={item.toolParams} isResult={false} />
                )}

                {item.type === 'tool_result' && (
                    <ToolCard toolName={item.toolName} result={item.text} isResult={true} />
                )}


                {item.type === 'error' && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.errorCard}>
                        <Ionicons name="warning-outline" size={16} color={palette.error} />
                        <Text style={styles.errorText}>{item.text}</Text>
                    </Animated.View>
                )}
            </View>
        );
    }, [messages]);

    const renderEmpty = useCallback(() => <EmptyState onSend={handleSend} />, [handleSend]);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            {/* ─── Header ─── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>OpenDroid</Text>
                    {running && (
                        <Animated.View entering={FadeIn.duration(200)} style={styles.runBadge}>
                            <View style={styles.runDot} />
                            <Text style={styles.runText}>Running</Text>
                        </Animated.View>
                    )}
                </View>
                <View style={styles.headerRight}>
                    <Pressable style={styles.headerIconBtn} onPress={() => router.push('/history' as any)}>
                        <Ionicons name="time-outline" size={20} color={palette.textTertiary} />
                    </Pressable>
                    {messages.length > 0 && !running && (
                        <Pressable style={styles.headerIconBtn} onPress={handleNewConversation}>
                            <Ionicons name="add-circle-outline" size={20} color={palette.textTertiary} />
                        </Pressable>
                    )}
                    <Pressable style={styles.headerIconBtn} onPress={() => router.push('/security' as any)}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={palette.textTertiary} />
                    </Pressable>
                    <Pressable style={styles.headerIconBtn} onPress={() => router.push('/settings')}>
                        <Ionicons name="settings-outline" size={20} color={palette.textTertiary} />
                    </Pressable>
                </View>
            </View>

            {/* ─── Messages ─── */}
            <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={[
                    styles.listContent,
                    messages.length === 0 && { flex: 1 },
                ]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={scrollToEnd}
                // Important for keyboard handling: push list up
                automaticallyAdjustContentInsets={false}
                ListFooterComponent={isThinking ? <View style={{ paddingHorizontal: spacing.xl }}><ThinkingIndicator /></View> : null}
            />

            {/* ─── Input Bar ─── */}
            <View style={[
                styles.inputOuter,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
            ]}>
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Dis quelque chose à OpenDroid..."
                        placeholderTextColor={palette.textMuted}
                        onSubmitEditing={() => handleSend()}
                        returnKeyType="send"
                        editable={!running}
                        multiline
                        maxLength={2000}
                        blurOnSubmit={false}
                    />
                    {/* Mic Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.micBtn,
                            isRecording && styles.micBtnRecording,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={handleMicPress}
                        disabled={running}
                    >
                        <Ionicons
                            name={isRecording ? 'stop-circle' : 'mic-outline'}
                            size={20}
                            color={isRecording ? palette.error : palette.textTertiary}
                        />
                    </Pressable>
                    {/* Send / Stop Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.sendBtn,
                            (!input.trim() && !running) && styles.sendBtnDisabled,
                            pressed && (input.trim() || running) && styles.sendBtnActive,
                            running && { backgroundColor: palette.errorBg, borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: StyleSheet.hairlineWidth },
                        ]}
                        onPress={() => running ? handleStop() : handleSend()}
                        disabled={!input.trim() && !running}
                    >
                        <Ionicons
                            name={running ? 'stop' : 'arrow-up'}
                            size={18}
                            color={running ? palette.error : (input.trim() ? palette.bg0 : palette.textMuted)}
                        />
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.bg0,
    },

    /* ── Header ── */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        height: 52,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: palette.borderLight,
        backgroundColor: palette.bg0,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerTitle: {
        ...typography.title,
        color: palette.textPrimary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    runBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.accentGlow,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
        gap: 4,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.borderLight,
    },
    runDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: palette.success,
    },
    runText: {
        ...typography.caption,
        color: palette.textTertiary,
        textTransform: 'none',
        letterSpacing: 0,
    },
    stopBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: palette.errorBg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },

    /* ── Messages ── */
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },

    /* ── Dashed Separator ── */
    dashedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xl,
        gap: spacing.sm,
    },
    dashedLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: palette.borderDashed,
    },
    dashedLabel: {
        ...typography.caption,
        color: palette.textMuted,
        textTransform: 'none',
        letterSpacing: 0,
    },

    /* ── User Message ── */
    userRow: {
        alignItems: 'flex-end',
        marginBottom: spacing.lg,
    },
    userBubble: {
        maxWidth: '80%',
        backgroundColor: palette.bg3,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        borderBottomRightRadius: radius.xs,
    },
    userText: {
        ...typography.body,
        color: palette.textPrimary,
    },

    /* ── Assistant Message ── */
    assistantRow: {
        marginBottom: spacing.lg,
    },
    assistantBubble: {
        maxWidth: '90%',
        paddingVertical: spacing.md,
    },
    assistantHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    assistantDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: palette.textTertiary,
    },
    assistantLabel: {
        ...typography.caption,
        color: palette.textMuted,
        textTransform: 'none',
        letterSpacing: 0,
    },
    assistantText: {
        ...typography.body,
        color: palette.textSecondary,
        lineHeight: 24,
    },

    /* ── Tool Card ── */
    toolCard: {
        marginBottom: spacing.sm,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: palette.bg1,
        overflow: 'hidden',
    },
    toolHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        gap: 6,
    },
    toolDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    toolName: {
        ...typography.bodySm,
        fontWeight: '500',
    },
    toolBody: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: palette.border,
    },
    toolCode: {
        ...typography.mono,
        color: palette.textTertiary,
    },

    /* ── Thinking ── */
    thinkingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    thinkingIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: palette.bg2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thinkingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    thinkingLabel: {
        ...typography.bodySm,
        color: palette.textMuted,
        fontStyle: 'italic',
    },
    dotsWrap: {
        flexDirection: 'row',
        gap: 3,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: palette.textMuted,
    },

    /* ── Error ── */
    errorCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: palette.errorBg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.md,
        marginBottom: spacing.md,
        gap: spacing.sm,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(239, 68, 68, 0.15)',
    },
    errorText: {
        ...typography.bodySm,
        color: palette.error,
        flex: 1,
    },

    /* ── Empty State ── */
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        marginTop: 40,
    },
    emptyTop: {
        alignItems: 'center',
        marginBottom: 40,
    },
    emptyLogoOuter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: palette.accentSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
        shadowColor: palette.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    emptyLogoInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: palette.bg2,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.accentSoft,
    },
    emptyTitle: {
        ...typography.hero,
        color: palette.textPrimary,
        marginBottom: spacing.sm,
    },
    emptyDesc: {
        ...typography.body,
        color: palette.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },

    /* ── Suggestions ── */
    suggestionsWrap: {
        marginTop: spacing.sm,
    },
    suggestionsLabel: {
        ...typography.label,
        color: palette.textMuted,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    suggestionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    suggestionCard: {
        width: '48.5%',
        backgroundColor: palette.bg2,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.borderLight,
    },
    suggestionCardPressed: {
        backgroundColor: palette.bg3,
        borderColor: palette.borderMed,
    },
    suggestionTitle: {
        ...typography.bodySm,
        color: palette.textSecondary,
        fontWeight: '500',
        marginBottom: 2,
    },
    suggestionDesc: {
        ...typography.caption,
        color: palette.textMuted,
        textTransform: 'none',
        letterSpacing: 0,
    },

    /* ── Timestamp ── */
    timestamp: {
        ...typography.caption,
        color: palette.textMuted,
        marginTop: 4,
        textTransform: 'none',
        letterSpacing: 0,
    },

    /* ── Input Bar ── */
    inputOuter: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: palette.border,
        backgroundColor: palette.bg0,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: palette.bg2,
        borderRadius: radius.xl,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: palette.borderLight,
        paddingLeft: spacing.lg,
        paddingRight: spacing.xs,
        paddingVertical: spacing.xs,
        gap: spacing.sm,
    },
    input: {
        flex: 1,
        ...typography.body,
        color: palette.textPrimary,
        paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
        maxHeight: 120,
        minHeight: 36,
    },
    micBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    micBtnRecording: {
        backgroundColor: palette.errorBg,
    },
    sendBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: palette.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    sendBtnDisabled: {
        backgroundColor: palette.bg3,
    },
    sendBtnActive: {
        backgroundColor: palette.accentDark,
    },
});
