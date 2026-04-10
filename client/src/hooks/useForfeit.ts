import { useNavigate } from "react-router-dom";
import useLoginContext from "./useLoginContext";
import { useEffect } from "react";
import useAuth from "./useAuth";

export default function useForfeit(gameId: string, isPlayer: boolean) {
  const { socket } = useLoginContext();
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    function onForfeited(payload: { gameId: string; forfeitingPlayer: string }) {
      if (payload.gameId === gameId) {
        navigate("/games"); // or a "game over" screen
      }
    }
    socket.on("gameForfeited", onForfeited);
    return () => {
      socket.off("gameForfeited", onForfeited);
    };
  }, [socket, gameId, navigate]);

  const forfeit = () => {
    if (!isPlayer) return;

    socket.emit("gameForfeit", { auth, payload: gameId }); // same withAuth wrapper as pause
  };

  return { forfeit };
}
