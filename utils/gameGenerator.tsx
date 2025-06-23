import { drinkingGames } from "./drinkingGames";
import { DrinkingGame } from "./types";

export function getRandomDrinkingGame(players: number): DrinkingGame | null {
    const filtered = drinkingGames.filter((game) => players >= game.minPlayers);
    if (filtered.length === 0) return null;

    const index = Math.floor(Math.random() * filtered.length);
    return filtered[index];
}
