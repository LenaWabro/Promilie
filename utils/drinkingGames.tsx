import { DrinkingGame } from "./types";

export const drinkingGames: DrinkingGame[] = [
    {
        name: "Ich war noch nie",
        description:
            "Reihum nennt jede Person eine Sache, die sie noch nie gemacht hat, zum Beispiel „Ich war noch nie Fallschirmspringen“. " +
            "Alle, die diese Sache schon gemacht haben, müssen einen Schluck trinken. " +
            "Das Spiel bringt die Gruppe schnell ins Gespräch, fördert lustige Überraschungen und eignet sich perfekt als Eisbrecher.",
        minPlayers: 3,
        difficulty: "easy",
        alcoholLevel: "low",
    },
    {
        name: "Kings Cup",
        description:
            "Kings Cup ist ein Kartenspiel, bei dem jede gezogene Karte eine bestimmte Aktion auslöst. " +
            "Die Karten werden um einen großen Becher in der Mitte ausgelegt. Reihum zieht jeder eine Karte und führt die dazugehörige Regel aus, z.B.: " +
            "2 = Du darfst jemanden bestimmen, der trinken muss; " +
            "3 = Du trinkst selbst; " +
            "4 = Alle zeigen auf den Boden, der letzte trinkt; usw. " +
            "Wer die letzte Königskarte zieht, muss den Becher in der Mitte austrinken. Das Spiel sorgt für viel Spaß, Überraschungen und Interaktion.",
        minPlayers: 3,
        difficulty: "medium",
        alcoholLevel: "high",
    },
    {
        name: "Wasserfall",
        description:
            "Alle Spieler sitzen im Kreis und starten gleichzeitig zu trinken, sobald das Spiel beginnt. " +
            "Niemand darf aufhören, bevor die Person zu seiner Linken aufgehört hat zu trinken. " +
            "Das bedeutet, dass der Startspieler zuerst aufhört, danach der Nächste links von ihm, und so weiter. " +
            "Das Spiel ist ein Test für Trinkausdauer und erzeugt eine starke Gruppendynamik.",
        minPlayers: 4,
        difficulty: "medium",
        alcoholLevel: "high",
    },
    {
        name: "Zahlen-Battle",
        description:
            "Die Spieler zählen im Kreis der Reihe nach hoch. Bei jeder Zahl, die entweder ein Vielfaches von 3 ist oder die Ziffer 3 enthält (z.B. 3, 13, 23, 30, 33), darf die Zahl nicht gesagt werden, stattdessen muss geklatscht oder eine andere festgelegte Geste gemacht werden. " +
            "Wer einen Fehler macht, muss trinken. Das Spiel trainiert Konzentration und sorgt für jede Menge Spaß.",
        minPlayers: 2,
        difficulty: "medium",
        alcoholLevel: "medium",
    },
];
