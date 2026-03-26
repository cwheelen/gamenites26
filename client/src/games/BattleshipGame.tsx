import type { BattleshipView, SafeUserInfo } from "@gamenite/shared";
import type { JSX } from "react";

interface BattleshipGameProps {
  userPlayerIndex: number;
  players: SafeUserInfo[];
  makeMove: (move: unknown) => void;
  view: BattleshipView;
}

export default function BattleshipGame({
  userPlayerIndex,
  players,
  makeMove,
  view,
}: BattleshipGameProps): JSX.Element {
  return (
    <div>
      <h2>Battleship is not yet implemented</h2>
      <p>Player Index: {userPlayerIndex}</p>
      <p>Players: {players.map((p) => p.username).join(", ")}</p>
      <pre>{JSON.stringify(view, null, 2)}</pre>
    </div>
  );
}
