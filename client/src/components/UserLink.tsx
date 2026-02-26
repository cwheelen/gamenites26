import type { SafeUserInfo } from "@gamenite/shared";
import useLoginContext from "../hooks/useLoginContext";
import { NavLink } from "react-router-dom";

interface UserLinkProps {
  user: SafeUserInfo;
  capitalize?: boolean;
}

export default function UserLink({ user, capitalize }: UserLinkProps) {
  const loggedInUser = useLoginContext();
  if (user.username === loggedInUser.user.username) {
    return capitalize ? "You" : "you";
  }
  return <NavLink to={`/profile/${user.username}`}>{user.display}</NavLink>;
}
