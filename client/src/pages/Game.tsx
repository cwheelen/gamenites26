import "./Game.css";
import { useParams } from "react-router-dom";
import { getGameById } from "../services/gameService.ts";
import { useEffect, useState } from "react";
import type { GameInfo, SafeUserInfo } from "@gamenite/shared";
import ChatPanel from "../components/ChatPanel.tsx";
import GamePanel from "../components/GamePanel.tsx";
import usePause from "../hooks/usePause.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import useForfeit from "../hooks/useForfeit.ts";

function PauseBanner({
  pausedBy,
  secondsLeft,
  iAmPaused,
  onResume,
}: {
  pausedBy: string;
  secondsLeft: number | null;
  iAmPaused: boolean;
  onResume: () => void;
}) {
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;
  const timeStr =
    minutes !== null && seconds !== null
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : "…";

  return (
    <div className="pauseBanner">
      <span className="pauseIcon">⏸</span>
      <span className="pauseMessage">
        <strong>{pausedBy}</strong> is away — game paused
      </span>
      <span className="pauseCountdown">Auto-forfeit in {timeStr}</span>
      {iAmPaused && (
        <button className="primary narrow" onClick={onResume}>
          I'm back
        </button>
      )}
    </div>
  );
}

export default function Game() {
  const { gameId } = useParams();
  const { user, socket } = useLoginContext();
  const [game, setGame] = useState<GameInfo | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const game = await getGameById(gameId!);
      if (ignore || "error" in game) return;
      setGame(game);
    })();
    return () => {
      ignore = true;
    };
  }, [gameId]);

  // Keep players list and status fresh when a new player joins
  useEffect(() => {
    function onPlayersUpdated(players: SafeUserInfo[]) {
      setGame((prev) => (prev ? { ...prev, players, status: "active" } : prev));
    }
    socket.on("gamePlayersUpdated", onPlayersUpdated);
    return () => {
      socket.off("gamePlayersUpdated", onPlayersUpdated);
    };
  }, [socket]);

  const isPlayer = game?.players.some((p) => p.username === user.username) ?? false;
  const { isPaused, pausedBy, secondsLeft, iAmPaused, pause, resume } = usePause(gameId!, isPlayer);
  const { forfeit } = useForfeit(gameId!, isPlayer);
  const [confirmForfeit, setConfirmForfeit] = useState(false);

  if (!game) return null;

  const isPlayerFinal = game.players.some((p) => p.username === user.username);
  const isActiveFinal = game.status !== "waiting";

  return (
    <>
      {isPaused && pausedBy && (
        <PauseBanner
          pausedBy={pausedBy}
          secondsLeft={secondsLeft}
          iAmPaused={iAmPaused}
          onResume={resume}
        />
      )}

      {isPlayerFinal && isActiveFinal && (
        <div className="pauseControls">
          {!isPaused ? (
            <button className="secondary narrow" onClick={pause}>
              ⏸ Go Away
            </button>
          ) : iAmPaused ? (
            <button className="primary narrow" onClick={resume}>
              ▶ I'm Back
            </button>
          ) : null}
          {!confirmForfeit ? (
            <button className="danger narrow" onClick={() => setConfirmForfeit(true)}>
              🏳 Forfeit
            </button>
          ) : (
            <>
              <span>Are you sure?</span>
              <button
                className="danger narrow"
                onClick={() => {
                  forfeit();
                  setConfirmForfeit(false);
                }}
              >
                Yes, forfeit
              </button>
              <button className="secondary narrow" onClick={() => setConfirmForfeit(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      <div className="gameContainer">
        <GamePanel {...game} />
        <ChatPanel chatId={game.chat} />
      </div>
    </>
  );
}
