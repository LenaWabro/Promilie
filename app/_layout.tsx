import {Tabs} from "expo-router";
import {Ionicons} from "@expo/vector-icons"


export default function TabsLayout(){
    return(
        <Tabs>
            <Tabs.Screen name="Galerie" options={{
                title: 'Galerie',
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="camera-outline" color={color} size={size} />
                ),
            }}/>
            <Tabs.Screen name="Scenner" options={{
                title: 'Scenner',
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="barcode-outline" color={color} size={size} />
                ),
            }}/>

            <Tabs.Screen name="Spiele" options={{
                title: 'Spiele',
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="dice-outline" color={color} size={size} />
                ),
            }}/>
        </Tabs>
    )
}