import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
        <Tabs>
            <Tabs.Screen
                name="index"
                options={{
                    href: null,
                    headerShown: false,  // nicht in TabBar und kein Header
                }}
            />
            <Tabs.Screen
                name="galerie"
                options={{
                    title: 'Galerie',
                    headerShown: false,   // <-- hier ausschalten
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="camera-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="scanner"
                options={{
                    title: 'Scanner',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="barcode-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="spiele"
                options={{
                    title: 'Spiele',
                    headerShown: false,   // <-- hier ausschalten
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="dice-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}
