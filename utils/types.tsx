export type DrinkingGame = {
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers?: number;
    difficulty: "easy" | "medium" | "hard";
    alcoholLevel: "low" | "medium" | "high";
};