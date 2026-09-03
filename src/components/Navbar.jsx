import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Bell, MessageSquare } from "lucide-react";
import logo from "../assets/qrib-logo.png";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const TOKEN_KEY = "qrib_access_token";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return undefined;
    }

    const fetchUnreadCount = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadNotifications(Number(data.unread_count) || 0);
        }
      } catch {
        // Notification polling should not interrupt navigation.
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const dashboardPath =
    user?.role === "host"
      ? "/host/dashboard"
      : user?.role === "admin"
        ? "/admin/dashboard"
        : "/student/dashboard";

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-20">

        {/* LOGO */}

        <Link
          to={user ? dashboardPath : "/"}
          onClick={closeMenu}
          className="flex items-center gap-3"
        >
          <img src={logo} alt="Qrib" className="h-10 w-auto object-contain" />
        </Link>

        {/* DESKTOP */}

        <div className="hidden items-center gap-7 md:flex">

          {user ? (
            <>
              <Link
                to={dashboardPath}
                className="text-sm font-semibold text-slate-800 transition hover:text-brand"
              >
                Dashboard
              </Link>

              <Link
                to="/search"
                className="text-sm font-semibold text-slate-800 transition hover:text-brand"
              >
                Find accommodation
              </Link>

              {user.role === "student" && (
                <>
                  <Link
                    to="/student/saved"
                    className="text-sm font-semibold text-slate-800 transition hover:text-brand"
                  >
                    Saved homes
                  </Link>

                  <Link
                    to="/help"
                    className="text-sm font-semibold text-slate-800 transition hover:text-brand"
                  >
                    Help
                  </Link>
                </>
              )}

              {user.role === "host" && (
                <Link
                  to="/add-property"
                  className="text-sm font-semibold text-slate-800 transition hover:text-brand"
                >
                  Add property
                </Link>
              )}

              {user.role === "admin" && (
                <Link
                  to="/admin/dashboard"
                  className="text-sm font-semibold text-slate-800 transition hover:text-brand"
                >
                  Admin portal
                </Link>
              )}

              <div className="flex items-center gap-4 border-l border-slate-200 pl-6">

                <Link
                  to="/notifications"
                  className="relative flex items-center justify-center h-10 w-10 rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-brand"
                  title="Notifications"
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </Link>

                <Link
                  to="/messages"
                  className="flex items-center justify-center h-10 w-10 rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-brand"
                  title="Messages"
                >
                  <MessageSquare size={20} />
                </Link>

                <Link
                  to={dashboardPath}
                  className="text-sm font-bold text-slate-800"
                >
                  Hi, {user.name?.split(" ")[0] || "User"}
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-sm font-bold text-red-600 transition hover:text-red-700"
                >
                  Log out
                </button>

              </div>
            </>
          ) : (
            <>
              <Link
                to="/search"
                className="text-sm font-semibold text-slate-800 transition hover:text-brand"
              >
                Find accommodation
              </Link>

              <Link
                to="/help"
                className="text-sm font-semibold text-slate-800 transition hover:text-brand"
              >
                Help
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
              >
                Log in
              </Link>
            </>
          )}

        </div>

        {/* MOBILE BUTTON */}

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-800 transition hover:bg-slate-50 md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <span className="text-2xl leading-none">×</span>
          ) : (
            <span className="text-2xl leading-none">☰</span>
          )}
        </button>
      </nav>

      {/* MOBILE MENU */}

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white shadow-xl md:hidden">
          <div className="flex flex-col gap-4 px-6 py-6">

            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={closeMenu}
                  className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800"
                >
                  Dashboard
                </Link>

                <Link
                  to="/search"
                  onClick={closeMenu}
                  className="text-sm font-semibold text-slate-800"
                >
                  Find accommodation
                </Link>

                {user.role === "host" && (
                  <Link
                    to="/add-property"
                    onClick={closeMenu}
                    className="text-sm font-semibold text-slate-800"
                  >
                    Add property
                  </Link>
                )}

                {user.role === "admin" && (
                  <Link
                    to="/admin/dashboard"
                    onClick={closeMenu}
                    className="text-sm font-semibold text-slate-800"
                  >
                    Admin portal
                  </Link>
                )}

                <Link
                  to="/help"
                  onClick={closeMenu}
                  className="text-sm font-semibold text-slate-800"
                >
                  Help
                </Link>

                <Link
                  to="/notifications"
                  onClick={closeMenu}
                  className="text-sm font-semibold text-slate-800"
                >
                  Notifications
                </Link>

                <Link
                  to="/messages"
                  onClick={closeMenu}
                  className="text-sm font-semibold text-slate-800"
                >
                  Messages
                </Link>

                <div className="border-t border-slate-100 pt-4">

                  <p className="text-sm font-bold text-slate-900">
                    {user.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {user.email}
                  </p>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-4 text-sm font-bold text-red-600"
                  >
                    Log out
                  </button>

                </div>
              </>
            ) : (
              <>
                <Link
                  to="/search"
                  onClick={closeMenu}
                  className="text-sm font-semibold text-slate-800"
                >
                  Find accommodation
                </Link>

                <Link
                  to="/help"
                  onClick={closeMenu}
                  className="text-sm font-semibold text-slate-800"
                >
                  Help
                </Link>

                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="rounded-xl bg-brand px-5 py-3 text-center text-sm font-bold text-white"
                >
                  Log in
                </Link>
              </>
            )}

          </div>
        </div>
      )}
    </header>
  );
}