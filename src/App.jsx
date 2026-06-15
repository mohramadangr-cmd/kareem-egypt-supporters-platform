import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoyaltyPreviewApp from "./loyaltyPreview/LoyaltyPreviewApp";
import RewardsPlatformApp from "./rewards/RewardsPlatformApp";

function App() {
  return (
    <Routes>
      <Route path="/preview-loyalty/admin" element={<LoyaltyPreviewApp />} />
      <Route path="/admin" element={<Navigate to="/preview-loyalty/admin" replace />} />
      <Route path="/preview-v2" element={<Navigate to="/" replace />} />
      <Route path="/preview-loyalty" element={<Navigate to="/" replace />} />
      <Route path="/preview-loyalty/my-points" element={<Navigate to="/my-points" replace />} />
      <Route path="/preview-loyalty/offers" element={<Navigate to="/offers" replace />} />
      <Route path="/preview-loyalty/register" element={<Navigate to="/register" replace />} />
      <Route path="/preview-loyalty/how-it-works" element={<Navigate to="/how-it-works" replace />} />
      <Route path="/preview-loyalty/about" element={<Navigate to="/about" replace />} />
      <Route path="/preview-loyalty/*" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<RewardsPlatformApp />} />
    </Routes>
  );
}

export default App;
