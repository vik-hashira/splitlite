import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import CreateGroup from "./pages/CreateGroup";
import GroupPage from "./pages/GroupPage";
import RouteTracker from "./components/RouteTracker";
import { firebaseConfigured } from "./lib/firebase";

export default function App() {
  if (!firebaseConfigured) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">SplitLite</h1>
        <p className="mt-3 text-sm text-slate-600">
          Firebase is not configured. Copy <code>.env.example</code> to <code>.env</code> and fill in
          your Firebase web app config.
        </p>
      </div>
    );
  }
  return (
    <HashRouter>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<CreateGroup />} />
        <Route path="/g/:groupId" element={<GroupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
