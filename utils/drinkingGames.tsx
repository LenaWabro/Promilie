import { DrinkingGame } from "./types";

export const drinkingGames: DrinkingGame[] = [
    {
        name: "Ich hab noch nie",
        description: "Jede Person sagt etwas, das sie noch nie gemacht hat. Wer es gemacht hat, trinkt.",
        minPlayers: 3,
        difficulty: "easy",
        alcoholLevel: "low",
    },
    {
        name: "Kings Cup",
        description: "Ein Kartenspiel mit Regeln für jede gezogene Karte. 2 = Du, 3 = Ich, 4 = Boden usw.",
        minPlayers: 3,
        difficulty: "medium",
        alcoholLevel: "high",
    },
    {
        name: "Wasserfall",
        description: "Alle trinken gleichzeitig. Du darfst erst aufhören, wenn die Person links aufhört.",
        minPlayers: 4,
        difficulty: "medium",
        alcoholLevel: "high",
    },
];
