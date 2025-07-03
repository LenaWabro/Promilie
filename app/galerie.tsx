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
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { db, storage, firebaseConfig } from '../firebase_config';

type Event = { id: string; name: string; photos: string[] };

export default function PhotoStoreScreen() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [loadingEvent, setLoadingEvent] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [newEventName, setNewEventName] = useState('');

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

    const deleteEvent = (id: string) => {
        Alert.alert('Event löschen?', '', [
            { text: 'Abbrechen', style: 'cancel' },
            {
                text: 'Löschen', style: 'destructive', onPress: async () => {
                    const eventToDelete = events.find(e => e.id === id);
                    if (eventToDelete?.photos) {
                        for (const photoUrl of eventToDelete.photos) {
                            try {
                                const path = photoUrl.split('/o/')[1].split('?')[0]; // URL-dekodieren nicht vergessen!
                                const decodedPath = decodeURIComponent(path);
                                const photoRef = ref(storage, decodedPath);
                                await deleteObject(photoRef);
                            } catch (error) {
                                console.log('Fehler beim Löschen des Fotos:', error);
                            }
                        }
                    }
                    await deleteDoc(doc(db, 'events', id));
                    setEvents(prev => prev.filter(e => e.id !== id));
                    if (selectedEventId === id) setSelectedEventId(null);
                }
            }
        ]);
    };

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

            // Dateiname aus URI extrahieren oder Fallback erzeugen
            const uriParts = uri.split('/');
            const rawName = uriParts[uriParts.length - 1] || `image_${Date.now()}`;
            const cleanName = rawName.split('?')[0]; // Entfernt Query-Parameter
            const storageRef = ref(storage, `${selectedEventId}/${cleanName}`);

           console.log("URI:", uri);
            console.log("Blob:", blob);
            console.log("Pfad:", `${cleanName}`);

            try {
                await uploadBytes(storageRef, blob);
                const downloadURL = await getDownloadURL(storageRef);
                await updateDoc(doc(db, 'events', selectedEventId), {
                    photos: arrayUnion(downloadURL)
                });
                //return downloadURL;

            } catch (error: any) {
                console.error("Upload-Fehler:", error);
                console.log("Code:", error.code);
                console.log("Message:", error.message);
                console.log("Full Error Object:", JSON.stringify(error));
                throw error;
            }





            Alert.alert('Erfolg!', 'Foto wurde hochgeladen');
        } catch (error) {
            console.error('Upload-Fehler:', error);
            Alert.alert('Fehler', `Foto konnte nicht hochgeladen werden: ${error.message}`);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const onPhotoPress = (url: string) => {
        Alert.alert('Was möchtest du tun?', '', [
            { text: 'Teilen', onPress: () => Share.share({ url }).catch(console.error) },
            { text: 'In Galerie speichern', onPress: () => saveImageToGallery(url) },
            { text: 'Löschen', style: 'destructive', onPress: () => deletePhoto(url) },
            { text: 'Abbrechen', style: 'cancel' },
        ]);
    };

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

    const deletePhoto = async (url: string) => {
        if (!selectedEventId) return;
        try {
            await updateDoc(doc(db, 'events', selectedEventId), {
                photos: arrayRemove(url)
            });

            // Pfad aus URL extrahieren:
            const path = url.split('/o/')[1].split('?')[0];
            const decodedPath = decodeURIComponent(path);

            const photoRef = ref(storage, decodedPath);
            await deleteObject(photoRef);
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            Alert.alert('Fehler', 'Foto konnte nicht gelöscht werden');
        }
    };

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
            {uploadingPhoto && (
                <View style={styles.uploadingContainer}>
                    <ActivityIndicator color="#FFF" />
                    <Text style={styles.uploadingText}>Foto wird hochgeladen...</Text>
                </View>
            )}
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
        </View>
    );
}

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
});
