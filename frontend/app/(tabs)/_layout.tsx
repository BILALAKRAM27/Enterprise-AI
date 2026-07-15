import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme, Platform } from 'react-native';

// Theme tokens from DESIGN.md
const TOKENS = {
  light: {
    bgTabBar: '#F7F7F8',        // bg.sidebar
    borderTop: '#E4E4E7',       // border.default (neutral.200)
    activeTint: '#3652E3',      // ink.default
    inactiveTint: '#71717A',    // text.secondary (neutral.500)
  },
  dark: {
    bgTabBar: '#101215',        // bg.sidebar
    borderTop: '#3F3F46',       // border.default (neutral.700)
    activeTint: '#6E85FF',      // ink.default
    inactiveTint: '#A1A1AA',    // text.secondary (neutral.400)
  },
};

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? TOKENS.dark : TOKENS.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.activeTint,
        tabBarInactiveTintColor: theme.inactiveTint,
        tabBarLabelStyle: {
          fontFamily: 'Inter', // Matches Body typeface spec
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: theme.borderTop,
          backgroundColor: theme.bgTabBar,
          ...Platform.select({
            ios: {
              height: 64 + 16, // 64 height spec + safe-area-bottom pad margin
              paddingBottom: 20,
            },
            android: {
              height: 64,
              paddingBottom: 8,
            },
            default: {
              height: 64,
              paddingBottom: 8,
            }
          }),
          paddingTop: 10,
          elevation: 0, // No Android shadow cast
          shadowOpacity: 0, // No iOS shadow cast
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color }) => (
            <Feather name="file-text" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color }) => (
            <Feather name="message-square" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}