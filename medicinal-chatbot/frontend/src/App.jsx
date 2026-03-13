import { useState, useCallback } from "react";
import axios from "axios";
import { Chat } from "./components/Chat";
import { UserDetailsForm } from "./components/UserDetailsForm";

function generateSessionId() {
  return "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
}

function App() {
  const [sessionId] = useState(() => generateSessionId());
  const [userContext, setUserContext] = useState(null);
  const [showDetailsForm, setShowDetailsForm] = useState(true);

  const handleDetailsSubmit = useCallback(async (details) => {
    setUserContext(details);
    try {
      await axios.post("/api/user-details", { sessionId, ...details });
    } catch {
      // Continue even if save fails; we still send context with each message
    }
    setShowDetailsForm(false);
  }, [sessionId]);

  const handleEditDetails = useCallback(() => {
    setShowDetailsForm(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-600 text-lg">🌿</span>
            </div>
            <h1 className="font-semibold text-slate-800 text-lg">Medicinal Info Chatbot</h1>
          </div>
          {userContext && (
            <button
              onClick={handleEditDetails}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Edit details
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">
        {showDetailsForm ? (
          <UserDetailsForm onSubmit={handleDetailsSubmit} initialValues={userContext} />
        ) : (
          <Chat sessionId={sessionId} userContext={userContext} />
        )}
      </main>
    </div>
  );
}

export default App;
