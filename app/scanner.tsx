import React, { useState } from 'react'
import {
    View,
    Text,
    Button,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    ImageBackground,
} from 'react-native'
import BarcodeScanner from '../components/BarcodeScanner'

type Product = {
    code: string
    product_name: string
    brands: string
    alc_percent?: string
    nutriments?: {
        alcohol?: number
        alcohol_100g?: number
        [key: string]: any
    }
}

export default function ScannerScreen() {
    const [scanning, setScanning] = useState(false)
    const [scanned, setScanned] = useState(false)
    const [code, setCode] = useState<string | null>(null)
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(false)

    const [weight, setWeight] = useState<string>('')
    const [amountML, setAmountML] = useState<string>('500')
    const [gender, setGender] = useState<'m' | 'f'>('m')
    const [promille, setPromille] = useState<string | null>(null)

    const fetchProduct = async (barcode: string) => {
        setLoading(true)
        try {
            const res = await fetch(
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

    const handleScanned = (barcode: string) => {
        if (!scanned) {
            setScanned(true)
            setScanning(false)
            setCode(barcode)
            fetchProduct(barcode)
        }
    }

    const calculatePromille = () => {
        if (!weight || !amountML) {
            Alert.alert('Fehler', 'Bitte Gewicht und Menge eingeben.')
            return
        }

        const alcPercent = product?.alc_percent
            ? parseFloat(product.alc_percent)
            : product?.nutriments?.alcohol ?? product?.nutriments?.alcohol_100g ?? 0

        const amount = parseFloat(amountML)
        const userWeight = parseFloat(weight)

        const gramAlk = amount * (alcPercent / 100) * 0.8
        const r = gender === 'm' ? 0.68 : 0.55
        const promille = gramAlk / userWeight * r
        setPromille(promille.toFixed(2))
    }

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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                {/* Banner bleibt */}
                <ImageBackground
                    source={require('../img/Scenner.jpeg')}
                    style={styles.header}
                >
                    <View style={styles.headerOverlay}>
                        <Text style={styles.headerTitle}>SCANNER</Text>
                    </View>
                </ImageBackground>

                {!scanning && !code ? (
                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={() => {
                            setProduct(null)
                            setCode(null)
                            setScanning(true)
                            setScanned(false)
                            setPromille(null)
                        }}
                    >
                        <Text style={styles.scanButtonText}>PRODUKT SCANNEN</Text>
                    </TouchableOpacity>
                ) : scanning && !code ? (
                    <BarcodeScanner onScanned={handleScanned} />
                ) : loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#FFF" />
                        <Text style={styles.emptyText}>Lade Produktdaten…</Text>
                    </View>
                ) : (
                    <>
                        {/* Promille-Rechner */}
                        <Text style={styles.title}>🔢 Promille-Rechner</Text>
                        <TextInput
                            placeholder="Gewicht in kg"
                            keyboardType="numeric"
                            style={styles.input}
                            placeholderTextColor="#400A6D"
                            value={weight}
                            onChangeText={setWeight}
                        />
                        <TextInput
                            placeholder="Menge in ml"
                            keyboardType="numeric"
                            style={styles.input}
                            placeholderTextColor="#400A6D"
                            value={amountML}
                            onChangeText={setAmountML}
                        />

                        <View style={styles.genderButtonsContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.genderButton,
                                    gender === 'm' ? styles.genderButtonActive : styles.genderButtonInactive,
                                ]}
                                onPress={() => setGender('m')}
                            >
                                <Text
                                    style={[
                                        styles.genderButtonText,
                                        gender === 'm'
                                            ? styles.genderButtonTextActive
                                            : styles.genderButtonTextInactive,
                                    ]}
                                >
                                    Männlich
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.genderButton,
                                    gender === 'f' ? styles.genderButtonActive : styles.genderButtonInactive,
                                ]}
                                onPress={() => setGender('f')}
                            >
                                <Text
                                    style={[
                                        styles.genderButtonText,
                                        gender === 'f'
                                            ? styles.genderButtonTextActive
                                            : styles.genderButtonTextInactive,
                                    ]}
                                >
                                    Weiblich
                                </Text>
                            </TouchableOpacity>
                        </View>


                        <Button
                            title="Promille berechnen"
                            onPress={calculatePromille}
                            color="#CFA8FF"
                        />

                        {promille && (
                            <Text style={styles.emptyText}>
                                🍻 Geschätzte Promille: {promille}‰
                            </Text>
                        )}

                        {/* Nur das eine Produkt */}
                        {product && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{product.product_name}</Text>
                                <Text style={styles.cardText}>Marke: {product.brands}</Text>
                                <Text style={styles.cardText}>Alkohol: {alc}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.scanButton}
                            onPress={() => {
                                setCode(null)
                                setProduct(null)
                                setPromille(null)
                                setScanning(true)
                                setScanned(false)
                            }}
                        >
                            <Text style={styles.scanButtonText}>NOCHMAL SCANNEN</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#400A6D' },
    header: { width: '100%', height: 200 },
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
        margin: 20,
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 10,
        marginHorizontal: 20,
        marginBottom: 20,
        color: '#400A6D',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        backgroundColor: '#CFA8FF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        margin: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: '#FFF',
        margin: 20,
        fontWeight: '500'
    },
    scanButton: {
        backgroundColor: '#CFA8FF',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 30,
        margin: 20,
    },
    scanButtonText: {
        color: '#400A6D',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 18,
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#CFA8FF',
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#400A6D',
        marginBottom: 8,
    },
    cardText: {
        fontSize: 16,
        color: '#400A6D',
    },

    genderButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginHorizontal: 20,
        marginBottom: 20,
    },

    genderButton: {
        flex: 1,
        marginHorizontal: 5,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },

    genderButtonActive: {
        backgroundColor: '#CFA8FF',
    },

    genderButtonInactive: {
        backgroundColor: '#400A6D',
    },

    genderButtonText: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: 16,
    },

    genderButtonTextActive: {
        color: '#400A6D',
    },

    genderButtonTextInactive: {
        color: '#FFF',
    },

})
