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
import { db } from '../firebase_config';

type Event = { id: string; name: string; photos: string[] };

export default function PhotoStoreScreen() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);

    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [loadingEvent, setLoadingEvent] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [newEventName, setNewEventName] = useState('');

    // 1) Alle Events laden
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

    // 2) Echtzeit-Listener fürs selektierte Event
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
        return () => unsub();
    }, [selectedEventId]);

    // 3) Neues Event anlegen
    const createEvent = async () => {
        const name = newEventName.trim();
        if (!name) return;
        const id = Date.now().toString();
        await setDoc(doc(db, 'events', id), { id, name, photos: [] });
        setEvents(prev => [...prev, { id, name, photos: [] }]);
        setNewEventName('');
        setModalVisible(false);
        setSelectedEventId(id);
    };

    // 4) Event löschen
    const deleteEvent = (id: string) => {
        Alert.alert('Event löschen?', '', [
            { text: 'Abbrechen', style: 'cancel' },
            {
                text: 'Löschen', style: 'destructive', onPress: async () => {
                    await deleteDoc(doc(db, 'events', id));
                    setEvents(prev => prev.filter(e => e.id !== id));
                    if (selectedEventId === id) setSelectedEventId(null);
                }
            }
        ]);
    };

    // 5) Foto aufnehmen/auswählen & speichern
    const pickAndSaveImage = async (useCamera: boolean) => {
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

        // Base64 lesen
        const uri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
        });
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        // In Firestore ans Event anhängen
        await updateDoc(doc(db, 'events', selectedEventId), {
            photos: arrayUnion(dataUrl)
        });
        // Anzeige aktualisiert sich automatisch via onSnapshot
    };

    // 6) Foto teilen, löschen oder speichern
    const onPhotoPress = (uri: string) => {
        Alert.alert('Was möchtest du tun?', '', [
            { text: 'Teilen', onPress: () => Share.share({ url: uri }).catch(console.error) },
            { text: 'In Galerie speichern', onPress: () => saveImageToGallery(uri) },
            { text: 'Löschen', style: 'destructive', onPress: () => deletePhoto(uri) },
            { text: 'Abbrechen', style: 'cancel' },
        ]);
    };

    // Speichere Bild in der Galerie
    const saveImageToGallery = async (dataUrl: string) => {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Zugriff verweigert');
            return;
        }

        try {
            // 1. Base64-Daten aus der DataURL extrahieren
            const base64Data = dataUrl.split(',')[1]; // "data:image/jpeg;base64,..." -> nur der Base64-Teil

            // 2. Temporären Dateipfad erstellen
            const fileUri = `${FileSystem.cacheDirectory}${Date.now()}.jpg`;

            // 3. Datei schreiben
            await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });

            // 4. Datei in Galerie speichern
            await MediaLibrary.saveToLibraryAsync(fileUri);

            Alert.alert('Gespeichert ✅', 'Das Bild wurde in deine Galerie gespeichert.');
        } catch (e) {
            console.error(e);
            Alert.alert('Fehler beim Speichern');
        }
    };


    // Foto aus Firestore-Array entfernen
    const deletePhoto = async (uri: string) => {
        if (!selectedEventId) return;
        await updateDoc(doc(db, 'events', selectedEventId), {
            photos: arrayRemove(uri)
        });
        // Ansicht aktualisiert sich automatisch über onSnapshot
    };

    // 7) Liste anzeigen, wenn kein Event gewählt
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

    // 8) Detail-Ansicht
    if (loadingEvent || !currentEvent) {
        return <ActivityIndicator color="#FFF" style={styles.container} />;
    }

    return (
        <View style={styles.container}>
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
            <TouchableOpacity
                style={styles.fab}
                onPress={() =>
                    Alert.alert('Foto hinzufügen', 'Quelle wählen', [
                        { text: 'Kamera', onPress: () => pickAndSaveImage(true) },
                        { text: 'Galerie', onPress: () => pickAndSaveImage(false) },
                        { text: 'Abbrechen', style: 'cancel' },
                    ])
                }
            >
                <Ionicons name="add-circle" size={56} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: '#400A6D' },
    header:          { width: '100%', height: 200 },
    headerOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    headerTitle:     { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
    title:           { fontSize: 22, fontWeight: 'bold', margin: 20, color: '#FFF' },
    eventBar:        { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#CFA8FF', margin: 12, padding: 12, borderRadius: 8 },
    eventText:       { fontSize: 18, color: '#400A6D', fontWeight: 'bold' },
    emptyText:       { textAlign: 'center', color: '#FFF', margin: 20 },
    fab:             { position: 'absolute', bottom: 30, right: 20 },
    input:           { backgroundColor: '#FFF', borderRadius: 8, padding: 10, margin: 12 },
    modalBackdrop:   { flex: 1, backgroundColor: 'rgba(69,0,105,0.8)', justifyContent: 'center' },
    modalContent:    { backgroundColor: '#CFA8FF', margin: 24, padding: 24, borderRadius: 12 },
    modalTitle:      { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    modalButtons:    { flexDirection: 'row', justifyContent: 'space-between' },
    detailHeaderRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    detailTitle:     { fontSize: 20, color: '#FFF', marginLeft: 12 },
    image:           { width: 160, height: 160, margin: 4, borderRadius: 8 },
});
