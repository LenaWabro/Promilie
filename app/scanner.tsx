import React, { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
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
import { db } from '../firebase_config'
import {
    collection,
    addDoc,
    Timestamp,
    getDocs,
    deleteDoc,
    doc,
} from 'firebase/firestore'

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

type Drink = {
    id: string // hinzugefügt
    barcode: string
    product_name: string
    alc: number
    ml: number
    createdAt: any
}

const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>{children}</Text>
        </View>
    )
}

export default function ScannerScreen() {
    const [scanning, setScanning] = useState(false)
    const [scanned, setScanned] = useState(false)
    const scannedRef = useRef(false)

    const [loading, setLoading] = useState(false)
    const [product, setProduct] = useState<Product | null>(null)
    const [drinks, setDrinks] = useState<Drink[]>([])

    const [weight, setWeight] = useState('')
    const [gender, setGender] = useState<'m' | 'f'>('m')
    const [promille, setPromille] = useState<string | null>(null)
    const [drivingHint, setDrivingHint] = useState<string | null>(null)

    const [showCalculator, setShowCalculator] = useState(false)

    const loadDrinks = async () => {
        const snapshot = await getDocs(collection(db, 'drinks'))
        const loaded: Drink[] = []
        snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Omit<Drink, 'id'>
            loaded.push({ ...data, id: docSnap.id })
        })
        setDrinks(loaded)
    }

    useEffect(() => {
        loadDrinks()
    }, [])

    const saveDrink = async (barcode: string, name: string, alc: number) => {
        Alert.prompt(
            'Wie viel hast du davon getrunken?',
            'Bitte gib die Menge in Milliliter ein (z. B. 500)',
            async (input) => {
                const ml = parseFloat(input)
                if (isNaN(ml) || ml <= 0) {
                    Alert.alert('Ungültige Eingabe', 'Bitte gib eine gültige ml-Zahl ein.')
                    return
                }

                await addDoc(collection(db, 'drinks'), {
                    barcode,
                    product_name: name,
                    alc,
                    ml,
                    createdAt: Timestamp.now(),
                })
                console.log('✅ Getränk gespeichert mit Menge:', ml)
                await loadDrinks()
            }
        )
    }

    const deleteAllDrinks = async () => {
        const snapshot = await getDocs(collection(db, 'drinks'))
        const promises: Promise<void>[] = []
        snapshot.forEach((docSnap) => {
            promises.push(deleteDoc(doc(db, 'drinks', docSnap.id)))
        })
        await Promise.all(promises)
        console.log('🗑️ Alle Getränke gelöscht!')
        setDrinks([])
        setPromille(null)
        setDrivingHint(null)
    }

    const deleteDrink = async (id: string) => {
        await deleteDoc(doc(db, 'drinks', id))
        const updatedDrinks = drinks.filter((d) => d.id !== id)
        setDrinks(updatedDrinks)

        // Promille und Fahr-Hinweis immer zurücksetzen, wenn ein Drink gelöscht wird
        setPromille(null)
        setDrivingHint(null)
    }

    const fetchProduct = async (barcode: string) => {
        setLoading(true)
        try {
            const res = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
            )
            const json = await res.json()

            if (json.status === 1) {
                const raw = json.product as Product
                setProduct(raw)

                const alc = raw.alc_percent
                    ? parseFloat(raw.alc_percent)
                    : raw.nutriments?.alcohol ??
                    raw.nutriments?.alcohol_100g ??
                    0

                if (alc > 0) {
                    await saveDrink(barcode, raw.product_name, alc)
                } else {
                    Alert.alert('Kein Alkoholwert', 'Kein Alkoholgehalt gefunden.')
                }
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
        if (scannedRef.current) return
        scannedRef.current = true
        setScanned(true)
        console.log('📸 Scan:', barcode)
        setScanning(false)
        fetchProduct(barcode)
    }

    const calculatePromille = () => {
        if (!weight) {
            Alert.alert('Fehler', 'Bitte Gewicht eingeben.')
            return
        }

        const userWeight = parseFloat(weight)
        if (isNaN(userWeight) || userWeight <= 0) {
            Alert.alert('Fehler', 'Ungültiges Gewicht.')
            return
        }

        const r = gender === 'm' ? 0.68 : 0.55

        const totalGrammAlk = drinks.reduce((sum, drink) => {
            const gramm = drink.ml * (drink.alc / 100) * 0.8
            return sum + gramm
        }, 0)

        const promilleWert = totalGrammAlk / (userWeight * r)
        const roundedPromille = parseFloat(promilleWert.toFixed(2))
        setPromille(roundedPromille.toFixed(2))
        setShowCalculator(false)

        const hoursToSober = (roundedPromille - 0.5) / 0.1
        if (roundedPromille <= 0.5) {
            setDrivingHint('✅ Du darfst noch Auto fahren.')
        } else if (roundedPromille > 1.2) {
            setDrivingHint('❌ Heute solltest du auf keinen Fall mehr Auto fahren.')
        } else {
            const roundedHours = Math.ceil(hoursToSober)
            setDrivingHint(`⚠️ Frühestens in ca. ${roundedHours} Stunden darfst du wieder fahren.`)
        }
    }

    const resetScanner = () => {
        scannedRef.current = false
        setScanned(false)
        setScanning(true)
        setProduct(null)
        setPromille(null)
        setDrivingHint(null)
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {scanning && (
                <View style={styles.cameraContainer}>
                    <BarcodeScanner onScanned={handleScanned} />
                </View>
            )}

            {!scanning && (
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <ImageBackground
                        source={require('../img/Scenner.jpeg')}
                        style={styles.header}
                    >
                        <View style={styles.headerOverlay}>
                            <Text style={styles.headerTitle}>SCANNER</Text>
                        </View>
                    </ImageBackground>

                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={resetScanner}
                    >
                        <Text style={styles.scanButtonText}>PRODUKT SCANNEN</Text>
                    </TouchableOpacity>

                    {loading && (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text style={styles.emptyText}>Lade Produktdaten…</Text>
                        </View>
                    )}

                    {!showCalculator && (
                        <TouchableOpacity
                            style={styles.scanButton}
                            onPress={() => setShowCalculator(true)}
                        >
                            <Text style={styles.scanButtonText}>PROMILLE BERECHNEN</Text>
                        </TouchableOpacity>
                    )}

                    {showCalculator && (
                        <>
                            <Text style={styles.title}>🔢 Promille-Rechner</Text>

                            <TextInput
                                placeholder="Gewicht in kg"
                                keyboardType="numeric"
                                style={styles.input}
                                placeholderTextColor="#400A6D"
                                value={weight}
                                onChangeText={setWeight}
                            />

                            <View style={styles.genderButtonsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.genderButton,
                                        gender === 'm'
                                            ? styles.genderButtonActive
                                            : styles.genderButtonInactive,
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
                                        gender === 'f'
                                            ? styles.genderButtonActive
                                            : styles.genderButtonInactive,
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

                            <TouchableOpacity
                                style={styles.scanButton}
                                onPress={calculatePromille}
                            >
                                <Text style={styles.scanButtonText}>Jetzt berechnen</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {promille && (
                        <>
                            <Text style={styles.title}>
                                Geschätzte Promille: {promille}‰
                            </Text>
                            {drivingHint && <InfoBox>{drivingHint}</InfoBox>}
                        </>
                    )}

                    {drinks.length > 0 && (
                        <>
                            <Text style={styles.title}>Gespeicherte Getränke:</Text>
                            {drinks.map((d) => (
                                <View key={d.id} style={styles.card}>
                                    <Text style={styles.cardTitle}>{d.product_name}</Text>
                                    <Text style={styles.cardText}>Barcode: {d.barcode}</Text>
                                    <Text style={styles.cardText}>Alkohol: {d.alc}%</Text>
                                    <Text style={styles.cardText}>Menge: {d.ml} ml</Text>
                                    <TouchableOpacity
                                        onPress={() => deleteDrink(d.id)}
                                        style={{
                                            marginTop: 10,
                                            backgroundColor: '#400A6D',
                                            padding: 10,
                                            borderRadius: 8,
                                        }}
                                    >
                                        <Text style={{ color: '#FFF', textAlign: 'center' }}>
                                            🗑️ Löschen
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <TouchableOpacity
                                style={styles.scanButton}
                                onPress={deleteAllDrinks}
                            >
                                <Text style={styles.scanButtonText}>Party für heute beenden</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            )}
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#400A6D' },
    cameraContainer: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
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
    title: {
        fontSize: 20,
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
    emptyText: {
        textAlign: 'center',
        color: '#FFF',
        margin: 20,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 8,
    },
    cardText: {
        fontSize: 16,
        color: 'black',
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
    infoBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // sehr dezenter heller Hintergrund
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(207, 168, 255, 0.4)', // zarter lila Rand
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoBoxText: {
        color: '#CFA8FF', // helles Lila
        fontWeight: '500',
        fontSize: 16,
        textAlign: 'center',
    },
})
