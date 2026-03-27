import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("email");

    if (error) {
      setMessage(error.message);
      return;
    }

    setUsers(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const approveInput = async (id, value) => {
    const { error } = await supabase
      .from("profiles")
      .update({ can_input: value })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(value ? "입력 권한 승인 완료" : "입력 권한 해제 완료");
    load();
  };

  const setAdmin = async (id) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin", can_input: true })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("관리자 지정 완료");
    load();
  };

  return (
    <div>
      <h2>회원 승인 관리</h2>
      {message && <div style={{ marginBottom: 12 }}>{message}</div>}

      {users.map((u) => (
        <div
          key={u.id}
          style={{
            border: "1px solid #ddd",
            padding: 10,
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {u.name || "-"} / {u.email} / {u.role} / {u.can_input ? "입력 가능" : "조회 전용"}
          </div>
          <div>
            <button
              onClick={() => approveInput(u.id, !u.can_input)}
              style={{ marginRight: 8 }}
            >
              {u.can_input ? "입력권한 해제" : "입력권한 승인"}
            </button>

            {u.id !== currentUserId && u.role !== "admin" && (
              <button onClick={() => setAdmin(u.id)}>관리자 지정</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}