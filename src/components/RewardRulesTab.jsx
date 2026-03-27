import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RewardRulesTab() {
  const [rules, setRules] = useState([]);
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("");
  const [actionText, setActionText] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("reward_rules")
      .select("*")
      .order("title", { ascending: true });

    if (error) {
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
      setMessage("상점 항목명을 입력해야 합니다.");
      return;
    }

    if (points === "" && !actionText.trim()) {
      setMessage("상점 점수 또는 조치 내용을 입력해야 합니다.");
      return;
    }

    const payload = {
      title: title.trim(),
      points: points === "" ? null : Number(points),
      action_text: actionText.trim() || null,
      is_active: true,
    };

    let error = null;

    if (editingId) {
      const result = await supabase
        .from("reward_rules")
        .update(payload)
        .eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase
        .from("reward_rules")
        .insert([payload]);
      error = result.error;
    }

    if (error) {
      setMessage(`저장 실패: ${error.message}`);
      return;
    }

    setMessage(editingId ? "상점 기준 수정 완료" : "상점 기준 추가 완료");
    resetForm();
    load();
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setTitle(rule.title || "");
    setPoints(rule.points ?? "");
    setActionText(rule.action_text || "");
    setMessage("");
  };

  const deactivateRule = async (id) => {
    const ok = window.confirm("이 상점 기준을 더 이상 사용하지 않겠습니까?");
    if (!ok) return;

    const { error } = await supabase
      .from("reward_rules")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      setMessage(`처리 실패: ${error.message}`);
      return;
    }

    setMessage("사용중지 완료");
    if (editingId === id) resetForm();
    load();
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h2>상점 기준</h2>

      <div style={{ marginBottom: 16 }}>
        <input
          id="reward-title"
          name="reward-title"
          placeholder="상점 항목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          id="reward-points"
          name="reward-points"
          placeholder="상점 점수"
          type="number"
          step="0.1"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          id="reward-actionText"
          name="reward-actionText"
          placeholder="조치 내용"
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={addOrUpdate} style={{ marginRight: 8 }}>
          {editingId ? "수정 저장" : "추가"}
        </button>
        {editingId && <button onClick={resetForm}>취소</button>}
      </div>

      {message && <div style={{ marginBottom: 16 }}>{message}</div>}

      <h3>상점 기준 목록</h3>
      {rules.length === 0 ? (
        <div>상점 기준 없음</div>
      ) : (
        rules.map((r) => (
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
              {r.title}
              {r.points !== null && r.points !== undefined ? ` / ${r.points}점` : ""}
              {r.action_text ? ` / ${r.action_text}` : ""}
            </div>

            <div>
              <button onClick={() => startEdit(r)} style={{ marginRight: 8 }}>
                수정
              </button>
              <button onClick={() => deactivateRule(r.id)}>사용중지</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}