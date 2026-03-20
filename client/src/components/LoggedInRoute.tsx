import { type JSX, useEffect, useMemo } from "react";
import { type AuthContext, LoginContext } from "../contexts/LoginContext.ts";
import { type GameSocket } from "../util/types.ts";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

interface LoggedInRouteParams {
  auth: AuthContext | null;
  socket: GameSocket | null;
  children: JSX.Element;
}

/**
 * Ensures that, if we're not in an appropriately-initialized logged-in
 * context with auth and socket both non-null, we will navigate to `/login`.
 *
 * This setup assumes that socket will be non-null by the time auth becomes
 * non-null. This could cause unexpected behavior if the socket is unable
 * to initialize correctly. If socket is null when auth becomes non-null, we
 * will navigate back to the login page, even though the user will have just,
 * from their perspective, logged in.
 */
export default function LoggedInRoute({ auth, socket, children }: LoggedInRouteParams) {
  const location = useLocation();
  const navigate = useNavigate();

  // This use of `useMemo` is critical, because there are there are other
  // places in the app where `context` appears as part of a dependency array
  // (notably in `useAuth`). If we don't use `useMemo` here, those dependency
  // arrays will change every time the app updates.
  const context = useMemo(() => (auth && socket ? { ...auth, socket } : null), [auth, socket]);

  useEffect(() => {
    if (!socket || !auth) return;

    const handleDmNotification = (payload: {
      fromUsername: string;
      fromDisplay: string;
      message: { text: string };
    }) => {
      if (location.pathname === `/dm/${payload.fromUsername}`) return;

      toast(
        (t) => (
          <span
            style={{ cursor: "pointer" }}
            onClick={() => {
              navigate(`/dm/${payload.fromUsername}`);
              toast.dismiss(t.id);
            }}
          >
            <strong>{payload.fromDisplay}</strong> sent you a message
            <br />
            <span style={{ fontSize: "0.85em", opacity: 0.8 }}>
              {payload.message.text.length > 50
                ? payload.message.text.slice(0, 50) + "…"
                : payload.message.text}
            </span>
          </span>
        ),
        {
          duration: 5000,
          icon: "💬",
        },
      );
    };

    socket.on("dmNotification", handleDmNotification);
    return () => {
      socket.off("dmNotification", handleDmNotification);
    };
  }, [socket, auth, location.pathname, navigate]);

  return context ? (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "0.5rem",
            background: "#333",
            color: "#fff",
          },
        }}
      />
      <LoginContext.Provider value={context}>{children}</LoginContext.Provider>
    </>
  ) : (
    <Navigate to="/login" />
  );
}
