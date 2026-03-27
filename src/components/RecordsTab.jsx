import * as XLSX from "xlsx";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RecordsTab({ isAdmin }) {
  const [students, setStudents] = useState([]);
  const [rules, setRules] = useState([]);
  const [records, setRecords] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const { data: studentsData } = await supabase
    .from("students")
    .select("*")
    .eq("status", "재학")
    .order("grade", { ascending: true })
    .order("class_name", { ascending: true })
    .order("name", { ascending: true });  

    const { data: rulesData } = await supabase.from("rules").select("*").order("title");

    const { data: recordsData, error: recordsError } = await supabase
      .from("records")
      .select("*, students(name, grade, class_name, room), rules(title)")
      .order("date", { ascending: false });

    if (recordsError) setMessage(`기록 조회 실패: ${recordsError.message}`);

    setStudents(studentsData || []);
    setRules(rulesData || []);
    setRecords(recordsData || []);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setMessage("");

    if (!studentId || !ruleId) {
      setMessage("학생과 항목을 모두 선택해야 합니다.");
      return;
    }

    const rule = rules.find((r) => String(r.id) === String(ruleId));
    if (!rule) {
      setMessage("선택한 항목을 찾을 수 없습니다.");
      return;
    }

    const { error } = await supabase.from("records").insert([
      {
        student_id: studentId,
        rule_id: ruleId,
        points: rule.points ?? null,
        action_text: rule.action_text ?? null,
      },
    ]);

    if (error) {
      setMessage(`저장 실패: ${error.message}`);
      return;
    }

    setStudentId("");
    setRuleId("");
    setMessage("저장 완료");
    load();
  };

  const removeRecord = async (id) => {
    if (!window.confirm("이 벌점 기록을 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("records").delete().eq("id", id);
    if (error) {
      setMessage(`삭제 실패: ${error.message}`);
      return;
    }

    setMessage("삭제 완료");
    load();
  };

const removeAllRecords = async () => {
  const ok = window.confirm(
    "학기말 벌점 전체 삭제를 진행하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
  );
  if (!ok) return;

  const { error } = await supabase
    .from("records")
    .delete()
    .not("id", "is", null);

  if (error) {
    console.error(error);
    setMessage(`전체 삭제 실패: ${error.message}`);
    return;
  }

  setMessage("벌점 전체 삭제 완료");
  await load();
};

  return (
    <div style={{ marginTop: 20 }}>
      <h2>벌점 입력</h2>

      <div style={{ marginBottom: 16 }}>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ marginRight: 8 }}>
          <option value="">학생 선택</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.grade ?? "-"}학년 {s.class_name ?? "-"}반 {s.name} ({s.room ?? "-"}호)
            </option>
          ))}
        </select>

        <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} style={{ marginRight: 8 }}>
          <option value="">항목 선택</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
              {r.points !== null && r.points !== undefined ? ` (${r.points}점)` : ""}
              {r.action_text ? ` / ${r.action_text}` : ""}
            </option>
          ))}
        </select>

        <button onClick={add} style={{ marginRight: 8 }}>저장</button>

        {isAdmin && (
          <button onClick={removeAllRecords} style={{ background: "#b91c1c", color: "white" }}>
            벌점 전체 삭제
          </button>
        )}
      </div>

      {message && <div style={{ marginBottom: 16 }}>{message}</div>}

      <h3>기록 목록</h3>
      {records.map((r) => (
        <div
          key={r.id}
          style={{
            marginBottom: 8,
            padding: 8,
            border: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {r.date} / {r.students?.grade ?? "-"}학년 {r.students?.class_name ?? "-"}반 {r.students?.name || "-"} / {r.rules?.title || "-"}
            {r.points !== null && r.points !== undefined ? ` / ${r.points}점` : ""}
            {r.action_text ? ` / ${r.action_text}` : ""}
          </div>
          <button onClick={() => removeRecord(r.id)}>삭제</button>
        </div>
      ))}
    </div>
  );
}
