import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function App() {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [data, setData] = useState('');

    useEffect(() => {
        (async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    if (hasPermission === null) return <Text>Frage nach Kamera-Erlaubnis…</Text>;
    if (hasPermission === false) return <Text>Kein Zugriff auf Kamera</Text>;

    return (
        <View style={styles.container}>
            <BarCodeScanner
                onBarCodeScanned={scanned ? undefined : ({ data }) => {
                    setScanned(true);
                    setData(data);
                }}
                style={StyleSheet.absoluteFillObject}
            />
            {scanned && <Button title="Nochmals scannen" onPress={() => setScanned(false)} />}
            {data && <Text style={styles.result}>📦 {data}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    result: {
        position: 'absolute',
        bottom: 40,
        backgroundColor: '#fff',
        padding: 10,
    }
});
