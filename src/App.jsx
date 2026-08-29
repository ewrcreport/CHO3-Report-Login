import React, { useState } from "react";
import LoginPage from "./LoginPage.jsx";
import ReportDashboard from "./ReportDashboard.jsx";

function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("cho3_report_token");
    if (!token) return null;
    return {
      token,
      role: Number(localStorage.getItem("cho3_report_role")),
      scopeId: localStorage.getItem("cho3_report_scope"),
      fullName: localStorage.getItem("cho3_report_fullname"),
    };
  });

  function handleLogout() {
    localStorage.clear();
    setSession(null);
  }

  if (!session) {
    return <LoginPage onLoginSuccess={setSession} />;
  }

  return <ReportDashboard session={session} onLogout={handleLogout} />;
}

export default App;