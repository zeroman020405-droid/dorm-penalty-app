import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

export default function RewardRecordsTab({ isAdmin }) {
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

    const { data: rulesData } = await supabase
      .from("reward_rules")
      .select("*")
      .eq("is_active", true)
      .order("title");

    const { data: recordsData, error } = await supabase
      .from("reward_records")
      .select("*, students(name, grade, class_name, room), reward_rules(title)")
      .order("date", { ascending: false });

    if (error) {
      setMessage(`기록 조회 실패: ${error.message}`);
    }

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
      setMessage("학생과 상점 항목을 모두 선택해야 합니다.");
      return;
    }

    const rule = rules.find((r) => String(r.id) === String(ruleId));
    if (!rule) {
      setMessage("선택한 상점 항목을 찾을 수 없습니다.");
      return;
    }

    const { error } = await supabase.from("reward_records").insert([
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
    setMessage("상점 저장 완료");
    load();
  };

  const removeRecord = async (id) => {
    const ok = window.confirm("이 상점 기록을 삭제하시겠습니까?");
    if (!ok) return;

    const { error } = await supabase
      .from("reward_records")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(`삭제 실패: ${error.message}`);
      return;
    }

    setMessage("상점 기록 삭제 완료");
    load();
  };

  const downloadExcel = () => {
    const data = records.map((r) => ({
      날짜: r.date,
      학년: r.students?.grade ?? "",
      반: r.students?.class_name ?? "",
      이름: r.students?.name ?? "",
      방번호: r.students?.room ?? "",
      상점사항: r.reward_rules?.title ?? "",
      상점: r.points ?? "",
      조치: r.action_text ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "상점기록");
    XLSX.writeFile(workbook, "상점_전체기록.xlsx");
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h2>상점 입력</h2>

      <div style={{ marginBottom: 16 }}>
        <select
          id="reward-studentId"
          name="reward-studentId"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          style={{ marginRight: 8 }}
        >
          <option value="">학생 선택</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.grade ?? "-"}학년 {s.class_name ?? "-"}반 {s.name} ({s.room ?? "-"}호)
            </option>
          ))}
        </select>

        <select
          id="reward-ruleId"
          name="reward-ruleId"
          value={ruleId}
          onChange={(e) => setRuleId(e.target.value)}
          style={{ marginRight: 8 }}
        >
          <option value="">상점 항목 선택</option>
          {rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
              {r.points !== null && r.points !== undefined ? ` (${r.points}점)` : ""}
              {r.action_text ? ` / ${r.action_text}` : ""}
            </option>
          ))}
        </select>

        <button onClick={add} style={{ marginRight: 8 }}>
          저장
        </button>

        <button onClick={downloadExcel}>상점 기록 다운로드</button>
      </div>

      {message && <div style={{ marginBottom: 16 }}>{message}</div>}

      <h3>상점 기록 목록</h3>
      {records.length === 0 ? (
        <div>상점 기록 없음</div>
      ) : (
        records.map((r) => (
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
              {r.date} / {r.students?.grade ?? "-"}학년 {r.students?.class_name ?? "-"}반{" "}
              {r.students?.name || "-"} / {r.reward_rules?.title || "-"}
              {r.points !== null && r.points !== undefined ? ` / ${r.points}점` : ""}
              {r.action_text ? ` / ${r.action_text}` : ""}
            </div>

            {isAdmin && (
              <button onClick={() => removeRecord(r.id)}>삭제</button>
            )}
          </div>
        ))
      )}
    </div>
  );
}