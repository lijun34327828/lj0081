import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Register from "@/pages/Register";
import Reservation from "@/pages/Reservation";
import Settlement from "@/pages/Settlement";
import Management from "@/pages/Management";
import Calculator from "@/pages/Calculator";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/settlement" element={<Settlement />} />
          <Route path="/management" element={<Management />} />
          <Route path="/calculator" element={<Calculator />} />
        </Route>
      </Routes>
    </Router>
  );
}
