import React, { useState } from 'react'
import { View, Text, Button, TouchableOpacity, StyleSheet } from 'react-native'
import {
    CameraView,               // Expo Kamera-Komponente
    CameraType,               // Typ für front/back
    useCameraPermissions,     // Hook für Zugriffsrechte
    BarcodeScanningResult,    // Typ für Scan-Resultat
} from 'expo-camera'

// Props-Typ: Der Scanner ruft bei Erfolg `onScanned` mit dem Barcode auf
type Props = {
    onScanned: (data: string) => void
}

export default function BarcodeScanner({ onScanned }: Props) {
    // Kamera-Richtung (vorne/hinten)
    const [facing, setFacing] = useState<CameraType>('back')

    // Kamera-Berechtigungen
    const [permission, requestPermission] = useCameraPermissions()

    // Mehrfach-Scan-Blocker (innerhalb der Kamera)
    const [scanned, setScanned] = useState(false)

    // Wenn noch kein permission-Objekt da ist, rendern wir nichts
    if (!permission) return null

    // Wenn keine Berechtigung erteilt → Info + Button
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

    // Umschalten Kamera: front/back
    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'))
    }

    // Barcode wurde gescannt → nur einmal reagieren!
    const handleBarcodeScanned = (result: BarcodeScanningResult) => {
        if (!scanned) {
            setScanned(true)          // Lokale Sperre
            onScanned(result.data)    // Barcode an Parent schicken
        }
    }

    return (
        <CameraView
            style={styles.camera}              // Fullscreen Kamera
            facing={facing}                    // Vorne oder hinten
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
                barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'], // welche Typen erkannt werden
            }}
        >
            {/* Button für Kamera flip */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
                    <Text style={styles.buttonText}>Flip Camera</Text>
                </TouchableOpacity>
            </View>
        </CameraView>
    )
}

// Styles für Layout & Buttons
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
