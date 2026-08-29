import React from "react";
import LoginPage from "./LoginPage.jsx";

function App() {
  return (
    <LoginPage
      onLoginSuccess={(session) => {
        console.log("เข้าสู่ระบบสำเร็จ:", session);
      }}
    />
  );
}

export default App;