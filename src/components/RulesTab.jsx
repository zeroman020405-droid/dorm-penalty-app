import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

export default function RulesTab() {
  const [rules, setRules] = useState([]);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");
  const [actionText, setActionText] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("rules")
      .select("*")
      .order("title");

    if (error) {
      console.error("rules 조회 오류:", error);
      setMessage(`불러오기 실패: ${error.message}`);
      return;
    }

    setRules(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitle("");
    setPoints("");
    setActionText("");
    setEditingId(null);
  };

  const addOrUpdate = async () => {
    setMessage("");

    if (!title.trim()) {
      setMessage("위반사항을 입력해야 합니다.");
      return;
    }

    if (points === "" && !actionText.trim()) {
      setMessage("벌점 또는 처벌 내용을 입력해야 합니다.");
      return;
    }

    const payload = {
      title: title.trim(),
      points: points === "" ? null : Number(points),
      action_text: actionText.trim() || null,
    };

    let error;

    if (editingId) {
      const result = await supabase.from("rules").update(payload).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("rules").insert([payload]);
      error = result.error;
    }

    if (error) {
      console.error("rules 저장 오류:", error);
      setMessage(`저장 실패: ${error.message}`);
      return;
    }

    setMessage(editingId ? "벌점 기준 수정 완료" : "벌점 기준 추가 완료");
    resetForm();
    await load();
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setTitle(rule.title || "");
    setPoints(rule.points ?? "");
    setActionText(rule.action_text || "");
    setMessage("");
  };

  const deactivateRule = async (id) => {
    const ok = window.confirm("이 벌점 기준을 더 이상 사용하지 않겠습니까?");
    if (!ok) return;

    const { error } = await supabase
      .from("rules")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("rules 비활성화 오류:", error);
      setMessage(`처리 실패: ${error.message}`);
      return;
    }

    setMessage("사용중지 완료");
    if (editingId === id) resetForm();
    await load();
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const payload = rows
        .filter((row) => row["위반사항"])
        .map((row) => {
          const rawValue = row["벌점/처벌"];
          const textValue = rawValue === undefined || rawValue === null ? "" : String(rawValue).trim();

          let parsedPoints = null;
          let parsedActionText = null;

          if (textValue !== "") {
            const numericPattern = /^-?\d+(\.\d+)?$/;
            if (numericPattern.test(textValue)) {
              parsedPoints = Number(textValue);
            } else {
              parsedActionText = textValue;
            }
          }

          return {
            title: String(row["위반사항"]).trim(),
            points: parsedPoints,
            action_text: parsedActionText,
          };
        })
        .filter((item) => item.title);

      if (payload.length === 0) {
        setMessage("엑셀에서 등록할 벌점 기준을 찾지 못했습니다.");
        return;
      }

      const { error } = await supabase.from("rules").insert(payload);

      if (error) {
        console.error("rules 엑셀 업로드 오류:", error);
        setMessage(`엑셀 업로드 실패: ${error.message}`);
        return;
      }

      setMessage(`엑셀 업로드 완료: ${payload.length}건 등록`);
      await load();
    } catch (error) {
      console.error(error);
      setMessage("엑셀 파일 처리 중 오류가 발생했습니다.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h2>벌점 기준</h2>

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="위반사항"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="벌점(숫자)"
          type="number"
          step="0.1"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="처벌 내용(예: 퇴사, 학생부 회부)"
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
          style={{ marginRight: 8, width: 260 }}
        />
        <button onClick={addOrUpdate} style={{ marginRight: 8 }}>
          {editingId ? "수정 저장" : "추가"}
        </button>
        {editingId && <button onClick={resetForm}>취소</button>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} />
        <div style={{ marginTop: 6, fontSize: 14 }}>
          엑셀 컬럼명: 순번 / 위반사항 / 벌점/처벌
        </div>
      </div>

      {message && <div style={{ marginBottom: 16 }}>{message}</div>}

      <h3>벌점 기준 목록</h3>
      {rules.length === 0 && <div>기준 없음</div>}

      {rules.map((r) => (
        <div
          key={r.id}
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
            <strong>{r.title}</strong>
            {r.points !== null && r.points !== undefined && <span> / {r.points}점</span>}
            {r.action_text && <span> / {r.action_text}</span>}
          </div>

          <div>
            <button onClick={() => startEdit(r)} style={{ marginRight: 8 }}>
              수정
            </button>
            <button onClick={() => deactivateRule(r.id)}>사용중지</button>
          </div>
        </div>
      ))}
    </div>
  );
}

