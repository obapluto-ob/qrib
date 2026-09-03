import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Send, Search, MessageSquare } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export default function StudentMessages() {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Auto-open conversation if ?partner=id is in URL (from "Message Host" button)
  useEffect(() => {
    const partnerId = searchParams.get("partner");
    if (partnerId) setSelectedPartnerId(Number(partnerId));
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    fetchConversations();
  }, [token]);

  // Poll for new messages every 5s when a conversation is open
  useEffect(() => {
    if (!selectedPartnerId || !token) return;
    fetchMessages(selectedPartnerId);
    pollRef.current = setInterval(() => fetchMessages(selectedPartnerId), 5000);
    return () => clearInterval(pollRef.current);
  }, [selectedPartnerId, token]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoadingConvs(true);
      const res = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConvs(false);
    }
  };

  const fetchMessages = async (partnerId) => {
    try {
      setLoadingMsgs(true);
      const res = await fetch(`${API_URL}/messages/user/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedPartnerId) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiver_id: selectedPartnerId, message: messageText.trim() }),
      });

      if (res.ok) {
        setMessageText("");
        await fetchMessages(selectedPartnerId);
        await fetchConversations();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to send message.", "error");
      }
    } catch {
      showToast("Error sending message.", "error");
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (partnerId) => {
    setSelectedPartnerId(partnerId);
    setMessages([]);
  };

  const activeConv = conversations.find((c) => c.partner_id === selectedPartnerId);

  const filtered = conversations.filter((c) =>
    c.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <Link to="/student/dashboard" className="text-sm font-semibold text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>

        <div className="mt-6 flex gap-6 h-[620px]">
          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-black text-slate-900">Messages</h2>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConvs ? (
                <div className="p-6 text-center text-sm text-slate-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">
                    {conversations.length === 0 ? "No conversations yet. Message a host from a property page." : "No results."}
                  </p>
                </div>
              ) : (
                filtered.map((conv) => (
                  <button
                    key={conv.partner_id}
                    onClick={() => selectConversation(conv.partner_id)}
                    className={`w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50 transition ${
                      selectedPartnerId === conv.partner_id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                    }`}
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
              )}
            </div>
          </div>

          {/* Chat area */}
          {selectedPartnerId ? (
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden">
              {/* Header */}
              <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                  {activeConv?.partner_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{activeConv?.partner_name || "Host"}</p>
                  <p className="text-xs text-slate-400">Host</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {loadingMsgs && messages.length === 0 ? (
                  <div className="text-center text-sm text-slate-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-slate-400 mt-10">
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_own_message ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs rounded-2xl px-4 py-3 text-sm ${
                        msg.is_own_message ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                      }`}>
                        <p>{msg.message}</p>
                        <p className={`mt-1 text-[10px] ${msg.is_own_message ? "text-blue-200" : "text-slate-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
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
                <p className="mt-1 text-sm text-slate-400">Or message a host directly from a property page.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
