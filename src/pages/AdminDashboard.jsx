import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import { ChevronDown, Search, X, CheckCircle, AlertCircle, Trash2, Check, ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const fallbackImage = "https://images.unsplash.com/photo-1494526585095-c41746248156?w=800&q=80";

function AdminPropertyImages({ prop }) {
  const allImages = (prop.images?.length ? prop.images : [prop.image]).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const src = allImages[idx] || fallbackImage;
  return (
    <div className="relative h-32 w-32 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
      <img
        src={src}
        alt={prop.title}
        className="h-full w-full object-cover"
        onError={(e) => { e.currentTarget.src = fallbackImage; }}
      />
      {allImages.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + allImages.length) % allImages.length); }}
            className="absolute left-0.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-0.5 text-white">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % allImages.length); }}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-0.5 text-white">
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
            {allImages.map((_, i) => (
              <span key={i} className={`block rounded-full ${ i === idx ? "h-1.5 w-3 bg-white" : "h-1.5 w-1.5 bg-white/50" }`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, getToken } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [emailForm, setEmailForm] = useState({ audience: "all", to_email: "", subject: "", body: "" });
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const [propertyStatusFilter, setPropertyStatusFilter] = useState("all");
  const [deleteModal, setDeleteModal] = useState(null); // { id, title }
  const [deleteReason, setDeleteReason] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [payoutModal, setPayoutModal] = useState(null);
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Fetch dashboard stats
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchStats();
    }
  }, [activeTab]);

  // Fetch users based on filters
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, searchQuery, userRoleFilter, currentPage]);

  // Fetch properties
  useEffect(() => {
    if (activeTab === "properties") {
      fetchProperties();
    }
  }, [activeTab, currentPage, propertyStatusFilter]);

  // Fetch verifications
  useEffect(() => {
    if (activeTab === "verifications") {
      fetchVerifications();
    }
  }, [activeTab, currentPage]);

  // Fetch transactions
  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions();
    }
  }, [activeTab, txStatusFilter, currentPage]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        showToast("Failed to load statistics", "error");
      }
    } catch (error) {
      showToast("Error loading statistics", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(userRoleFilter !== "all" && { role: userRoleFilter }),
        ...(searchQuery && { search: searchQuery }),
      });
      
      const response = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      }
    } catch (error) {
      showToast("Error loading users", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/properties/moderation?page=${currentPage}&limit=10&status=${propertyStatusFilter}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProperties(data.data);
      }
    } catch (error) {
      showToast("Error loading properties", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/verifications/pending?page=${currentPage}&limit=10`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setVerifications(data.data);
      }
    } catch (error) {
      showToast("Error loading verifications", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/transactions?page=${currentPage}&limit=20&status=${txStatusFilter}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data);
      }
    } catch (error) {
      showToast("Error loading transactions", "error");
    } finally {
      setLoading(false);
    }
  };

  const initiatePayout = async () => {
    if (!payoutModal) return;
    setPayoutLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/payouts/initiate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: payoutModal.paymentId, host_phone: payoutPhone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payout failed");
      showToast(`Payout of KSh ${data.amount?.toLocaleString()} initiated to ${data.host_phone}`, "success");
      setPayoutModal(null);
      setPayoutPhone("");
      fetchTransactions();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setPayoutLoading(false);
    }
  };

  const approveProperty = async (propertyId) => {
    try {
      const response = await fetch(`${API_URL}/admin/properties/${propertyId}/verify`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approved: true }),
      });
      if (response.ok) {
        showToast("Property approved successfully", "success");
        fetchProperties();
      }
    } catch (error) {
      showToast("Error approving property", "error");
    }
  };

  const deleteProperty = async (propertyId, reason) => {
    try {
      const response = await fetch(`${API_URL}/admin/properties/${propertyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (response.ok) {
        showToast("Property deleted — host notified", "success");
        setDeleteModal(null);
        setDeleteReason("");
        fetchProperties();
      }
    } catch (error) {
      showToast("Error deleting property", "error");
    }
  };

  const approveVerification = async (verificationId, notes = "") => {
    try {
      const response = await fetch(`${API_URL}/admin/verifications/${verificationId}/approve`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });
      if (response.ok) {
        showToast("Verification approved", "success");
        fetchVerifications();
      }
    } catch (error) {
      showToast("Error approving verification", "error");
    }
  };

  const rejectVerification = async (verificationId, notes) => {
    if (!notes) {
      showToast("Please provide a rejection reason", "error");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/admin/verifications/${verificationId}/reject`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes }),
      });
      if (response.ok) {
        showToast("Verification rejected", "success");
        fetchVerifications();
      }
    } catch (error) {
      showToast("Error rejecting verification", "error");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        showToast("User deleted successfully", "success");
        fetchUsers();
      }
    } catch (error) {
      showToast("Error deleting user", "error");
    }
  };

  const sendEmail = async () => {
    if (!emailForm.subject || !emailForm.body) {
      showToast("Subject and body are required", "error");
      return;
    }
    if (emailForm.audience === "one" && !emailForm.to_email) {
      showToast("Please enter a recipient email", "error");
      return;
    }
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/send-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(emailForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setEmailResult(data);
      if (data.sent > 0) {
        showToast(`Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`, "success");
        setEmailForm({ audience: "all", to_email: "", subject: "", body: "" });
      } else {
        showToast(data.error || "All sends failed", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">
              Qrib admin portal
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">
              Welcome back, {user?.name || "Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/search"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Browse listings
            </Link>
            <button
              onClick={() => navigate("/login")}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Exit admin
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-0 px-6">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "users", label: "Users" },
            { id: "properties", label: "Properties" },
            { id: "verifications", label: "Verifications" },
            { id: "transactions", label: "Transactions" },
            { id: "emails", label: "Send Emails" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-4 text-sm font-bold ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-10">
            {/* Stats Grid */}
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {stats ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">Total Users</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{stats.users.total}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {stats.users.students} students, {stats.users.hosts} hosts
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">Properties</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{stats.properties.total}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {stats.properties.verified} verified
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">Bookings</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{stats.bookings.total}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {stats.bookings.completed} completed
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">Pending Reviews</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{stats.pending_verifications}</p>
                    <p className="mt-2 text-sm text-amber-600">Action required</p>
                  </div>
                </>
              ) : (
                <div className="col-span-4 text-center text-slate-500">Loading stats...</div>
              )}
            </section>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or username..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={(e) => {
                  setUserRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="host">Hosts</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-500">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-500">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-500">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-800">{u.name}</td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 capitalize">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="text-red-600 hover:text-red-800 font-semibold text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === "properties" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Properties</h2>
              <div className="flex gap-2">
                {["all", "pending", "approved"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setPropertyStatusFilter(s); setCurrentPage(1); }}
                    className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${
                      propertyStatusFilter === s
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {properties.length === 0 && (
                <p className="text-sm text-slate-500">No properties found.</p>
              )}
              {properties.map((prop) => (
                <div key={prop.id} className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex gap-4">
                    <AdminPropertyImages prop={prop} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{prop.title}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          prop.verified_host
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {prop.verified_host ? "Approved" : "Pending"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{prop.area}, {prop.city}</p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        Ksh {parseFloat(prop.price_per_month).toLocaleString()}/month
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Host: {prop.host_name}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {!prop.verified_host && (
                        <button
                          onClick={() => approveProperty(prop.id)}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => { setDeleteModal({ id: prop.id, title: prop.title }); setDeleteReason(""); }}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verifications Tab */}
        {activeTab === "verifications" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Pending Host Verifications</h2>
            <div className="space-y-4">
              {verifications.map((v) => (
                <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{v.host_name}</h3>
                      <p className="text-sm text-slate-600">{v.host_email}</p>
                      <p className="mt-2 text-sm">
                        <span className="font-semibold">ID Number:</span> {v.id_number}
                      </p>
                      <p className="text-xs text-slate-500">
                        Submitted: {new Date(v.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveVerification(v.id)}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt("Rejection reason:");
                          if (reason) rejectVerification(v.id, reason);
                        }}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Transactions</h2>
              <div className="flex gap-2">
                {["all", "pending", "successful", "failed", "cancelled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setTxStatusFilter(s); setCurrentPage(1); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${
                      txStatusFilter === s
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Property</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Host</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Booking</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Payout</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No transactions found.</td></tr>
                  )}
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{tx.reference}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{tx.student_name}</p>
                        <p className="text-xs text-slate-400">{tx.student_email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{tx.property_title}</td>
                      <td className="px-4 py-3 text-slate-700">{tx.host_name}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">KSh {tx.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                          tx.status === "successful" ? "bg-green-100 text-green-700"
                          : tx.status === "failed" ? "bg-red-100 text-red-700"
                          : tx.status === "cancelled" ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-700"
                        }`}>{tx.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                          tx.booking_status === "completed" ? "bg-green-100 text-green-700"
                          : tx.booking_status === "cancelled" ? "bg-red-100 text-red-700"
                          : tx.booking_status === "approved" ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                        }`}>{tx.booking_status || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {tx.payout_status ? (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                            tx.payout_status === "successful" ? "bg-green-100 text-green-700"
                            : tx.payout_status === "failed" ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                          }`}>{tx.payout_status}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {tx.status === "successful" && !tx.payout_status && (
                          <button
                            onClick={() => {
                              setPayoutModal({ paymentId: tx.id, hostName: tx.host_name, amount: Math.floor(tx.amount * 0.9) });
                              setPayoutPhone(tx.host_phone || "");
                            }}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                          >
                            Pay Host
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === "emails" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Send Email</h2>
              <p className="mt-1 text-sm text-slate-500">Compose and send emails to users.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Audience</label>
                <select
                  value={emailForm.audience}
                  onChange={(e) => setEmailForm((f) => ({ ...f, audience: e.target.value, to_email: "" }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="all">Everyone (students + hosts)</option>
                  <option value="students">All students</option>
                  <option value="hosts">All hosts</option>
                  <option value="one">Single recipient</option>
                </select>
              </div>

              {emailForm.audience === "one" && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Recipient email</label>
                  <input
                    type="email"
                    value={emailForm.to_email}
                    onChange={(e) => setEmailForm((f) => ({ ...f, to_email: e.target.value }))}
                    placeholder="student@example.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Important update from Qrib"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                <textarea
                  rows={8}
                  value={emailForm.body}
                  onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Write your message here..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {emailResult && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${
                  emailResult.sent > 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}>
                  {emailResult.sent > 0
                    ? <>Sent to <strong>{emailResult.sent}</strong> recipient{emailResult.sent !== 1 ? "s" : ""}{emailResult.failed > 0 && ` · ${emailResult.failed} failed`}</>
                    : <>Failed: {emailResult.error || "Unknown error"}</>}
                </div>
              )}

              <button
                onClick={sendEmail}
                disabled={emailSending}
                className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailSending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Payout Modal */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-900">Pay host</h3>
            <p className="mt-1 text-sm text-slate-600">
              Sending payout to <span className="font-semibold">{payoutModal.hostName}</span>.
              Host receives <span className="font-semibold">KSh {payoutModal.amount?.toLocaleString()}</span> (90% after 10% platform fee).
            </p>
            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Host M-Pesa number</label>
              <input
                type="tel"
                value={payoutPhone}
                onChange={(e) => setPayoutPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-400"
              />
              <p className="text-xs text-slate-400 mt-1">Kenyan number — will be saved for future payouts to this host.</p>
            </div>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => { setPayoutModal(null); setPayoutPhone(""); }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={initiatePayout}
                disabled={payoutLoading}
                className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {payoutLoading ? "Sending…" : "Send Payout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Property Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-slate-900">Delete property</h3>
            <p className="mt-1 text-sm text-slate-600">
              You are about to delete <span className="font-semibold">{deleteModal.title}</span>. The host will be notified.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Reason (shown to host)</label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Listing violates platform guidelines"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-red-400 resize-none"
              />
            </div>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteModal(null); setDeleteReason(""); }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteProperty(deleteModal.id, deleteReason)}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                Delete &amp; Notify Host
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



