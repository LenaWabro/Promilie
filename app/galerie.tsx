import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Alert,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Image,
    Modal,
    Button,
    Share,
    ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import MasonryList from '@react-native-seoul/masonry-list';

const PHOTO_DIR = FileSystem.documentDirectory + 'photos/';
const STORAGE_KEY = 'PHOTO_EVENTS';

type Event = { id: string; name: string; photos: string[]; };

export default function PhotoStoreScreen() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [newEventName, setNewEventName] = useState('');

    // Load events + ensure photo directory
    useEffect(() => {
        (async () => {
            const info = await FileSystem.getInfoAsync(PHOTO_DIR);
            if (!info.exists) {
                await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
            }
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                const list: Event[] = JSON.parse(stored);
                setEvents(list);
                if (list.length) setSelectedEventId(list[0].id);
            }
        })();
    }, []);

    // Persist events
    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }, [events]);

    // Create new event
    const createEvent = () => {
        const name = newEventName.trim();
        if (!name) return;
        const id = Date.now().toString();
        setEvents((prev) => [...prev, { id, name, photos: [] }]);
        setNewEventName('');
        setModalVisible(false);
        setSelectedEventId(id);
    };

    // Delete event + its folder
    const deleteEvent = (id: string) => {
        Alert.alert('Event löschen?', 'Alle zugehörigen Fotos werden ebenfalls entfernt.', [
            { text: 'Abbrechen', style: 'cancel' },
            {
                text: 'Löschen',
                style: 'destructive',
                onPress: async () => {
                    await FileSystem.deleteAsync(PHOTO_DIR + id, { idempotent: true });
                    setEvents((prev) => prev.filter((e) => e.id !== id));
                    if (selectedEventId === id) setSelectedEventId(null);
                },
            },
        ]);
    };

    // Pick or take a photo
    const pickImage = async (fromCamera: boolean) => {
        if (!selectedEventId) {
            Alert.alert('Kein Event ausgewählt', 'Lege zuerst ein Event an.');
            return;
        }
        const perm = fromCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
            Alert.alert('Zugriff verweigert');
            return;
        }
        const result = fromCamera
            ? await ImagePicker.launchCameraAsync({ quality: 1 })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            });
        if (result.canceled) return;

        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop();
        const filename = `${Date.now()}.${ext}`;
        const dir = PHOTO_DIR + selectedEventId + '/';
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
        const destUri = dir + filename;
        await FileSystem.copyAsync({ from: asset.uri, to: destUri });

        setEvents((prev) =>
            prev.map((e) =>
                e.id === selectedEventId ? { ...e, photos: [...e.photos, destUri] } : e
            )
        );
    };

    // Show native source picker
    const addPhoto = () => {
        Alert.alert('Foto hinzufügen', 'Quelle wählen:', [
            { text: 'Abbrechen', style: 'cancel' },
            { text: 'Kamera', onPress: () => pickImage(true) },
            { text: 'Galerie', onPress: () => pickImage(false) },
        ]);
    };

    // Photo action sheet
    const onPhotoPress = (uri: string) => {
        Alert.alert('Aktion wählen', '', [
            { text: 'Teilen', onPress: () => Share.share({ url: uri }) },
            {
                text: 'Speichern',
                onPress: async () => {
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert('Kein Zugriff auf Fotos');
                        return;
                    }
                    const asset = await MediaLibrary.createAssetAsync(uri);
                    await MediaLibrary.createAlbumAsync('Promilie', asset, false);
                    Alert.alert('Gespeichert in Galerie');
                },
            },
            {
                text: 'Löschen',
                style: 'destructive',
                onPress: async () => {
                    await FileSystem.deleteAsync(uri);
                    setEvents((prev) =>
                        prev.map((e) =>
                            e.id === selectedEventId
                                ? { ...e, photos: e.photos.filter((p) => p !== uri) }
                                : e
                        )
                    );
                },
            },
            { text: 'Abbrechen', style: 'cancel' },
        ]);
    };

    // ––––––––––– LIST VIEW –––––––––––
    if (!selectedEventId) {
        return (
            <View style={styles.container}>
                {/* siempre header */}
                <ImageBackground
                    source={require('../img/party.jpg')}
                    style={styles.header}
                >
                    <View style={styles.headerOverlay}>
                        <Text style={styles.headerTitle}>GALERIE</Text>
                    </View>
                </ImageBackground>

                <Text style={styles.title}>DEINE PARTYS</Text>
                <FlatList
                    data={events}
                    keyExtractor={(e) => e.id}
                    renderItem={({ item }) => (
                        <View style={styles.eventBar}>
                            <TouchableOpacity
                                style={styles.eventNameContainer}
                                onPress={() => setSelectedEventId(item.id)}
                            >
                                <Text style={styles.eventText}>{item.name}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteEvent(item.id)}>
                                <Ionicons name="trash-outline" size={24} style={styles.trashIcon} />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>Noch keine Feiern.</Text>}
                />

                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add-circle" size={56} color="#FFFFFF" />
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
                                <Button title="Abbrechen" color="#400A6D" onPress={() => setModalVisible(false)} />
                                <Button title="Erstellen" color="#400A6D" onPress={createEvent} />
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // ––––––––––– DETAIL VIEW –––––––––––
    const ev = events.find((e) => e.id === selectedEventId)!;
    return (
        <View style={styles.container}>
            {/* siempre header */}
            <ImageBackground
                source={require('../img/party.jpg')}
                style={styles.header}
            >
                <View style={styles.headerOverlay}>
                    <Text style={styles.headerTitle}>GALERIE</Text>
                </View>
            </ImageBackground>

            {/* Unter Header: Back + Eventname */}
            <View style={styles.detailHeaderRow}>
                <TouchableOpacity onPress={() => setSelectedEventId(null)}>
                    <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{ev.name}</Text>
            </View>

            {ev.photos.length === 0 ? (
                <Text style={styles.emptyText}>Noch keine Fotos.</Text>
            ) : (
                <MasonryList
                    data={ev.photos.map((uri) => ({ uri }))}
                    keyExtractor={(it) => it.uri}
                    numColumns={2}
                    showsVerticalScrollIndicator={false}
                    style={styles.masonry}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.item} onPress={() => onPhotoPress(item.uri)}>
                            <Image source={{ uri: item.uri }} style={styles.image} />
                        </TouchableOpacity>
                    )}
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={addPhoto}>
                <Ionicons name="add-circle" size={56} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: '#400A6D' },
    header:          { width: '100%', height: 200 },
    headerOverlay:   {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle:     { fontSize: 28, fontWeight: 'bold', color: '#FFF', textTransform: 'uppercase', letterSpacing: 1 },
    title:           { fontSize: 22, fontWeight: 'bold', margin: 20, color: '#FFF', textTransform: 'uppercase', letterSpacing: 1 },
    eventBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#CFA8FF', marginHorizontal: 20, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 12, borderRadius: 12 },
    eventNameContainer:{ flex: 1 },
    eventText:       { fontSize: 18, color: '#400A6D', fontWeight: 'bold', textTransform: 'uppercase' },
    trashIcon:       { color: '#400A6D' },
    detailHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 },
    detailTitle:     { fontSize: 20, fontWeight: '600', color: '#FFF', marginLeft: 12 },
    fab:             { position: 'absolute', bottom: 30, right: 20 },
    input:           { backgroundColor: '#FFF', borderRadius: 8, padding: 10, marginHorizontal: 20, marginBottom: 20, color: '#400A6D' },
    modalBackdrop:   { flex: 1, backgroundColor: 'rgba(69,0,105,0.8)', justifyContent: 'center', padding: 20 },
    modalContent:    { backgroundColor: '#CFA8FF', borderRadius: 12, padding: 24 },
    modalTitle:      { fontSize: 20, fontWeight: 'bold', color: '#400A6D', marginBottom: 16, textAlign: 'center', textTransform: 'uppercase' },
    modalButtons:    { flexDirection: 'row', justifyContent: 'space-between' },
    emptyText:       { textAlign: 'center', color: '#FFF', margin: 20, fontWeight: '500' },
    masonry:         { flex: 1, padding: 12 },
    item:            { margin: 6, borderRadius: 8, overflow: 'hidden', backgroundColor: '#DDD' },
    image:           { width: '100%', aspectRatio: 1 },
});
