import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function SummaryTab() {
  const [records, setRecords] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const load = async () => {
    const { data } = await supabase
      .from("records")
      .select("*, students(name, grade, class_name, room), rules(title)")
      .order("date", { ascending: false });

    setRecords(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const summary = {};
  records.forEach((r) => {
    const key = r.student_id;
    if (!summary[key]) {
      summary[key] = {
        student_id: r.student_id,
        name: r.students?.name || "이름없음",
        grade: r.students?.grade,
        class_name: r.students?.class_name,
        room: r.students?.room,
        total: 0,
      };
    }
    summary[key].total += Number(r.points || 0);
  });

  const selectedRecords = records.filter(
    (r) => r.student_id === selectedStudent?.student_id
  );

  return (
    <div style={{ marginTop: 20 }}>
      <h2>집계</h2>
      <button onClick={downloadSummaryExcel} style={{ marginBottom: 12 }}>
  집계 엑셀 다운로드
</button>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {Object.values(summary).map((item) => (
            <div key={item.student_id} style={{ marginBottom: 8 }}>
              <button
                onClick={() => setSelectedStudent(item)}
                style={{
                  border: "1px solid #ddd",
                  background: "white",
                  padding: 8,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {item.grade ?? "-"}학년 {item.class_name ?? "-"}반 {item.name} ({item.room ?? "-"}호) : {item.total}점
              </button>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, border: "1px solid #ddd", padding: 12, minHeight: 200 }}>
          {!selectedStudent && <div>학생 이름을 누르면 벌점 내역이 보입니다.</div>}

          {selectedStudent && (
            <>
              <h3 style={{ marginTop: 0 }}>
                {selectedStudent.grade ?? "-"}학년 {selectedStudent.class_name ?? "-"}반 {selectedStudent.name}
              </h3>

              {selectedRecords.length === 0 && <div>내역 없음</div>}

              {selectedRecords.map((r) => (
                <div key={r.id} style={{ marginBottom: 8 }}>
                  {r.date} / {r.rules?.title || "-"}
                  {r.points !== null && r.points !== undefined ? ` / ${r.points}점` : ""}
                  {r.action_text ? ` / ${r.action_text}` : ""}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const downloadSummaryExcel = () => {
  const data = Object.values(summary).map((item) => ({
    학년: item.grade ?? "",
    반: item.class_name ?? "",
    이름: item.name,
    방번호: item.room ?? "",
    총벌점: item.total,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "집계");

  XLSX.writeFile(workbook, "벌점_집계.xlsx");
};