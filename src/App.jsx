import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoyaltyPreviewApp from "./loyaltyPreview/LoyaltyPreviewApp";
import RewardsPlatformApp from "./rewards/RewardsPlatformApp";

function App() {
  return (
    <Routes>
      <Route path="/preview-loyalty/*" element={<LoyaltyPreviewApp />} />
      <Route path="/preview-v2" element={<Navigate to="/" replace />} />
      <Route path="/*" element={<RewardsPlatformApp />} />
    </Routes>
  );
}

export default App;
