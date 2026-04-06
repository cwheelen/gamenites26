import "./GamePanel.css";
import type { GameInfo } from "@gamenite/shared";
import { gameNames } from "../util/consts.ts";
import useLoginContext from "../hooks/useLoginContext.ts";
import GameDispatch from "../games/GameDispatch.tsx";
import useSocketsForGame from "../hooks/useSocketsForGame.ts";
import useTimeSince from "../hooks/useTimeSince.ts";
import UserLink from "./UserLink.tsx";
import { useState } from "react";
import { createGameInvite } from "../services/inviteService.ts";
import useAuth from "../hooks/useAuth.ts";

/**
 * A game panel allows viewing the status and players of a live game
 */
export default function GamePanel({
  gameId,
  type,
  players: initialPlayers,
  createdAt,
  minPlayers,
}: GameInfo) {
  const { user } = useLoginContext();
  const auth = useAuth();
  const timeSince = useTimeSince();

  const { view, players, userPlayerIndex, hasWatched, joinGame, startGame } = useSocketsForGame(
    gameId,
    initialPlayers,
  );

  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleInvite = async () => {
    setInviteStatus("sending");
    try {
      const res = await createGameInvite(auth, inviteUsername, gameId);
      if ("inviteId" in res) {
        setInviteStatus("sent");
      } else {
        setInviteStatus("error");
      }
    } catch (error) {
      setInviteStatus("error");
    }
  };

  return hasWatched ? (
    <div className="gamePanel">
      <div className="gameRoster">
        <h2>{gameNames[type]}</h2>
        <div className="smallAndGray">Game room created {timeSince(createdAt)}</div>
        <div className="dottedList" role="list">
          {players.map((player, index) => (
            <div className="dottedListItem" role="listitem" key={player.username}>
              {player.username === user.username ? (
                `you are player #${index + 1}`
              ) : (
                <span>
                  Player #{index + 1} is <UserLink user={player} />
                </span>
              )}
            </div>
          ))}
        </div>
        {
          // If the game hasn't started and user hasn't joined, they can join
          userPlayerIndex < 0 && !view && (
            <button className="primary narrow" onClick={joinGame}>
              Join Game
            </button>
          )
        }
        {
          // If the game hasn't started and the user has joined, they can start the game if a minimum number of players are present
          userPlayerIndex >= 0 && !view && players.length >= minPlayers && (
            <button className="primary narrow" onClick={startGame}>
              Start Game
            </button>
          )
        }
        {
          // If the game hasn't started and the user has joined, show a section to invite friends
          userPlayerIndex >= 0 && !view && (
            <div className="inviteSection">
              <input
                type="text"
                placeholder="Invite by username"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
              />
              <button
                className="secondary narrow"
                onClick={handleInvite}
                disabled={inviteStatus === "sending" || !inviteUsername}
              >
                {inviteStatus === "sending" ? "Sending..." : "Invite"}
              </button>
              {inviteStatus === "sent" && <span className="smallAndGreen">Invite sent!</span>}
              {inviteStatus === "error" && (
                <span className="smallAndRed">Error sending invite</span>
              )}
            </div>
          )
        }
      </div>
      {view ? (
        <div className="gameFrame">
          <GameDispatch
            gameId={gameId}
            userPlayerIndex={userPlayerIndex}
            players={players}
            view={view}
          />
        </div>
      ) : (
        <div className="gameFrame waiting content">waiting for game to begin</div>
      )}
    </div>
  ) : (
    <div></div>
  );
}
