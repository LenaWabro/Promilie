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
    Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import MasonryList from '@react-native-seoul/masonry-list';

const PHOTO_DIR = FileSystem.documentDirectory + 'photos/';
const STORAGE_KEY = 'PHOTO_EVENTS';

type Event = {
    id: string;
    name: string;
    photos: string[];
};

export default function PhotoStoreScreen() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [newEventName, setNewEventName] = useState('');

    // 1) Setup: Foto-Ordner + gespeicherte Events laden
    useEffect(() => {
        (async () => {
            console.log('🚀 App start: lade Events aus AsyncStorage');
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

    // 2) Persistiere Events in AsyncStorage
    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }, [events]);

    // 3) Neues Event anlegen
    const createEvent = () => {
        const name = newEventName.trim();
        if (!name) return;
        const id = Date.now().toString();
        setEvents(prev => [...prev, { id, name, photos: [] }]);
        setNewEventName('');
        setModalVisible(false);
        setSelectedEventId(id);
    };

    // 4) Event löschen (inkl. Fotos im FS)
    const deleteEvent = (id: string) => {
        Alert.alert(
            'Event löschen?',
            'Alle zugehörigen Fotos werden ebenfalls entfernt.',
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Löschen',
                    style: 'destructive',
                    onPress: async () => {
                        await FileSystem.deleteAsync(PHOTO_DIR + id, { idempotent: true });
                        setEvents(prev => prev.filter(e => e.id !== id));
                        if (selectedEventId === id) setSelectedEventId(null);
                    },
                },
            ]
        );
    };

    // 5) Bild aufnehmen oder aus Galerie holen
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
                allowsEditing: false,
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

        setEvents(prev =>
            prev.map(e =>
                e.id === selectedEventId
                    ? { ...e, photos: [...e.photos, destUri] }
                    : e
            )
        );
    };

    // 6) Dialog „Kamera oder Galerie?“
    const addPhoto = () => {
        Alert.alert('Foto hinzufügen', 'Quelle wählen:', [
            { text: 'Abbrechen', style: 'cancel' },
            { text: 'Kamera', onPress: () => pickImage(true) },
            { text: 'Galerie', onPress: () => pickImage(false) },
        ]);
    };

    // 7) Foto‐Aktionen
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
                    setEvents(prev =>
                        prev.map(e =>
                            e.id === selectedEventId
                                ? { ...e, photos: e.photos.filter(p => p !== uri) }
                                : e
                        )
                    );
                },
            },
            { text: 'Abbrechen', style: 'cancel' },
        ]);
    };

    // 8) Event‐Übersicht
    if (!selectedEventId) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>🎉 Deine Feiern</Text>
                <FlatList
                    data={events}
                    keyExtractor={e => e.id}
                    renderItem={({ item }) => (
                        <View style={styles.eventBar}>
                            <TouchableOpacity
                                style={styles.eventNameContainer}
                                onPress={() => setSelectedEventId(item.id)}
                            >
                                <Text style={styles.eventText}>{item.name}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteEvent(item.id)}>
                                <Ionicons name="trash-outline" size={24} color="#900" />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Noch keine Feiern.</Text>
                    }
                />

                {/* Rundes grünes Plus-Icon */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="add-circle" size={56} color="#4CAF50" />
                </TouchableOpacity>

                <Modal transparent visible={modalVisible} animationType="slide">
                    <View style={styles.modalBackdrop}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Neue Feier</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Name der Feier"
                                value={newEventName}
                                onChangeText={setNewEventName}
                            />
                            <View style={styles.modalButtons}>
                                <Button
                                    title="Abbrechen"
                                    onPress={() => setModalVisible(false)}
                                />
                                <Button title="Erstellen" onPress={createEvent} />
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    // 9) Event‐Detail
    const ev = events.find(e => e.id === selectedEventId)!;
    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setSelectedEventId(null)}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>{ev.name}</Text>
            </View>
            {ev.photos.length === 0 ? (
                <Text style={styles.emptyText}>Noch keine Fotos.</Text>
            ) : (
                <MasonryList
                    data={ev.photos.map(uri => ({ uri }))}
                    keyExtractor={it => it.uri}
                    numColumns={2}
                    showsVerticalScrollIndicator={false}
                    style={styles.masonry}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => onPhotoPress(item.uri)}
                        >
                            <Image source={{ uri: item.uri }} style={styles.image} />
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Rotes Plus-Icon im Event-Detail */}
            <TouchableOpacity style={styles.fab} onPress={addPhoto}>
                <Ionicons name="add-circle" size={56} color="#FF6F61" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container:           { flex: 1, padding: 20, backgroundColor: '#fff' },
    title:               { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
    eventBar:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: 15, marginBottom: 10, borderRadius: 8 },
    eventNameContainer:  { flex: 1 },
    eventText:           { fontSize: 18 },
    headerRow:           { flexDirection: 'row', alignItems: 'center' },
    // FAB: rund, ohne eigenen Hintergrund
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input:               { borderBottomWidth: 1, padding: 5, marginBottom: 15, width: '100%' },
    modalBackdrop:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent:        { backgroundColor: '#fff', borderRadius: 8, padding: 20 },
    modalTitle:          { fontSize: 18, marginBottom: 10 },
    modalButtons:        { flexDirection: 'row', justifyContent: 'space-between' },
    emptyText:           { textAlign: 'center', marginTop: 20, color: '#888' },
    masonry:             { flex: 1, marginTop: 10 },
    item:                { margin: 6, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f0f0', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
    image:               { width: '100%', aspectRatio: 1 },
});
