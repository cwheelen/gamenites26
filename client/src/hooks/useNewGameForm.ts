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
  const [numBots, setNumBots] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const supportsBotMode = gameKey !== "" && botSupportedGames.has(gameKey);
  const isGuessBotGame = supportsBotMode && gameKey === "guess" && gameMode === "bot";

  const handleInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);
    const newKey = e.target.value as GameKey | "";
    setGameKey(newKey);
    if (newKey === "" || !botSupportedGames.has(newKey)) {
      setGameMode("player");
    }
    if (newKey !== "guess") {
      setNumBots(1);
    }
  };

  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
  };

  const handleNumBotsChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setNumBots(Math.max(1, Math.min(4, Number(e.target.value))));
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (gameKey === "") {
      setErr("Please select a game");
      return;
    }
    setErr(null);

    let game;
    if (isGuessBotGame) {
      game = await createGame(auth, gameKey, true, numBots);
    } else {
      game = await createGame(auth, gameKey, gameMode === "bot");
    }
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
    isGuessBotGame,
    numBots,
    err,
    handleInputChange,
    handleModeChange,
    handleNumBotsChange,
    handleSubmit,
  };
}
