import "./Layout.css";
import { Outlet, useNavigate } from "react-router-dom";
import Header from "./Header.tsx";
import SideBarNav from "./SideBarNav.tsx";
import useGameInviteToast from "../hooks/useGameInviteToast.ts";
import { toast, Toaster, type Toast } from "react-hot-toast";
import { useEffect } from "react";
import GameInviteToast from "./GameInviteToast.tsx";

/**
 * Main component represents the layout of the main page, including a sidebar
 * and the main content area.
 */
export default function Layout() {
  const { pendingInvite, dismiss } = useGameInviteToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!pendingInvite) return;
    // Show the toast with the invite information and accept/decline buttons
    toast(
      (t: Toast) => (
        <GameInviteToast
          t={t}
          inviteInfo={pendingInvite}
          onAccept={() => {
            navigate(`/game/${pendingInvite.gameId}`);
            toast.dismiss(t.id);
            dismiss();
          }}
          onDecline={() => {
            toast.dismiss(t.id);
            dismiss();
          }}
        />
      ),
      {
        position: "bottom-right",
        duration: Infinity,
      },
    );
  }, [pendingInvite, navigate, dismiss]);

  return (
    <>
      <div id="main" className="main">
        <Header />
        <SideBarNav />
        <div id="right_main" className="right_main">
          <Outlet />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}
