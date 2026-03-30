import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";

export default function SummaryTab() {
  const [penaltyRecords, setPenaltyRecords] = useState([]);
  const [rewardRecords, setRewardRecords] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [message, setMessage] = useState("");
  const [canDelete, setCanDelete] = useState(false);

  const loadPermission = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, can_input")
      .eq("id", user.id)
      .single();

    if (!error && profile) {
      setCanDelete(profile.role === "admin" || profile.can_input === true);
    }
  };

  const load = async () => {
    const { data: penaltyData } = await supabase
      .from("records")
      .select("*, students(name, grade, class_name, room), rules(title)")
      .order("date", { ascending: false });

    const { data: rewardData } = await supabase
      .from("reward_records")
      .select("*, students(name, grade, class_name, room), reward_rules(title)")
      .order("date", { ascending: false });

    setPenaltyRecords(penaltyData || []);
    setRewardRecords(rewardData || []);
  };

  useEffect(() => {
    load();
    loadPermission();
  }, []);

  const formatSignedPoints = (value) => {
    const num = Number(value || 0);
    if (num > 0) return `+${num}점`;
    if (num < 0) return `${num}점`;
    return "0점";
  };

  const removePenaltyRecord = async (id) => {
    const ok = window.confirm("이 벌점 기록을 삭제하시겠습니까?");
    if (!ok) return;

    const { error } = await supabase
      .from("records")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(`벌점 기록 삭제 실패: ${error.message}`);
      return;
    }

    setMessage("벌점 기록 삭제 완료");
    await load();
  };

  const removeRewardRecord = async (id) => {
    const ok = window.confirm("이 상점 기록을 삭제하시겠습니까?");
    if (!ok) return;

    const { error } = await supabase
      .from("reward_records")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(`상점 기록 삭제 실패: ${error.message}`);
      return;
    }

    setMessage("상점 기록 삭제 완료");
    await load();
  };

  const summary = {};

  penaltyRecords.forEach((r) => {
    const key = r.student_id;
    if (!summary[key]) {
      summary[key] = {
        student_id: r.student_id,
        name: r.students?.name || "이름없음",
        grade: r.students?.grade,
        class_name: r.students?.class_name,
        room: r.students?.room,
        penaltyTotal: 0,
        rewardTotal: 0,
      };
    }
    summary[key].penaltyTotal += Number(r.points || 0);
  });

  rewardRecords.forEach((r) => {
    const key = r.student_id;
    if (!summary[key]) {
      summary[key] = {
        student_id: r.student_id,
        name: r.students?.name || "이름없음",
        grade: r.students?.grade,
        class_name: r.students?.class_name,
        room: r.students?.room,
        penaltyTotal: 0,
        rewardTotal: 0,
      };
    }
    summary[key].rewardTotal += Number(r.points || 0);
  });

  const summaryList = Object.values(summary).map((item) => ({
    ...item,
    total: item.rewardTotal - item.penaltyTotal,
  }));

  const selectedPenaltyRecords = penaltyRecords.filter(
    (r) => r.student_id === selectedStudent?.student_id
  );

  const selectedRewardRecords = rewardRecords.filter(
    (r) => r.student_id === selectedStudent?.student_id
  );

  const downloadSummaryExcel = () => {
    const data = summaryList.map((item) => ({
      학년: item.grade ?? "",
      반: item.class_name ?? "",
      이름: item.name,
      방번호: item.room ?? "",
      벌점합: item.penaltyTotal,
      상점합: item.rewardTotal,
      총합: item.total,
      표시: formatSignedPoints(item.total),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "집계");
    XLSX.writeFile(workbook, "상벌점_집계.xlsx");
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h2>집계</h2>

      <button onClick={downloadSummaryExcel} style={{ marginBottom: 12 }}>
        집계 엑셀 다운로드
      </button>

      {message && <div style={{ marginBottom: 12 }}>{message}</div>}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          {summaryList.map((item) => (
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
                {item.grade ?? "-"}학년 {item.class_name ?? "-"}반 {item.name} ({item.room ?? "-"}호)
                {" / "}벌점 {item.penaltyTotal}점
                {" / "}상점 {item.rewardTotal}점
                {" / "}총합 {formatSignedPoints(item.total)}
              </button>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, border: "1px solid #ddd", padding: 12, minHeight: 240 }}>
          {!selectedStudent && <div>학생 이름을 누르면 상벌점 내역이 보입니다.</div>}

          {selectedStudent && (
            <>
              <h3 style={{ marginTop: 0 }}>
                {selectedStudent.grade ?? "-"}학년 {selectedStudent.class_name ?? "-"}반 {selectedStudent.name}
              </h3>

              <div style={{ marginBottom: 12 }}>
                벌점 합: {selectedStudent.penaltyTotal}점 / 상점 합: {selectedStudent.rewardTotal}점 / 총합: {formatSignedPoints(selectedStudent.total)}
              </div>

              <h4>벌점 내역</h4>
              {selectedPenaltyRecords.length === 0 && <div>벌점 내역 없음</div>}
              {selectedPenaltyRecords.map((r) => (
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
                    {r.date} / {r.rules?.title || "-"}
                    {r.points !== null && r.points !== undefined ? ` / -${Number(r.points)}점` : ""}
                    {r.action_text ? ` / ${r.action_text}` : ""}
                  </div>

                  {canDelete && (
                    <button onClick={() => removePenaltyRecord(r.id)}>삭제</button>
                  )}
                </div>
              ))}

              <h4 style={{ marginTop: 16 }}>상점 내역</h4>
              {selectedRewardRecords.length === 0 && <div>상점 내역 없음</div>}
              {selectedRewardRecords.map((r) => (
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
                    {r.date} / {r.reward_rules?.title || "-"}
                    {r.points !== null && r.points !== undefined ? ` / +${Number(r.points)}점` : ""}
                    {r.action_text ? ` / ${r.action_text}` : ""}
                  </div>

                  {canDelete && (
                    <button onClick={() => removeRewardRecord(r.id)}>삭제</button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}