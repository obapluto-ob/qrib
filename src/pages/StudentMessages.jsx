import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Send, Search, MessageSquare, Home, Calendar, CheckCircle, XCircle, Clock, Building2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const TOKEN_KEY = "qrib_access_token";

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ── Special message bubble for booking requests / responses ──
function BookingBubble({ msg, isOwn, onApprove, onReject, isHost }) {
  const statusColor = {
    negotiating: "bg-amber-50 border-amber-200",
    approved: "bg-emerald-50 border-emerald-200",
    rejected: "bg-red-50 border-red-200",
  };

  const type = msg.message_type;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} my-2`}>
      <div className={`max-w-sm rounded-2xl border p-4 ${
        type === "booking_approved" ? "bg-emerald-50 border-emerald-200" :
        type === "booking_rejected" ? "bg-red-50 border-red-200" :
        "bg-amber-50 border-amber-200"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {type === "booking_approved" ? (
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          ) : type === "booking_rejected" ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : (
            <Clock className="h-4 w-4 text-amber-600" />
          )}
          <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
            {type === "booking_approved" ? "Booking Approved" :
             type === "booking_rejected" ? "Booking Rejected" :
             "Booking Request"}
          </span>
        </div>
        <p className="text-sm text-slate-700">{msg.message}</p>
        {type === "booking_request" && isHost && !isOwn && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onApprove(msg.booking_id)}
              className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(msg.booking_id)}
              className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-bold text-white hover:bg-red-600"
            >
              Reject
            </button>
          </div>
        )}
        {type === "booking_approved" && !isHost && (
          <Link
            to={`/payment/${msg.booking_id}`}
            className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            Continue to payment
          </Link>
        )}
        <p className="mt-2 text-[10px] text-slate-400">
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

// ── Property card in sidebar ──
function PropertyCard({ property, onSelect }) {
  return (
    <button
      onClick={() => onSelect(property)}
      className="w-full text-left border-b border-slate-100 p-3 hover:bg-slate-50 transition"
    >
      <div className="flex gap-3 items-center">
        <img
          src={property.image || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=200&q=60"}
          alt={property.title}
          className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=200&q=60"; }}
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{property.title}</p>
          <p className="text-xs text-slate-500 truncate">{property.area}, {property.city}</p>
          <p className="text-xs font-bold text-blue-600 mt-0.5">KSh {Number(property.price_per_month).toLocaleString()}/mo</p>
        </div>
      </div>
    </button>
  );
}

export default function StudentMessages() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sidebarTab, setSidebarTab] = useState("chats"); // "chats" | "properties"
  const [conversations, setConversations] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null); // property context in active chat
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingProps, setLoadingProps] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [propSearch, setPropSearch] = useState("");

  // Booking request modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [moveInDate, setMoveInDate] = useState(addDays(14));
  const [bookingNote, setBookingNote] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  const getToken = () => localStorage.getItem(TOKEN_KEY);

  // Auto-open from ?partner= and ?property= URL params
  useEffect(() => {
    const partnerId = searchParams.get("partner");
    const propertyId = searchParams.get("property");
    if (partnerId) setSelectedPartnerId(Number(partnerId));
    if (propertyId) {
      fetch(`${API_URL}/properties/${propertyId}`)
        .then(r => r.json())
        .then(data => setSelectedProperty(data.property || data))
        .catch(() => {});
    }
  }, [searchParams]);

  const fetchConversations = useCallback(async () => {
    if (!getToken()) return;
    try {
      setLoadingConvs(true);
      const res = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchMessages = useCallback(async (partnerId) => {
    if (!getToken()) return;
    try {
      setLoadingMsgs(true);
      const res = await fetch(`${API_URL}/messages/user/${partnerId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    setLoadingProps(true);
    try {
      const res = await fetch(`${API_URL}/properties`);
      if (res.ok) {
        const data = await res.json();
        setProperties(Array.isArray(data) ? data : data.properties || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProps(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (sidebarTab === "properties" && properties.length === 0) fetchProperties();
  }, [sidebarTab]);

  useEffect(() => {
    if (!selectedPartnerId || !getToken()) return;
    fetchMessages(selectedPartnerId);
    pollRef.current = setInterval(() => fetchMessages(selectedPartnerId), 5000);
    return () => clearInterval(pollRef.current);
  }, [selectedPartnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedPartnerId) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_id: selectedPartnerId, message: messageText.trim() }),
      });
      if (res.ok) {
        setMessageText("");
        await fetchMessages(selectedPartnerId);
        await fetchConversations();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to send.", "error");
      }
    } catch {
      showToast("Error sending message.", "error");
    } finally {
      setSending(false);
    }
  };

  const handleSendBookingRequest = async () => {
    if (!selectedProperty) return;
    setSubmittingBooking(true);
    try {
      const res = await fetch(`${API_URL}/messages/booking-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: selectedProperty.id,
          move_in_date: moveInDate,
          note: bookingNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send booking request.");
      showToast("Booking request sent to host!", "success");
      setShowBookingModal(false);
      setBookingNote("");
      await fetchMessages(selectedPartnerId);
      await fetchConversations();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleApproveBooking = async (bookingId) => {
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/respond`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error();
      // Send approval message
      await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: selectedPartnerId,
          message: "Your booking request has been approved! Please proceed to payment.",
          message_type: "booking_approved",
          booking_id: bookingId,
        }),
      });
      showToast("Booking approved!", "success");
      await fetchMessages(selectedPartnerId);
    } catch {
      showToast("Failed to approve booking.", "error");
    }
  };

  const handleRejectBooking = async (bookingId) => {
    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/respond`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (!res.ok) throw new Error();
      await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          receiver_id: selectedPartnerId,
          message: "Sorry, your booking request was not approved at this time.",
          message_type: "booking_rejected",
          booking_id: bookingId,
        }),
      });
      showToast("Booking rejected.", "info");
      await fetchMessages(selectedPartnerId);
    } catch {
      showToast("Failed to reject booking.", "error");
    }
  };

  const openPropertyChat = (property) => {
    const hostId = property.host_id;
    if (!hostId) return;
    setSelectedPartnerId(hostId);
    setSelectedProperty(property);
    setSidebarTab("chats");
    setMessages([]);
  };

  const activeConv = conversations.find((c) => c.partner_id === selectedPartnerId);
  const filteredConvs = conversations.filter((c) =>
    c.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredProps = properties.filter((p) =>
    p.title?.toLowerCase().includes(propSearch.toLowerCase()) ||
    p.city?.toLowerCase().includes(propSearch.toLowerCase())
  );
  const isHost = user?.role === "host";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <Link to={isHost ? "/host/dashboard" : "/student/dashboard"} className="text-sm font-semibold text-blue-600 hover:underline">
          Back to dashboard
        </Link>

        <div className="mt-6 flex gap-4 h-[680px]">

          {/* ── SIDEBAR ── */}
          <div className="w-72 flex-shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setSidebarTab("chats")}
                className={`flex-1 py-3 text-sm font-bold transition ${sidebarTab === "chats" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                Chats
              </button>
              {!isHost && (
                <button
                  onClick={() => setSidebarTab("properties")}
                  className={`flex-1 py-3 text-sm font-bold transition ${sidebarTab === "properties" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Properties
                </button>
              )}
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={sidebarTab === "chats" ? "Search chats..." : "Search properties..."}
                  value={sidebarTab === "chats" ? searchQuery : propSearch}
                  onChange={(e) => sidebarTab === "chats" ? setSearchQuery(e.target.value) : setPropSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sidebarTab === "chats" ? (
                loadingConvs ? (
                  <div className="p-6 text-center text-sm text-slate-400">Loading...</div>
                ) : filteredConvs.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">
                      {conversations.length === 0
                        ? "No conversations yet. Browse properties to message a host."
                        : "No results."}
                    </p>
                  </div>
                ) : (
                  filteredConvs.map((conv) => (
                    <button
                      key={conv.partner_id}
                      onClick={() => { setSelectedPartnerId(conv.partner_id); setMessages([]); }}
                      className={`w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 transition ${selectedPartnerId === conv.partner_id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700 flex-shrink-0">
                          {conv.partner_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{conv.partner_name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {conv.sender === "you" ? "You: " : ""}{conv.last_message}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )
              ) : (
                loadingProps ? (
                  <div className="p-6 text-center text-sm text-slate-400">Loading properties...</div>
                ) : filteredProps.length === 0 ? (
                  <div className="p-6 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No properties found.</p>
                  </div>
                ) : (
                  filteredProps.map((p) => (
                    <PropertyCard key={p.id} property={p} onSelect={openPropertyChat} />
                  ))
                )
              )}
            </div>
          </div>

          {/* ── CHAT AREA ── */}
          {selectedPartnerId ? (
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">

              {/* Header */}
              <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                    {activeConv?.partner_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{activeConv?.partner_name || "Host"}</p>
                    <p className="text-xs text-slate-400">{isHost ? "Student" : "Host"}</p>
                  </div>
                </div>
                {selectedProperty && !isHost && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 max-w-[220px]">
                    <Home className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{selectedProperty.title}</p>
                      <p className="text-xs text-slate-500">KSh {Number(selectedProperty.price_per_month).toLocaleString()}/mo</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Property context banner (student only, when property selected) */}
              {selectedProperty && !isHost && (
                <div className="border-b border-blue-100 bg-blue-50 px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedProperty.image || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=200&q=60"}
                      alt={selectedProperty.title}
                      className="h-10 w-10 rounded-lg object-cover"
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=200&q=60"; }}
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedProperty.title}</p>
                      <p className="text-xs text-slate-500">{selectedProperty.area}, {selectedProperty.city} &bull; KSh {Number(selectedProperty.price_per_month).toLocaleString()}/mo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Request booking
                  </button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-2">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="text-center text-sm text-slate-400 mt-10">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center mt-10">
                    <MessageSquare className="mx-auto h-10 w-10 text-slate-200 mb-3" />
                    <p className="text-sm font-bold text-slate-500">No messages yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedProperty ? "Ask about the property or send a booking request." : "Start the conversation."}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSpecial = msg.message_type && msg.message_type !== "text";
                    if (isSpecial) {
                      return (
                        <BookingBubble
                          key={msg.id}
                          msg={msg}
                          isOwn={msg.is_own_message}
                          isHost={isHost}
                          onApprove={handleApproveBooking}
                          onReject={handleRejectBooking}
                        />
                      );
                    }
                    return (
                      <div key={msg.id} className={`flex ${msg.is_own_message ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs rounded-2xl px-4 py-3 text-sm ${msg.is_own_message ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                          <p>{msg.message}</p>
                          <p className={`mt-1 text-[10px] ${msg.is_own_message ? "text-blue-200" : "text-slate-400"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="border-t border-slate-200 p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center">
              <div className="text-center px-6">
                <MessageSquare className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                <p className="font-bold text-slate-700">Select a conversation</p>
                <p className="mt-1 text-sm text-slate-400">
                  {isHost ? "View student messages here." : "Or browse Properties to message a host."}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── BOOKING REQUEST MODAL ── */}
      {showBookingModal && selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-xl font-extrabold text-slate-900">Request booking</h2>
            <p className="mt-1 text-sm text-slate-500">Send a booking request to the host for negotiation.</p>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold text-slate-900 text-sm">{selectedProperty.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{selectedProperty.area}, {selectedProperty.city}</p>
              <p className="text-sm font-bold text-blue-600 mt-1">KSh {Number(selectedProperty.price_per_month).toLocaleString()}/month</p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-900 mb-2">Preferred move-in date</label>
              <input
                type="date"
                value={moveInDate}
                min={addDays(1)}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-900 mb-2">Message to host (optional)</label>
              <textarea
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="Introduce yourself, ask questions, or propose terms..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
              This starts a negotiation. The host can approve or reject. Payment only happens after approval.
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSendBookingRequest}
                disabled={submittingBooking}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingBooking ? "Sending..." : "Send booking request"}
              </button>
              <button
                onClick={() => setShowBookingModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
