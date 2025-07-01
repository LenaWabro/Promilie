// components/BarcodeScanner.tsx

import React, { useState } from 'react'
import { View, Text, Button, TouchableOpacity, StyleSheet } from 'react-native'
import {
    CameraView,
    CameraType,
    useCameraPermissions,
    BarcodeScanningResult,
} from 'expo-camera'

type Props = {
    onScanned: (data: string) => void
}

export default function BarcodeScanner({ onScanned }: Props) {
    const [facing, setFacing] = useState<CameraType>('back')
    const [permission, requestPermission] = useCameraPermissions()
    const [scanned, setScanned] = useState(false)

    if (!permission) return null

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={styles.message}>
                    Wir brauchen deine Erlaubnis für die Kamera.
                </Text>
                <Button title="Erlaubnis erteilen" onPress={requestPermission} />
            </View>
        )
    }

    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'))
    }

    const handleBarcodeScanned = (result: BarcodeScanningResult) => {
        if (!scanned) {
            setScanned(true)
            onScanned(result.data)
        }
    }

    return (
        <CameraView
            style={styles.camera}
            facing={facing}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
                barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
            }}
        >
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                    <Text style={styles.buttonText}>Flip Camera</Text>
                </TouchableOpacity>
            </View>
        </CameraView>
    )
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    message: {
        textAlign: 'center',
        marginBottom: 10,
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: '#00000088',
        padding: 10,
        borderRadius: 10,
    },
    button: {
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
})
