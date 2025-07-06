// ======================================================================
// PhotoStoreScreen.tsx
// ----------------------------------------------------------------------
// Diese React Native Komponente implementiert eine Event-basierte Galerie.
// Nutzer können Events erstellen, Fotos hochladen, anzeigen, teilen,
// speichern oder löschen. Die Fotos werden in Firebase Storage gespeichert,
// die Event- und Fotodaten in Firestore verwaltet.
// ======================================================================

import React, { useState, useEffect } from 'react';
import {
    View, Text, Alert, StyleSheet, FlatList,
    TextInput, TouchableOpacity, Image, Modal,
    Button, Share, ImageBackground, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import MasonryList from '@react-native-seoul/masonry-list';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {
    collection, getDocs, doc,
    setDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc,
    onSnapshot
} from 'firebase/firestore';
import {
    ref, uploadBytes, getDownloadURL, deleteObject
} from 'firebase/storage';
import { db, storage } from '../firebase_config';

// ==========================================================
// Typdefinition für ein Event-Objekt mit ID, Name & Fotos
// ==========================================================
type Event = { id: string; name: string; photos: string[] };

// ==========================================================
// Hauptkomponente für die Foto-Event-Verwaltung
// ==========================================================
export default function PhotoStoreScreen() {
    // -------------------------------
    // States für Events & Modals
    // -------------------------------
    const [events, setEvents] = useState<Event[]>([]); // Alle Events
    const [loadingEvents, setLoadingEvents] = useState(true); // Laden-Status der Eventliste
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null); // aktuell ausgewähltes Event
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null); // Daten des aktiven Events
    const [loadingEvent, setLoadingEvent] = useState(false); // Laden-Status für ein einzelnes Event
    const [uploadingPhoto, setUploadingPhoto] = useState(false); // Foto wird hochgeladen?
    const [modalVisible, setModalVisible] = useState(false); // Modal für Event-Erstellung
    const [newEventName, setNewEventName] = useState(''); // Eingabe für neuen Eventnamen

    // -------------------------------
    // States für Bild-Modal
    // -------------------------------
    const [photoModalVisible, setPhotoModalVisible] = useState(false); // Modal für Bild-Vollansicht
    const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null); // aktuell geöffnetes Bild

    // ==========================================================
    // Effekt: Lade alle Events aus Firestore beim Start
    // ==========================================================
    useEffect(() => {
        (async () => {
            setLoadingEvents(true);
            const snap = await getDocs(collection(db, 'events'));
            const list: Event[] = [];
            snap.forEach(d => list.push(d.data() as Event));
            setEvents(list);
            setLoadingEvents(false);
        })();
    }, []);

    // ==========================================================
    // Effekt: Lade Details für ausgewähltes Event (Live-Update)
    // ==========================================================
    useEffect(() => {
        if (!selectedEventId) {
            setCurrentEvent(null);
            return;
        }
        setLoadingEvent(true);
        const unsub = onSnapshot(doc(db, 'events', selectedEventId), snap => {
            if (snap.exists()) {
                setCurrentEvent(snap.data() as Event);
            }
            setLoadingEvent(false);
        });
        return () => unsub(); // Aufräumen
    }, [selectedEventId]);

    // ==========================================================
    // Neues Event in Firestore anlegen
    // ==========================================================
    const createEvent = async () => {
        const name = newEventName.trim();
        if (!name) return;
        const id = Date.now().toString(); // ID aus Zeitstempel
        await setDoc(doc(db, 'events', id), { id, name, photos: [] });
        setEvents(prev => [...prev, { id, name, photos: [] }]);
        setNewEventName('');
        setModalVisible(false);
        setSelectedEventId(id);
    };

    // ==========================================================
    // Event samt Fotos löschen
    // ==========================================================
    const deleteEvent = (id: string) => {
        Alert.alert('Event löschen?', '', [
            { text: 'Abbrechen', style: 'cancel' },
            {
                text: 'Löschen',
                style: 'destructive',
                onPress: async () => {
                    const eventToDelete = events.find(e => e.id === id);
                    if (eventToDelete?.photos) {
                        for (const photoUrl of eventToDelete.photos) {
                            try {
                                const path = photoUrl.split('/o/')[1].split('?')[0];
                                const decodedPath = decodeURIComponent(path);
                                const photoRef = ref(storage, decodedPath);
                                await deleteObject(photoRef); // Foto aus Storage löschen
                            } catch (error) {
                                console.log('Fehler beim Löschen des Fotos:', error);
                            }
                        }
                    }
                    await deleteDoc(doc(db, 'events', id)); // Event aus Firestore löschen
                    setEvents(prev => prev.filter(e => e.id !== id));
                    if (selectedEventId === id) setSelectedEventId(null);
                }
            }
        ]);
    };

    // ==========================================================
    // Foto aufnehmen oder aus Galerie wählen und hochladen
    // useCamera = true -> Kamera
    // useCamera = false -> Galerie
    // ==========================================================
    const pickAndSaveImageExpo = async (useCamera) => {
        if (!selectedEventId) {
            Alert.alert('Kein Event ausgewählt');
            return;
        }

        const { status } = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Zugriff verweigert');
            return;
        }

        const result = useCamera
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            });

        if (result.canceled) return;
        setUploadingPhoto(true);

        try {
            const asset = result.assets[0];
            const uri = asset.uri;
            if (!uri) throw new Error("Kein Bild ausgewählt");

            const response = await fetch(uri);
            const blob = await response.blob();

            const uriParts = uri.split('/');
            const rawName = uriParts[uriParts.length - 1] || `image_${Date.now()}`;
            const cleanName = rawName.split('?')[0];
            const storageRef = ref(storage, `${selectedEventId}/${cleanName}`);

            await uploadBytes(storageRef, blob); // Foto hochladen
            const downloadURL = await getDownloadURL(storageRef);

            await updateDoc(doc(db, 'events', selectedEventId), {
                photos: arrayUnion(downloadURL)
            });

            Alert.alert('Erfolg!', 'Foto wurde hochgeladen');
        } catch (error) {
            console.error('Upload-Fehler:', error);
            Alert.alert('Fehler', `Foto konnte nicht hochgeladen werden: ${error.message}`);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // ==========================================================
    // Bild-Vollansicht öffnen
    // ==========================================================
    const onPhotoPress = (url: string) => {
        setSelectedPhotoUrl(url);
        setPhotoModalVisible(true);
    };

    // ==========================================================
    // Bild lokal speichern (Galerie)
    // ==========================================================
    const saveImageToGallery = async (url: string) => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Zugriff verweigert');
            return;
        }
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const fileUri = `${FileSystem.cacheDirectory}${Date.now()}.jpg`;

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                await FileSystem.writeAsStringAsync(fileUri, base64data, {
                    encoding: FileSystem.EncodingType.Base64
                });
                await MediaLibrary.saveToLibraryAsync(fileUri);
                Alert.alert('Gespeichert ✅', 'Das Bild wurde in deine Galerie gespeichert.');
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error(e);
            Alert.alert('Fehler beim Speichern');
        }
    };

    // ==========================================================
    // Foto aus Firestore & Storage löschen
    // ==========================================================
    const deletePhoto = async (url: string) => {
        if (!selectedEventId) return;
        try {
            await updateDoc(doc(db, 'events', selectedEventId), {
                photos: arrayRemove(url)
            });
            const path = url.split('/o/')[1].split('?')[0];
            const decodedPath = decodeURIComponent(path);
            const photoRef = ref(storage, decodedPath);
            await deleteObject(photoRef);
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            Alert.alert('Fehler', 'Foto konnte nicht gelöscht werden');
        }
    };

    // ==========================================================
    // Ansicht: keine Feier ausgewählt -> Liste anzeigen
    // ==========================================================
    if (!selectedEventId) {
        return (
            <View style={styles.container}>
                <ImageBackground source={require('../img/party.jpg')} style={styles.header}>
                    <View style={styles.headerOverlay}>
                        <Text style={styles.headerTitle}>GALERIE</Text>
                    </View>
                </ImageBackground>
                <Text style={styles.title}>DEINE PARTYS</Text>
                {loadingEvents ? (
                    <ActivityIndicator color="#FFF" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={events}
                        keyExtractor={e => e.id}
                        renderItem={({ item }) => (
                            <View style={styles.eventBar}>
                                <TouchableOpacity onPress={() => setSelectedEventId(item.id)}>
                                    <Text style={styles.eventText}>{item.name}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteEvent(item.id)}>
                                    <Ionicons name="trash-outline" size={24} color="#400A6D" />
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyText}>Keine Feiern.</Text>}
                    />
                )}
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add-circle" size={56} color="#FFF" />
                </TouchableOpacity>
                {/* Modal für neues Event */}
                <Modal transparent visible={modalVisible} animationType="slide">
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>NEUE FEIER</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Name der Feier"
                                placeholderTextColor="#400A6D"
                                value={newEventName}
                                onChangeText={setNewEventName}
                            />
                            <View style={styles.modalButtons}>
                                <Button title="Abbrechen" onPress={() => setModalVisible(false)} />
                                <Button title="Erstellen" onPress={createEvent} />
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // ==========================================================
    // Ansicht: Detailansicht für eine Feier + Fotos
    // ==========================================================
    if (loadingEvent || !currentEvent) {
        return <ActivityIndicator color="#FFF" style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <ImageBackground source={require('../img/party.jpg')} style={styles.header}>
                <View style={styles.headerOverlay}>
                    <Text style={styles.headerTitle}>GALERIE</Text>
                </View>
            </ImageBackground>
            <View style={styles.detailHeaderRow}>
                <TouchableOpacity onPress={() => setSelectedEventId(null)}>
                    <Ionicons name="arrow-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{currentEvent.name}</Text>
            </View>

            {/* Upload-Status */}
            {uploadingPhoto && (
                <View style={styles.uploadingContainer}>
                    <ActivityIndicator color="#FFF" />
                    <Text style={styles.uploadingText}>Foto wird hochgeladen...</Text>
                </View>
            )}

            {/* Foto-Liste */}
            {currentEvent.photos.length === 0 ? (
                <Text style={styles.emptyText}>Noch keine Fotos.</Text>
            ) : (
                <MasonryList
                    data={currentEvent.photos.map(uri => ({ uri }))}
                    keyExtractor={it => it.uri}
                    numColumns={2}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => onPhotoPress(item.uri)}>
                            <Image source={{ uri: item.uri }} style={styles.image} />
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Foto hinzufügen */}
            <TouchableOpacity
                style={[styles.fab, uploadingPhoto && styles.fabDisabled]}
                disabled={uploadingPhoto}
                onPress={() =>
                    Alert.alert('Foto hinzufügen', 'Quelle wählen', [
                        { text: 'Kamera', onPress: () => pickAndSaveImageExpo(true) },
                        { text: 'Galerie', onPress: () => pickAndSaveImageExpo(false) },
                        { text: 'Abbrechen', style: 'cancel' },
                    ])
                }
            >
                <Ionicons name="add-circle" size={56} color="#FFF" />
            </TouchableOpacity>

            {/* Bild-Modal */}
            <Modal
                visible={photoModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPhotoModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.imageModalContent}>
                        {selectedPhotoUrl && (
                            <Image
                                source={{ uri: selectedPhotoUrl }}
                                style={styles.fullscreenImage}
                                resizeMode="contain"
                            />
                        )}
                        <View style={styles.modalButtonRow}>
                            <Button title="Teilen" onPress={() => Share.share({ url: selectedPhotoUrl! })} />
                            <Button title="Speichern" onPress={() => saveImageToGallery(selectedPhotoUrl!)} />
                            <Button title="Löschen" color="red" onPress={() => {
                                deletePhoto(selectedPhotoUrl!);
                                setPhotoModalVisible(false);
                            }} />
                            <Button title="Schließen" onPress={() => setPhotoModalVisible(false)} />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ==========================================================
// STYLES
// ==========================================================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#400A6D' },
    header: { width: '100%', height: 200 },
    headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
    title: { fontSize: 22, fontWeight: 'bold', margin: 20, color: '#FFF' },
    eventBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#CFA8FF', margin: 12, padding: 12, borderRadius: 8 },
    eventText: { fontSize: 18, color: '#400A6D', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#FFF', margin: 20 },
    fab: { position: 'absolute', bottom: 30, right: 20 },
    fabDisabled: { opacity: 0.5 },
    input: { backgroundColor: '#FFF', borderRadius: 8, padding: 10, margin: 12 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(69,0,105,0.8)', justifyContent: 'center' },
    modalContent: { backgroundColor: '#CFA8FF', margin: 24, padding: 24, borderRadius: 12 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    detailHeaderRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    detailTitle: { fontSize: 20, color: '#FFF', marginLeft: 12 },
    image: { width: 160, height: 160, margin: 4, borderRadius: 8 },
    uploadingContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10 },
    uploadingText: { color: '#FFF', marginLeft: 10 },
    imageModalContent: { backgroundColor: '#E6CCFF', margin: 24, borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center' },
    fullscreenImage: { width: '100%', height: 500, borderRadius: 12 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, flexWrap: 'wrap' },
});
