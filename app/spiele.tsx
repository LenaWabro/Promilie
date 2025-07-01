import React, { useState } from "react";
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ImageBackground,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import Animated, {
    useSharedValue,
    withTiming,
    useAnimatedStyle,
    runOnJS,
} from "react-native-reanimated";
import { drinkingGames } from "../utils/drinkingGames";
import { DrinkingGame } from "../utils/types";

const { width, height: screenHeight } = Dimensions.get("window");
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
                    <Path
                        d={path}
                        fill="#c48cf1"
                        stroke="#AF52DE"
                        strokeWidth={2}
                    />
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

        // Reset für Rotation (bleibt visuell gleich, aber ermöglicht sofortiges neu Drehen)
        rotation.value = 0;

        setIsSpinning(true);
        setSelectedGame(null);

        const randomDeg = Math.floor(Math.random() * 360);
        const fullRotation = 360 * 3 + randomDeg;

        rotation.value = withTiming(fullRotation, { duration: 4000 }, () => {
            const finalAngle = fullRotation % 360;
            let adjustedAngle = (finalAngle + 90) % 360;
            const rawIndex = Math.floor(adjustedAngle / 90);
            const selectedIndex = (3 - rawIndex) % 4;

            runOnJS(setSelectedGame)(drinkingGames[selectedIndex]);
            runOnJS(setIsSpinning)(false);
        });
    };

    return (
        <ScrollView
            contentContainerStyle={[styles.container, { minHeight: screenHeight }]}
            style={{ backgroundColor: '#400A6D' }}
        >
            <ImageBackground
                source={require('../img/becher.jpeg')}
                style={styles.header}
            >
                <View style={styles.headerOverlay}>
                    <Text style={styles.headerTitle}>Spiele</Text>
                </View>
            </ImageBackground>

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

                    <View style={styles.iconRow}>
                        <Ionicons name="person-outline" color="#CFA8FF" size={24} />
                        <Text style={styles.iconText}>min. Spieler: {selectedGame.minPlayers}</Text>
                    </View>

                    <View style={styles.iconRow}>
                        <Ionicons name="flame-outline" color="#CFA8FF" size={24} />
                        <Text style={styles.iconText}>Schwierigkeit: {selectedGame.difficulty}</Text>
                    </View>

                    <View style={styles.iconRow}>
                        <Ionicons name="wine-outline" color="#CFA8FF" size={24} />
                        <Text style={styles.iconText}>Alkohol-Level: {selectedGame.alcoholLevel}</Text>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 40,
    },
    header: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#CFA8FF',
        position: 'relative',
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginVertical: 20,
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    wheelContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    pointer: {
        position: 'absolute',
        top: -10,
        width: 0,
        height: 0,
        borderLeftWidth: 15,
        borderRightWidth: 15,
        borderTopWidth: 30,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#AF52DE',
        zIndex: 10,
    },
    button: {
        backgroundColor: '#C48cf1',
        width: '90%',
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    buttonDisabled: {
        backgroundColor: '#999',
    },
    resultBox: {
        backgroundColor: 'white',
        marginTop: 25,
        padding: 15,
        borderRadius: 12,
        width: '90%',
    },
    resultTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        color: 'black',
        textTransform: 'uppercase',
    },
    resultDesc: {
        marginBottom: 8,
        fontSize: 16,
        color: 'black',
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconText: {
        marginLeft: 8,
        fontSize: 16,
        color: 'black',
    },
});
