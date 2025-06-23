// screens/Scanner.tsx
import React, { useState } from 'react'
import {
    View,
    Text,
    Button,
    StyleSheet,
    ActivityIndicator,
    Image,
    Alert
} from 'react-native'
import BarcodeScanner from '../components/BarcodeScanner'

type Product = {
    product_name: string
    brands: string
    image_url?: string
    alc_percent?: string
    nutriments?: {
        alcohol?: number
        alcohol_100g?: number
        [key: string]: any
    }
}

export default function ScannerScreen() {
    const [scanning, setScanning] = useState(false)          // neu: Steuerung, ob Kamera offen ist
    const [code, setCode]       = useState<string | null>(null)
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(false)

    // API-Abfrage
    const fetchProduct = async (barcode: string) => {
        setLoading(true)
        try {
            const res  = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
            )
            const json = await res.json()
            if (json.status === 1) {
                setProduct(json.product as Product)
            } else {
                Alert.alert('Nicht gefunden', 'Kein Produkt zu diesem Barcode.')
            }
        } catch {
            Alert.alert('Fehler', 'Daten konnten nicht geladen werden.')
        } finally {
            setLoading(false)
        }
    }

    // Wird vom BarcodeScanner aufgerufen
    const handleScanned = (barcode: string) => {
        setScanning(false)        // Kamera schließen
        setCode(barcode)
        fetchProduct(barcode)
    }

    // 1) Noch nicht gescannt: Button anbieten
    if (!scanning && !code) {
        return (
            <View style={styles.center}>
                <Button
                    title="Produkt scannen"
                    onPress={() => {
                        setProduct(null)
                        setCode(null)
                        setScanning(true)
                    }}
                />
            </View>
        )
    }

    // 2) Kamera geöffnet
    if (scanning && !code) {
        return (
            <View style={styles.container}>
                <BarcodeScanner onScanned={handleScanned} />
            </View>
        )
    }

    // 3) Ladezustand nach Scan
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF6B6B" />
                <Text>Lade Produktdaten…</Text>
            </View>
        )
    }

    // 4) Ergebnis-Ansicht
    // Berechnung des Alkoholgehalts mit Fallbacks
    const alc = product
        ? product.alc_percent
            ? `${product.alc_percent}%`
            : product.nutriments?.alcohol !== undefined
                ? `${product.nutriments.alcohol}%`
                : product.nutriments?.alcohol_100g !== undefined
                    ? `${product.nutriments.alcohol_100g}%`
                    : 'N/A'
        : 'N/A'

    return (
        <View style={styles.container}>
            {product ? (
                <>
                    <Text style={styles.title}>🧾 {product.product_name}</Text>
                    <Text>🏷️ Marke: {product.brands}</Text>
                    <Text style={styles.alc}>🍻 Alkohol: {alc}</Text>
                    {product.image_url && (
                        <Image
                            source={{ uri: product.image_url }}
                            style={styles.image}
                        />
                    )}
                </>
            ) : (
                <Text>Kein Produkt gefunden.</Text>
            )}
            <Button
                title="🔄 Noch mal scannen"
                onPress={() => {
                    setCode(null)
                    setProduct(null)
                    setScanning(false)
                }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title:     { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    alc:       { fontSize: 18, marginVertical: 6, color: '#FF6B6B' },
    image:     { width: 200, height: 200, marginVertical: 12 },
})
