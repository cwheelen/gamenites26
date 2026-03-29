import type { GameKey } from "@gamenite/shared";
import { type ChangeEvent, useState, type SubmitEvent } from "react";
import useAuth from "./useAuth.ts";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";
import { botSupportedGames } from "../util/consts.ts";

export type GameMode = "player" | "bot";

/**
 * Custom hook to manage game creation form logic
 * @throws if outside a LoginContext
 * @returns an object containing
 *  - Form value `gameKey`
 *  - Form value `gameMode` — "player" or "bot"
 *  - Whether the selected game supports bot mode `supportsBotMode`
 *  - Possibly-null error message `err`
 *  - Form handlers `handleInputChange`, `handleModeChange`, and `handleSubmit`
 */
export default function useNewGameForm() {
  const [gameKey, setGameKey] = useState<GameKey | "">("");
  const [gameMode, setGameMode] = useState<GameMode>("player");
  const [vsBot, setVsBot] = useState(false); // ← new
  const [err, setErr] = useState<string | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const supportsBotMode = gameKey !== "" && botSupportedGames.has(gameKey);

  const handleInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);
    setVsBot(false);
    const newKey = e.target.value as GameKey | "";
    setGameKey(newKey);
    // Reset mode to player if the newly selected game doesn't support bots
    if (newKey === "" || !botSupportedGames.has(newKey)) {
      setGameMode("player");
    }
  };

  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
  };

  // Bot handler
  const handleVsBotChange = (e: ChangeEvent<HTMLInputElement>) => {
    setVsBot(e.target.checked);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (gameKey === "") {
      setErr("Please select a game");
      return;
    }
    setErr(null);

    // NOTE: gameMode is available here for when bot logic is implemented.
    // For now, both modes create a standard game the same way.
    // When bot support is added, check `gameMode === "bot"` here and call
    // a different API endpoint or pass the mode along.
    const game = await createGame(auth, gameKey);
    if ("error" in game) {
      setErr(game.error);
      return;
    }
    navigate(`/game/${game.gameId}`);
  };

  return {
    gameKey,
    gameMode,
    supportsBotMode,
    err,
    handleInputChange,
    handleModeChange,
    handleSubmit,
  };
}
