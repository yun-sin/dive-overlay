import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DiveOverlayUploader from "./DiveOverlayUploader";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import NavBar from "./components/NavBar";  // ✅ 추가

export default function App() {
  return (
    <Router>
      <NavBar />  {/* ✅ 항상 상단에 표시 */}
      <Routes>
        <Route path="/" element={<DiveOverlayUploader />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Router>
  );
}
