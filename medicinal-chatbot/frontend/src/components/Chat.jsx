import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_BASE = "/api";

function formatMessage(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < part.split("\n").length - 1 && <br />}
      </span>
    ));
  });
}

function MessageBubble({ message }) {
  const isBot = message.type === "bot";

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isBot
            ? "bg-white border border-slate-100 shadow-sm rounded-bl-md text-slate-700"
            : "bg-emerald-600 text-white rounded-br-md"
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {formatMessage(message.text)}
        </div>
      </div>
    </div>
  );
}

export function Chat({ sessionId, userContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const welcome = {
      text: `Hi${userContext?.name ? ` ${userContext.name}` : ""}! I'm your medicinal information assistant. I can help with headaches, cough, cold, fever, indigestion, sleep issues, skin problems, anxiety, joint pain, blood sugar, and general wellness. What would you like to know?`,
      type: "bot",
    };
    setMessages([welcome]);
  }, [userContext?.name]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { text, type: "user" }]);
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_BASE}/chat`, {
        message: text,
        sessionId,
        userContext,
      });
      setMessages((prev) => [...prev, { text: data.text, type: "bot" }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I couldn't reach the server. Please check your connection and try again.",
          type: "bot",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white/60 backdrop-blur rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-slate-100 text-slate-500 text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-slate-100 bg-white/80">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a symptom or condition..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
