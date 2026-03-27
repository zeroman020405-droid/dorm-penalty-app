import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import RecordsTab from "./RecordsTab";
import StudentsTab from "./StudentsTab";
import RulesTab from "./RulesTab";
import SummaryTab from "./SummaryTab";
import UsersTab from "./UsersTab";

export default function Dashboard({ session }) {
  const [tab, setTab] = useState("summary");
  const [profile, setProfile] = useState(null);

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!error) setProfile(data);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === "admin";
  const canInput = isAdmin || profile?.can_input === true;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "#f8fafc",
        padding: "80px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0 }}>상산드림관 상벌점 관리</h1>
            <div style={{ marginTop: 6, fontSize: 14 }}>
              {profile?.name || session.user.email} / {isAdmin ? "관리자" : canInput ? "입력 승인" : "조회 전용"}
            </div>
          </div>
          <button onClick={handleLogout}>로그아웃</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          {canInput && (
            <button onClick={() => setTab("records")} style={{ marginRight: 8 }}>
              벌점 입력
            </button>
          )}

          {isAdmin && (
            <>
              <button onClick={() => setTab("students")} style={{ marginRight: 8 }}>
                학생 관리
              </button>
              <button onClick={() => setTab("rules")} style={{ marginRight: 8 }}>
                벌점 기준
              </button>
              <button onClick={() => setTab("users")} style={{ marginRight: 8 }}>
                회원 승인
              </button>
            </>
          )}

          <button onClick={() => setTab("summary")}>집계</button>
        </div>

        <hr />

        <div style={{ marginTop: 20 }}>
          {tab === "records" && canInput && <RecordsTab isAdmin={isAdmin} />}
          {tab === "students" && isAdmin && <StudentsTab />}
          {tab === "rules" && isAdmin && <RulesTab />}
          {tab === "users" && isAdmin && <UsersTab currentUserId={session.user.id} />}
          {tab === "summary" && <SummaryTab />}
        </div>
      </div>
    </div>
  );
}