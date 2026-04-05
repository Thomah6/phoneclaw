import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { palette } from '@/constants/theme';

const openDroidDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.bg0,
    card: palette.bg1,
    border: palette.border,
    text: palette.textPrimary,
    primary: palette.accent,
  },
};

export default function RootLayout() {
  return (
<ThemeProvider value={openDroidDark}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg0 },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="security"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            presentation: 'modal',
            animation: 'slide_from_left',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
