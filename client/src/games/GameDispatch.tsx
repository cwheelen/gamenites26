import type { SafeUserInfo, TaggedGameView } from "@gamenite/shared";
import NimGame from "./NimGame.tsx";
import GuessGame from "./GuessGame.tsx";
import Connect4Game from "./Connect4Game.tsx";
import BattleshipGame from "./BattleshipGame.tsx";
import { type JSX } from "react";
import useLoginContext from "../hooks/useLoginContext.ts";
import useAuth from "../hooks/useAuth.ts";
import CheckersGame from "./CheckersGame.tsx";

interface GameDispatchProps {
  userPlayerIndex: number;
  players: SafeUserInfo[];
  gameId: string;
  view: TaggedGameView;
}

export default function GameDispatch({
  userPlayerIndex,
  gameId,
  players,
  view,
}: GameDispatchProps): JSX.Element {
  const { socket } = useLoginContext();
  const auth = useAuth();

  function makeMove(move: unknown) {
    socket.emit("gameMakeMove", { auth, payload: { gameId, move } });
  }

  function assertNever(x: never): never {
    throw new Error("Unhandled game view type: " + JSON.stringify(x));
  }

  const childProps = { userPlayerIndex, players, makeMove };
  switch (view.type) {
    case "nim":
      return <NimGame {...{ ...childProps, view: view.view }} />;
    case "guess":
      return <GuessGame {...{ ...childProps, view: view.view }} />;
    case "connect4":
      return <Connect4Game {...{ ...childProps, view: view.view }} />;
    case "battleship":
      return <BattleshipGame {...{ ...childProps, view: view.view }} />;
    case "checkers":
      return <CheckersGame {...{ ...childProps, view: view.view }} />;
    default:
      return assertNever(view);
  }
}
