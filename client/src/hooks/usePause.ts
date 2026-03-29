import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GamePauseStatePayload } from "@gamenite/shared";
import useLoginContext from "./useLoginContext.ts";
import useAuth from "./useAuth.ts";

export default function usePause(gameId: string, isPlayer: boolean) {
  const { socket, user } = useLoginContext();
  const auth = useAuth();
  const navigate = useNavigate();

  const [pauseState, setPauseState] = useState<GamePauseStatePayload>({
    gameId,
    isPaused: false,
    pausedBy: null,
    timeoutAt: null,
  });
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    function onPauseStateChanged(payload: GamePauseStatePayload) {
      if (payload.gameId !== gameId) return;
      setPauseState(payload);
    }

    function onTimedOut(payload: { gameId: string; forfeitedPlayer: string }) {
      if (payload.gameId !== gameId) return;
      navigate("/games");
    }

    socket.on("gamePauseStateChanged", onPauseStateChanged);
    socket.on("gameTimedOut", onTimedOut);
    return () => {
      socket.off("gamePauseStateChanged", onPauseStateChanged);
      socket.off("gameTimedOut", onTimedOut);
    };
  }, [socket, gameId, navigate]);

  useEffect(() => {
    if (!pauseState.isPaused || !pauseState.timeoutAt) {
      return;
    }
    function tick() {
      if (!pauseState.timeoutAt) return;
      const remaining = Math.max(
        0,
        Math.round((new Date(pauseState.timeoutAt).getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(remaining);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      clearInterval(interval);
      setSecondsLeft(null);
    };
  }, [pauseState.isPaused, pauseState.timeoutAt]);

  function pause() {
    if (!isPlayer) return;
    socket.emit("gamePause", { auth, payload: gameId });
  }

  function resume() {
    if (!isPlayer) return;
    socket.emit("gameResume", { auth, payload: gameId });
  }

  return {
    isPaused: pauseState.isPaused,
    pausedBy: pauseState.pausedBy,
    secondsLeft,
    iAmPaused: pauseState.pausedBy === user.username,
    pause,
    resume,
  };
}
