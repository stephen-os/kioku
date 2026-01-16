import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { DeckView } from "./pages/DeckView";
import { StudyMode } from "./pages/StudyMode";
import { NewDeck } from "./pages/NewDeck";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="decks/new" element={<NewDeck />} />
        <Route path="decks/:id" element={<DeckView />} />
        <Route path="decks/:id/study" element={<StudyMode />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
