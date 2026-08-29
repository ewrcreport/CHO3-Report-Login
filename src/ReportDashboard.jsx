import React, { useState, useMemo, useEffect } from "react";
import { Search, SlidersHorizontal, LogOut } from "lucide-react";

const API =
  "https://script.google.com/macros/s/AKfycbzFsCrptUSDZaJQfWVJTGYeHEPH5A2GCRP3DQUTeVHbpmxaMVFM2Kue5Y_p74EIU6hViA/exec";

/* ============================================================
 * Mock data — จะถูกแทนที่ด้วยข้อมูลจริงจาก ReportData.gs ในขั้นถัดไป
 * โครงสร้างตรงกับ 3 ตารางที่ตกลงกันไว้ (Sheet_Incident/Damage/Elephant)
 * ============================================================ */
/** วันที่จาก Google Sheet มักมาเป็น Date object -> JSON เป็น ISO string เต็มรูป
 * ตัดให้เหลือแค่ YYYY-MM-DD ให้ตรงกับ <input type="date"> เพื่อกรองได้ถูกต้อง */
function toISODateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

/** แปลงวันที่ ค.ศ. (ISO) เป็นข้อความ พ.ศ. สำหรับแสดงผลในตารางเท่านั้น */
function toThaiDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${Number(y) + 543}`;
}

/** แปลงแถว Sheet_Incident (key ภาษาไทย) ให้เป็นโครงสร้างเดิมที่ตัว component ใช้อยู่แล้ว */
function mapIncidentRow(row) {
  return {
    incidentId: row["รหัสเหตุการณ์"],
    incidentDate: toISODateOnly(row["วันที่เกิดเหตุ"]),
    office: row["สำนัก"] || "",
    area: row["ชื่อพื้นที่อนุรักษ์"] || "",
    province: row["จังหวัด"] || "",
    district: row["อำเภอ"] || "",
    subdistrict: row["ตำบล"] || "",
    hasDamage: row["มีความเสียหาย"] || "",
    reporter: row["ผู้บันทึก"] || "",
  };
}

/** แปลงแถว Sheet_Damage — เลือกคอลัมน์ "รายการ"/"รายละเอียด" ให้ตรงตามประเภทความเสียหาย */
function mapDamageRow(row) {
  const damageType = row["ประเภทความเสียหาย"] || "";
  let item = "";
  let detail = "";

  if (damageType === "คนบาดเจ็บ/เสียชีวิต") {
    item = row["ชื่อ-นามสกุล"] || "";
    detail = row["อาการ"] || "";
  } else if (damageType === "ทรัพย์สิน") {
    item = row["รายการทรัพย์สิน"] || "";
    detail = row["มูลค่าประเมิน"] ? "มูลค่า " + row["มูลค่าประเมิน"] + " บาท" : "";
  } else if (damageType === "พืชผล") {
    item = row["ชนิดพืช"] || "";
    detail = row["พื้นที่เสียหาย(ไร่)"] ? "เสียหาย " + row["พื้นที่เสียหาย(ไร่)"] + " ไร่" : "";
  }

  return {
    incidentId: row["รหัสเหตุการณ์"],
    damageType,
    item,
    detail: detail || row["หมายเหตุ"] || "",
  };
}

/** แปลงแถว Sheet_Elephant — เลือกรายละเอียดให้ตรงตามประเภทบันทึก */
function mapElephantRow(row) {
  const recordType = row["ประเภทบันทึก"] || "";
  let detail = "";

  if (recordType === "การพบเห็น") {
    const count = row["จำนวนตัว(นับได้จริง)"] || row["จำนวนตัว(ประมาณการ)"];
    detail = count ? "นับได้ " + count + " ตัว" : "";
  } else {
    detail = row["อาการ"] || row["สาเหตุการตาย"] || "";
  }

  return {
    incidentId: row["รหัสเหตุการณ์"],
    recordType,
    elephantName: row["ชื่อช้าง"] || "",
    herdName: row["ชื่อฝูง"] || "",
    detail: detail || row["หมายเหตุ"] || "",
  };
}

const ROLE_LABELS = { 1: "สิทธิ์เข้าใช้งานระดับกรม", 2: "สิทธิ์เข้าใช้งานระดับสำนัก", 3: "สิทธิ์เข้าใช้งานระดับหน่วยงาน", 4: "สิทธิ์เข้าใช้งานระดับชุดปฏิบัติการ" };

function ExcelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32">
      <rect x="2" y="4" width="20" height="24" rx="2" fill="#107C41" />
      <rect x="14" y="9" width="16" height="14" rx="1.5" fill="#185C37" />
      <path d="M6 9h13v14H6z" fill="#21A366" />
      <text x="12.5" y="20" fontFamily="Arial" fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">
        X
      </text>
    </svg>
  );
}

function ReportDashboard({ session, onLogout }) {
  const [incidents, setIncidents] = useState([]);
  const [damages, setDamages] = useState([]);
  const [elephants, setElephants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      setLoadError("");

      try {
        const res = await fetch(API, {
          method: "POST",
          body: JSON.stringify({ action: "getReport", token: session.token }),
        });
        const result = await res.json();

        if (result.success) {
          setIncidents(result.incidents.map(mapIncidentRow));
          setDamages(result.damages.map(mapDamageRow));
          setElephants(result.elephants.map(mapElephantRow));
        } else {
          setLoadError(result.message || "โหลดข้อมูลไม่สำเร็จ");
        }
      } catch (err) {
        setLoadError("เกิดข้อผิดพลาด: " + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [session.token]);

  const [searchText, setSearchText] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState({
    date: "",
    hasDamage: "ทั้งหมด",
    province: "",
    district: "",
    subdistrict: "",
    elephantName: "",
    herdName: "",
    reporter: "",
  });
  const [selectedIds, setSelectedIds] = useState(new Set());

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      date: "",
      hasDamage: "ทั้งหมด",
      province: "",
      district: "",
      subdistrict: "",
      elephantName: "",
      herdName: "",
      reporter: "",
    });
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const incidentHaystack = [inc.office, inc.area, inc.province, inc.district, inc.subdistrict, inc.reporter]
          .join(" ")
          .toLowerCase();
        const relatedElephants = elephants.filter((e) => e.incidentId === inc.incidentId);
        const elephantHaystack = relatedElephants
          .map((e) => [e.elephantName, e.herdName].filter(Boolean).join(" "))
          .join(" ")
          .toLowerCase();
        if (!incidentHaystack.includes(q) && !elephantHaystack.includes(q)) return false;
      }
      if (filters.hasDamage !== "ทั้งหมด" && inc.hasDamage !== filters.hasDamage) return false;
      if (filters.date && inc.incidentDate !== filters.date) return false;
      if (filters.province && !inc.province.includes(filters.province)) return false;
      if (filters.district && !inc.district.includes(filters.district)) return false;
      if (filters.subdistrict && !inc.subdistrict.includes(filters.subdistrict)) return false;
      if (filters.reporter && !inc.reporter.includes(filters.reporter)) return false;

      // ช่อง "ชื่อช้าง"/"ชื่อฝูง" ในแผงตัวกรองขั้นสูง — เช็คจากข้อมูลช้างของเหตุการณ์นี้
      if (filters.elephantName || filters.herdName) {
        const related = elephants.filter((e) => e.incidentId === inc.incidentId);
        if (
          filters.elephantName &&
          !related.some((e) => (e.elephantName || "").includes(filters.elephantName))
        ) {
          return false;
        }
        if (
          filters.herdName &&
          !related.some((e) => (e.herdName || "").includes(filters.herdName))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [incidents, elephants, searchText, filters]);

  // ถ้าไม่ได้เลือกแถวไหนเลย -> ใช้ผลลัพธ์ที่กรองด้วยช่องค้นหา/แผงกรองแทน
  const relevantIds =
    selectedIds.size > 0 ? selectedIds : new Set(filteredIncidents.map((i) => i.incidentId));

  const filteredDamages = damages.filter((d) => relevantIds.has(d.incidentId));
  const filteredElephants = elephants.filter((e) => relevantIds.has(e.incidentId));

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (relevantIds.size === 0) {
      alert("ไม่มีข้อมูลให้ดาวน์โหลดตามที่ค้นหา/กรองไว้");
      return;
    }

    setExporting(true);

    try {
      const res = await fetch(API, {
        method: "POST",
        body: JSON.stringify({
          action: "exportExcel",
          token: session.token,
          incidentIds: Array.from(relevantIds),
        }),
      });
      const result = await res.json();

      if (!result.success) {
        alert(result.message || "ดาวน์โหลดไม่สำเร็จ");
        return;
      }

      const byteCharacters = atob(result.fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 font-sans">
      {/* Header */}
      <div className="bg-emerald-950 text-white px-6 py-3.5 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">ระบบรายงานสรุปข้อมูลช้างป่า</div>
          <div className="text-xs text-emerald-200">
            {session?.fullName} — {ROLE_LABELS[session?.role] || "ไม่ทราบสิทธิ์"}
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs bg-emerald-900 hover:bg-emerald-800 px-3 py-1.5 rounded-lg"
        >
          <LogOut size={14} /> ออกจากระบบ
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {loading && (
          <div className="text-center text-sm text-stone-500 py-10">กำลังโหลดข้อมูล...</div>
        )}

        {!loading && loadError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3 mb-4">
            ⚠ {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
        {/* ช่องค้นหา + ปุ่มดาวน์โหลด Excel */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ค้นหา เช่น ชื่อช้าง, ชื่อฝูง, ผู้รายงาน, จังหวัด..."
              className="w-full box-border pl-10 pr-11 py-2.5 rounded-full border-[1.5px] border-stone-200 bg-white text-sm focus:outline-none focus:border-amber-600"
            />
            <button
              type="button"
              onClick={() => setShowFilterPanel((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none p-0 cursor-pointer flex"
            >
              <SlidersHorizontal size={17} className="text-stone-400" />
            </button>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 text-sm font-semibold bg-white text-stone-900 border-[1.5px] border-stone-200 rounded-full px-4 flex-shrink-0 disabled:opacity-60"
          >
            <ExcelIcon /> {exporting ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด Excel"}
          </button>
        </div>

        {/* แผงตัวกรองขั้นสูง */}
        {showFilterPanel && (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-lg p-5 mb-4">
            <div className="flex justify-between items-center mb-3.5">
              <span className="text-sm font-bold text-stone-900">ตัวกรองขั้นสูง</span>
              <span
                onClick={clearFilters}
                className="text-xs text-amber-700 cursor-pointer"
              >
                ล้างตัวกรอง
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Field label="วันที่เกิดเหตุ">
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => updateFilter("date", e.target.value)}
                  className="w-full box-border px-2.5 py-2 border-[1.5px] border-stone-200 rounded-lg text-xs"
                />
              </Field>
              <Field label="มีความเสียหาย">
                <select
                  value={filters.hasDamage}
                  onChange={(e) => updateFilter("hasDamage", e.target.value)}
                  className="w-full box-border px-2.5 py-2 border-[1.5px] border-stone-200 rounded-lg text-xs"
                >
                  <option>ทั้งหมด</option>
                  <option>มี</option>
                  <option>ไม่มี</option>
                </select>
              </Field>
              <Field label="จังหวัด">
                <input
                  value={filters.province}
                  onChange={(e) => updateFilter("province", e.target.value)}
                  placeholder="เช่น ระยอง"
                  className="w-full box-border px-2.5 py-2 border-[1.5px] border-stone-200 rounded-lg text-xs"
                />
              </Field>
              <Field label="อำเภอ">
                <input
                  value={filters.district}
                  onChange={(e) => updateFilter("district", e.target.value)}
                  className="w-full box-border px-2.5 py-2 border-[1.5px] border-stone-200 rounded-lg text-xs"
                />
              </Field>
              <Field label="ตำบล">
                <input
                  value={filters.subdistrict}
                  onChange={(e) => updateFilter("subdistrict", e.target.value)}
                  className="w-full box-border px-2.5 py-2 border-[1.5px] border-stone-200 rounded-lg text-xs"
                />
              </Field>
              <Field label="ชื่อช้าง">
                <input
                  value={filters.elephantName}
                  onChange={(e) => updateFilter("elephantName", e.target.value)}
                  placeholder="เช่น พลายงาเดี่ยว"
                  className="w-full box-border px-2.5 py-2 border-[1.5px] border-stone-200 rounded-lg text-xs"
                />
              </Field>
              <Field label="ชื่อฝูง">
                <input
                  value={filters.herdName}
                  onChange={(e) => updateFilter("herdName", e.target.value)}
                  placeholder="เช่น ฝูงงาดำ"
                  className="w-full box-border px-2.5 py-2 border-[1.5px] border-stone-200 rounded-lg text-xs"
                />
              </Field>
              <Field label="ผู้รายงาน">
                <input
                  value={filters.reporter}
                  onChange={(e) => updateFilter("reporter", e.target.value)}
                  className="w-full box-border px-2.5 py-2 border-[1.5px] border-stone-200 rounded-lg text-xs"
                />
              </Field>
            </div>
          </div>
        )}

        <p className="text-xs text-stone-500 mb-3.5">
          คลิกแถวเพื่อเลือก (เลือกได้หลายแถว) — ยังไม่เลือกจะดาวน์โหลด/แสดงข้อมูลทั้งหมดที่ค้นหาไว้
        </p>

        {/* ตารางที่ 1: เหตุการณ์ */}
        <Card title="1. ตารางหลักเหตุการณ์">
          <Table
            headers={["รหัสเหตุการณ์", "วันที่", "สำนัก", "พื้นที่", "มีความเสียหาย"]}
            rows={filteredIncidents.map((inc) => ({
              id: inc.incidentId,
              cells: [inc.incidentId, toThaiDate(inc.incidentDate), inc.office, inc.area, inc.hasDamage],
            }))}
            selectable
            selectedIds={selectedIds}
            onToggle={toggleSelect}
          />
        </Card>

        <div className="flex items-center gap-2 my-3.5">
          <span className="text-xs text-stone-500">แสดงรายละเอียดของ</span>
          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-1 font-semibold">
            {selectedIds.size === 0 ? "ทุกเหตุการณ์" : Array.from(selectedIds).sort((a, b) => a - b).join(", ")}
          </span>
        </div>

        {/* ตารางที่ 2: ความเสียหาย */}
        <Card title="2. ตารางความเสียหาย">
          <Table
            headers={["รหัสเหตุการณ์", "ประเภท", "รายการ", "รายละเอียด"]}
            rows={filteredDamages.map((d, i) => ({
              id: "d" + i,
              cells: [d.incidentId, d.damageType, d.item, d.detail],
            }))}
          />
        </Card>

        {/* ตารางที่ 3: ช้างป่า */}
        <Card title="3. ตารางช้างป่า">
          <Table
            headers={["รหัสเหตุการณ์", "ประเภทบันทึก", "ชื่อช้าง/ชื่อฝูง", "รายละเอียด"]}
            rows={filteredElephants.map((e, i) => ({
              id: "e" + i,
              cells: [e.incidentId, e.recordType, e.elephantName || e.herdName, e.detail],
            }))}
          />
        </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ flex: "1 1 140px" }}>
      <div className="text-[11.5px] font-semibold text-stone-600 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4.5 mb-4">
      <div className="text-sm font-semibold text-stone-900 mb-2.5">{title}</div>
      {children}
    </div>
  );
}

function Table({ headers, rows, selectable, selectedIds, onToggle }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-[1.5px] border-stone-200 text-stone-500 text-left">
            {headers.map((h) => (
              <th key={h} className="py-1.5 px-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-6 text-center text-stone-400">
                ไม่มีข้อมูล
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const isSelected = selectable && selectedIds.has(row.id);
              return (
                <tr
                  key={row.id}
                  onClick={selectable ? () => onToggle(row.id) : undefined}
                  className="border-b border-stone-100"
                  style={{
                    cursor: selectable ? "pointer" : "default",
                    background: isSelected ? "#FBF3EA" : "transparent",
                    borderLeft: isSelected ? "3px solid #B6742A" : "3px solid transparent",
                  }}
                >
                  {row.cells.map((c, idx) => (
                    <td key={idx} className="py-2 px-2 text-stone-700">
                      {c}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ReportDashboard;