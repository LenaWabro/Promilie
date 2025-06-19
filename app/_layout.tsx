import {Tabs} from "expo-router";
import {Ionicons} from "@expo/vector-icons"


export default function TabsLayout(){
    return(
        <Tabs>
            <Tabs.Screen name="galerie" options={{
                title: 'galerie',
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="camera-outline" color={color} size={size} />
                ),
            }}/>
            <Tabs.Screen name="scanner" options={{
                title: 'scanner',
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="barcode-outline" color={color} size={size} />
                ),
            }}/>

            <Tabs.Screen name="spiele" options={{
                title: 'spiele',
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="dice-outline" color={color} size={size} />
                ),
            }}/>
        </Tabs>
    )
}