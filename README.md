# 🎉 Sportsfreunde Promilla

[![Expo SDK](https://img.shields.io/badge/Expo-SDK_49.0.0-blue?logo=expo&logoColor=white)](https://docs.expo.dev/) [![React Native](https://img.shields.io/badge/React%20Native-0.72.0-blue?logo=react&logoColor=white)](https://reactnative.dev/)

**Eine mobile All-in-One-Party-App für unvergessliche Events!**  
Speichere Party-Fotos, scanne Getränke, berechne Promille und lasse dir mit dem Glücksrad Trinkspiele vorschlagen – für garantiert keine langweilige Party mehr!

---

## Features

- 📸 **Galerie:** Speichere und teile Party-Fotos in Alben
- 🍺 **Promille-Rechner:** Berechne deinen ungefähren Blutalkoholwert durch das Scannen deiner Getränke
- 🎡 **Glücksrad**: Zufällige Trinkspiele für die Party

---

## Verwendung / How-to

| Aktion | Schritte                                                                     |
|-------|------------------------------------------------------------------------------|
| **Foto hinzufügen** | Galerie → 「＋」→ Event erstellen → 「＋」→ Foto wählen oder aufnehmen → Speichern |
| **Getränk erfassen** | Scanner → Barcode über Getränk halten → Drink erscheint in Liste             |
| **Promille berechnen** | Promille-Rechner → Drinks auswählen → Geschlecht & Gewicht eingeben → 「Berechnen |
| **Glücksrad spielen** | Glücksrad → 「Drehen」 → Trinkspiel erscheint → „Los geht’s!“                  |


---

## 🔧 Installation & Setup
1. **Voraussetzungen**
    - [Node.js](https://nodejs.org/) ≥ 16
    - Git

2. **Expo CLI installieren**
   ```bash
   npm install -g expo-cli

3. **Projekt klonen**
    ```bash
    git clone https://github.com/LenaWabro/Promilie.git
    cd Promilie
   
4. **Abhängigkeiten installieren**
   ```bash
    npm install
   ````

     4.1 Expo-Plugins installieren
      
      ```bash
         npx expo install expo-image-picker
         npx expo install expo-file-system
         npx expo install expo-media-library
         npx expo install @expo/vector-icons
      ```
   4.2 Firebase

      ```bash
         npm install firebase
      ```
   4.3 Styling & Layout

      ```bash
       npm install @react-native-seoul/masonry-list
       npm install react-native-svg
       npm install react-native-reanimated
      ```


5. Entwicklungsserver starten
   ```bash
    npx expo start
   
6. Scanne danach den QR Code im Terminal oder öffne es über die Expo Go App auf deinem Smartphone. 

## 🔧 Konfiguration & Firebase-Setup

> **Wichtig:** Teile deine Schlüssel **niemals** öffentlich!

### Firebase-Projekt anlegen
1. Gehe zu **[console.firebase.google.com](https://console.firebase.google.com/)** und klicke **„Projekt hinzufügen“**.
2. Projektname wählen → Analytics kann deaktiviert bleiben → Projekt erstellen.

### Web-App registrieren
1. Im linken Menü **„App hinzufügen“ → Web-Symbol (</>)** wählen.
2. Beliebigen **App-Namen** vergeben → **Firebase Hosting** kann übersprungen werden.
3. Unter **„SDK-Konfiguration“** erhältst du deine Keys (apiKey, authDomain, …).

### Firestore & Storage aktivieren
| Dienst | Schritte |
|--------|----------|
| **Firestore** | • Menü **„Firestore Database“** → **„Datenbank erstellen“**<br>• „Start im Testmodus“ (nur Entwicklung) → Region wählen |
| **Storage (Bilder)** | • Menü **„Storage“** → **„Erste Schritte“**<br>• Region wählen → Standard-Sicherheitsregeln übernehmen |


###  Sicherheitsregeln
<code>


      // Storage – testweise ALLES erlauben (gültig bis 31. 12. 2025)
      rules_version = '2';
      service firebase.storage {
        match /b/{bucket}/o {
          match /{allPaths=**} {
            allow read, write: if request.time < timestamp.date(2025, 12, 31);
          }
        }
      }

      Firestore – testweise ALLES erlauben (gültig bis 31. 12. 2025)
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /{document=**} {
            allow read, write: if request.time < timestamp.date(2025, 12, 31);
          }
        }
      }
</code>


---

## Technologien

- **Framework:** React Native & Expo
- **Backend:** Firebase Firestore & Storage
- **Scanner:** Expo Camera mit integriertem Barcode Scanner

---

## FAQ


| Frage | Antwort                                                                                                                                                                                                                                     |
|-------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **QR-Code wird nicht gefunden?** | 1. Stelle sicher, dass **PC und Smartphone im selben WLAN** sind.<br> 2. Alternativ den QR-Code direkt in der **Expo Go App** über **„Enter URL manually“** eingeben.                                                                       |
| **Expo Go zeigt „App crashed“?** | 1. Metro-Cache leeren: `expo start -c`.<br>2. In der Expo-Go-App **dreifach aufs Display tippen → „Reload“**.<br>3. Prüfe, ob du kürzlich native Module hinzugefügt hast, die einen **neu-build** benötigen.                          |
| **„Could not connect to development server“?** | 1. Metro läuft? (`expo start` muss im Terminal aktiv sein).<br>2. Gleiches Netzwerk & keine VPN-Blocker | |
| **Firebase „permission-denied“ Fehler?** | 1. Prüfe deine **Firestore Rules** (`allow read, write: if true;` nur zu Testzwecken!).<br>2. In `firebase_config.ts` wirklich das **richtige Projekt**?                                                                            |

---

## Disclaimer

Der Promille-Rechner liefert nur Schätzwerte. Alkohol am Steuer ist lebensgefährlich – bitte nie unter Alkoholeinfluss ein Fahrzeug führen!
 
---

## Entwicklerinnen

- Cathrin Gradinger 
- Sonja Schwarz 
- Lena Wabro


