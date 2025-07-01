import React, { useState } from "react";
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import Animated, {
    useSharedValue,
    withTiming,
    useAnimatedStyle,
    runOnJS,
} from "react-native-reanimated";
import { drinkingGames } from "../utils/drinkingGames";
import { DrinkingGame } from "../utils/types";

const { width } = Dimensions.get("window");
const wheelSize = width * 0.9;
const numberOfGames = drinkingGames.length;
const anglePerSegment = 360 / numberOfGames;

function HorizontalText({
                            text,
                            radius,
                            startAngle,
                            anglePerSegment,
                        }: {
    text: string;
    radius: number;
    startAngle: number;
    anglePerSegment: number;
}) {
    const midAngle = startAngle + anglePerSegment / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;

    const textRadius = radius * 0.5;

    const x = radius + textRadius * Math.cos(midAngleRad);
    const y = radius + textRadius * Math.sin(midAngleRad);

    return (
        <SvgText
            fill="white"
            fontSize={14}
            x={x}
            y={y}
            rotation={midAngle}
            origin={`${x}, ${y}`}
            textAnchor="middle"
            alignmentBaseline="middle"
        >
            {text}
        </SvgText>
    );
}

export default function Spiele() {
    const rotation = useSharedValue(0);
    const [selectedGame, setSelectedGame] = useState<DrinkingGame | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);

    const makeWheelSlices = () => {
        const slices = [];
        for (let i = 0; i < numberOfGames; i++) {
            const startAngle = i * anglePerSegment;
            const largeArcFlag = anglePerSegment > 180 ? 1 : 0;
            const radius = wheelSize / 2;
            const x1 = radius + radius * Math.cos((Math.PI * startAngle) / 180);
            const y1 = radius + radius * Math.sin((Math.PI * startAngle) / 180);
            const x2 = radius + radius * Math.cos((Math.PI * (startAngle + anglePerSegment)) / 180);
            const y2 = radius + radius * Math.sin((Math.PI * (startAngle + anglePerSegment)) / 180);
            const path = `
        M${radius} ${radius}
        L${x1} ${y1}
        A${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;

            slices.push(
                <G key={`slice-${i}`}>
                    <Path d={path} fill={i % 3 === 0 ? "#f4a261" : "#e76f51" } />
                    <HorizontalText
                        text={drinkingGames[i].name}
                        radius={radius}
                        startAngle={startAngle}
                        anglePerSegment={anglePerSegment}
                    />
                </G>
            );
        }
        return slices;
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const spinWheel = () => {
        if (isSpinning) return;
        setIsSpinning(true);
        setSelectedGame(null);

        const randomDeg = Math.floor(Math.random() * 360);
        const fullRotation = 360 * 3 + randomDeg;

        rotation.value = withTiming(fullRotation, { duration: 4000 }, () => {
            // Berechnung für 4 Spiele (90° pro Segment)
            const finalAngle = fullRotation % 360;

            // Da wir 4 Spiele haben, ist jedes Segment 90° groß
            // Pfeil zeigt nach unten, also starten wir bei 0° und teilen durch 90°
            let adjustedAngle = (finalAngle + 90) % 360;

            // Für gespiegelte Ergebnisse - Index umkehren
            const rawIndex = Math.floor(adjustedAngle / 90);
            const selectedIndex = (3 - rawIndex) % 4;

            runOnJS(setSelectedGame)(drinkingGames[selectedIndex]);
            runOnJS(setIsSpinning)(false);
        });
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>🎲 Trinkspiel-Glücksrad</Text>

            <View style={styles.wheelContainer}>
                <Animated.View style={[{ width: wheelSize, height: wheelSize }, animatedStyle]}>
                    <Svg width={wheelSize} height={wheelSize} viewBox={`0 0 ${wheelSize} ${wheelSize}`}>
                        {makeWheelSlices()}
                    </Svg>
                </Animated.View>
                <View style={styles.pointer} />
            </View>

            <TouchableOpacity
                onPress={spinWheel}
                style={[styles.button, isSpinning && styles.buttonDisabled]}
                disabled={isSpinning}
            >
                <Text style={styles.buttonText}>{isSpinning ? "Dreht..." : "Rad drehen"}</Text>
            </TouchableOpacity>

            {selectedGame && (
                <View style={styles.resultBox}>
                    <Text style={styles.resultTitle}>{selectedGame.name}</Text>
                    <Text style={styles.resultDesc}>{selectedGame.description}</Text>
                    <Text>👥 min. Spieler: {selectedGame.minPlayers}</Text>
                    <Text>🔥 Schwierigkeit: {selectedGame.difficulty}</Text>
                    <Text>🍻 Alkohol-Level: {selectedGame.alcoholLevel}</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: "#fff", alignItems: "center" },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
    wheelContainer: {
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 30,
    },
    pointer: {
        position: "absolute",
        top: -10, // statt top: -10
        width: 0,
        height: 0,
        borderLeftWidth: 15,
        borderRightWidth: 15,
        borderTopWidth: 30, // statt borderBottomWidth
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#e63946", // statt borderBottomColor
        zIndex: 10,

    },
    button: {
        backgroundColor: "#457b9d",
        paddingHorizontal: 40,
        paddingVertical: 12,
        borderRadius: 25,
    },
    buttonDisabled: {
        backgroundColor: "#999",
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 18,
    },
    resultBox: {
        marginTop: 25,
        padding: 15,
        backgroundColor: "#f1faee",
        borderRadius: 12,
        width: "100%",
    },
    resultTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
    },
    resultDesc: {
        marginBottom: 8,
        fontSize: 16,
    },
});
