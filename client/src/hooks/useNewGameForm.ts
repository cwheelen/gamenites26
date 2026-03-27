import type { GameKey } from "@gamenite/shared";
import { type ChangeEvent, useState, type SubmitEvent } from "react";
import useAuth from "./useAuth.ts";
import { useNavigate } from "react-router-dom";
import { createGame } from "../services/gameService.ts";

/**
 * Custom hook to manage game creation form logic
 * @throws if outside a LoginContext
 * @returns an object containing
 *  - Form value `gameKey`
 *  - Form value `vsBot` — true when the user wants to play Connect 4 vs the CPU
 *  - Possibly-null error message `err`
 *  - Form handlers `handleInputChange`, `handleVsBotChange`, and `handleSubmit`
 */
export default function useNewGameForm() {
  const [gameKey, setGameKey] = useState<GameKey | "">("");
  const [vsBot, setVsBot] = useState(false); // ← new
  const [err, setErr] = useState<string | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setErr(null);
    setVsBot(false);
    setGameKey(e.target.value as GameKey | "");
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
    const game = await createGame(auth, gameKey, vsBot);
    if ("error" in game) {
      setErr(game.error);
      return;
    }
    navigate(`/game/${game.gameId}`);
  };

  return {
    gameKey,
    vsBot,
    err,
    handleInputChange,
    handleVsBotChange,
    handleSubmit,
  };
}
