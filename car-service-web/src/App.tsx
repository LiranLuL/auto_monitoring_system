import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage, DashboardPage, VehicleDetailPage } from "./pages";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/vehicle/:vin" element={<VehicleDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
