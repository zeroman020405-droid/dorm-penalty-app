import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

export default function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [className, setClassName] = useState("");
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("grade", { ascending: true })
      .order("class_name", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setMessage(`불러오기 실패: ${error.message}`);
      return;
    }

    setStudents(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) {
      setMessage("이름을 입력해야 합니다.");
      return;
    }

    const { error } = await supabase.from("students").insert([
      {
        name: name.trim(),
        grade: grade ? Number(grade) : null,
        class_name: className.trim() || null,
        room: room.trim() || null,
        status: "재학",
      },
    ]);

    if (error) {
      setMessage(`저장 실패: ${error.message}`);
      return;
    }

    setName("");
    setGrade("");
    setClassName("");
    setRoom("");
    setMessage("학생 추가 완료");
    load();
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const payload = rows
      .filter((row) => row["이름"])
      .map((row) => ({
        grade: row["학년"] ? Number(row["학년"]) : null,
        class_name: row["반"] ? String(row["반"]) : null,
        name: String(row["이름"]).trim(),
        room: row["방번호"] ? String(row["방번호"]) : null,
        status: "재학",
      }));

    if (payload.length === 0) {
      setMessage("엑셀에서 학생 데이터를 찾지 못했습니다.");
      return;
    }

    const { error } = await supabase.from("students").insert(payload);

    if (error) {
      setMessage(`엑셀 업로드 실패: ${error.message}`);
      return;
    }

    setMessage(`엑셀 업로드 완료: ${payload.length}명 등록`);
    load();
  };

  const removeStudent = async (id, studentName) => {
    const ok = window.confirm(
      `${studentName} 학생을 삭제하시겠습니까?\n관련 벌점 기록도 함께 삭제됩니다.`
    );
    if (!ok) return;

    setMessage("");

    const { error: recordsError } = await supabase
      .from("records")
      .delete()
      .eq("student_id", id);

    if (recordsError) {
      setMessage(`벌점 기록 삭제 실패: ${recordsError.message}`);
      return;
    }

    const { error: studentError } = await supabase
      .from("students")
      .delete()
      .eq("id", id);

    if (studentError) {
      setMessage(`학생 삭제 실패: ${studentError.message}`);
      return;
    }

    setMessage("학생 및 관련 벌점 기록 삭제 완료");
    load();
  };

  const markWithdrawn = async (id, studentName) => {
    const ok = window.confirm(`${studentName} 학생을 퇴사 처리하시겠습니까?`);
    if (!ok) return;

    const { error } = await supabase
      .from("students")
      .update({ status: "퇴사" })
      .eq("id", id);

    if (error) {
      setMessage(`퇴사 처리 실패: ${error.message}`);
      return;
    }

    setMessage("퇴사 처리 완료");
    load();
  };

  const markEnrolled = async (id, studentName) => {
    const ok = window.confirm(`${studentName} 학생을 재학 상태로 변경하시겠습니까?`);
    if (!ok) return;

    const { error } = await supabase
      .from("students")
      .update({ status: "재학" })
      .eq("id", id);

    if (error) {
      setMessage(`재학 처리 실패: ${error.message}`);
      return;
    }

    setMessage("재학 처리 완료");
    load();
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h2>학생 관리</h2>

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="학년"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="반"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="방번호"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={add}>추가</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
        <div style={{ marginTop: 6, fontSize: 14 }}>
          엑셀 컬럼명: 학년 / 반 / 이름 / 방번호
        </div>
      </div>

      {message && <div style={{ marginBottom: 16 }}>{message}</div>}

      <h3>학생 목록</h3>
      {students.map((s) => (
        <div
          key={s.id}
          style={{
            marginBottom: 8,
            padding: 8,
            border: "1px solid #ddd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div>
            {s.grade ?? "-"}학년 / {s.class_name ?? "-"}반 / {s.name} / {s.room ?? "-"}호 /{" "}
            <strong>{s.status ?? "재학"}</strong>
          </div>

          <div>
            {(s.status ?? "재학") === "재학" ? (
              <button
                onClick={() => markWithdrawn(s.id, s.name)}
                style={{ marginRight: 8 }}
              >
                퇴사 처리
              </button>
            ) : (
              <button
                onClick={() => markEnrolled(s.id, s.name)}
                style={{ marginRight: 8 }}
              >
                재학 처리
              </button>
            )}

            <button onClick={() => removeStudent(s.id, s.name)}>삭제</button>
          </div>
        </div>
      ))}
    </div>
  );
}