import "./SideBarNav.css";
import { useEffect, useState } from "react";
import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import useAuth from "../hooks/useAuth.ts";
import { getFriendList } from "../services/friendService.ts";

/**
 * The SideBarNav component contains the primary naviagation menu. It
 * highlights the currently selected page and triggers navigation when the
 * menu items are clicked.
 */
export default function SideBarNav() {
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const { username } = useAuth();

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getFriendList(username).then((result) => {
      if (!("error" in result)) {
        setPendingCount(result.pending.length);
      }
    });
  }, [username]);

  const toggleOptions = () => {
    setShowOptions(!showOptions);
  };

  const navClass = ({ isActive }: NavLinkRenderProps) =>
    `menu_button ${isActive ? "menu_selected" : ""}`;

  return (
    <div className="sideBarNav">
      <NavLink to="/" className={navClass}>
        Home
      </NavLink>
      <NavLink to="/games" className={navClass}>
        Games
      </NavLink>
      <NavLink to="/leaderboard" className={navClass}>
        Leaderboard
      </NavLink>
      <NavLink to="/forum" className={navClass}>
        Forum
      </NavLink>
      <NavLink to="/friends" className={navClass}>
        Friends
      </NavLink>
      {pendingCount > 0 && (
        <span className="header__friendsBadge" aria-hidden="true">
          {pendingCount}
        </span>
      )}
      <NavLink
        to={`/profile/${username}`}
        id="menu_user"
        className={navClass}
        onClick={toggleOptions}
      >
        Profile
      </NavLink>
    </div>
  );
}
