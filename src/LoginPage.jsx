import React, { useState } from "react";
import dnpLogo from "./assets/DNP60x60.png";

const API =
  "https://script.google.com/macros/s/AKfycbzFsCrptUSDZaJQfWVJTGYeHEPH5A2GCRP3DQUTeVHbpmxaMVFM2Kue5Y_p74EIU6hViA/exec";

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "login",
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // เก็บ session ไว้ใช้เรียก API ดูข้อมูลต่อในขั้นที่ 5
        localStorage.setItem("cho3_report_token", result.token);
        localStorage.setItem("cho3_report_role", result.role);
        localStorage.setItem("cho3_report_scope", result.scopeId || "");
        localStorage.setItem("cho3_report_fullname", result.fullName || "");

        if (onLoginSuccess) {
          onLoginSuccess({
            token: result.token,
            role: result.role,
            scopeId: result.scopeId,
            fullName: result.fullName,
          });
        }
      } else {
        setError(result.message || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleLogin();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 font-sans"
      style={{ background: "linear-gradient(135deg, #0d2818, #132218)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8">
        <div className="text-center mb-6">
          <img
            src={dnpLogo}
            alt="กรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช"
            className="w-14 h-14 mx-auto mb-3.5 rounded-full object-cover"
            style={{ border: "1.5px solid #E9C9A0" }}
          />
          <h1
            className="text-base font-bold text-emerald-950"
            style={{ color: "#132218" }}
          >
            ระบบรายงานสรุปข้อมูลช้างป่า
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            สำหรับเจ้าหน้าที่ผู้มีสิทธิ์เข้าถึง
          </p>
        </div>

        <label className="text-xs font-semibold text-stone-900 block mb-1.5">
          ชื่อผู้ใช้
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="เช่น sombat.k"
          autoComplete="username"
          className="w-full box-border px-3.5 py-2.5 mb-3.5 rounded-lg border-[1.5px] border-stone-200 bg-stone-50 text-sm focus:outline-none focus:border-amber-600"
        />

        <label className="text-xs font-semibold text-stone-900 block mb-1.5">
          รหัสผ่าน
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full box-border px-3.5 py-2.5 mb-3.5 rounded-lg border-[1.5px] border-stone-200 bg-stone-50 text-sm focus:outline-none focus:border-amber-600"
        />

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2.5 mb-3.5">
            ⚠ {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2"
        >
          {loading && (
            <span
              className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white"
              style={{ animation: "spin 0.7s linear infinite" }}
            />
          )}
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>

        <p className="text-center text-[11.5px] text-stone-400 mt-3.5">
          ลืมรหัสผ่าน หรือยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบ
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default LoginPage;
