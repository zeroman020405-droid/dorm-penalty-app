import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const signUp = async () => {
    setMessage("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("회원가입 완료. 관리자 승인 전에는 통계만 확인할 수 있습니다.");
  };

  const signIn = async () => {
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      return;
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>기숙사 상벌점 관리</h2>

        <input
          style={styles.input}
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={signIn}>로그인</button>
          <button onClick={signUp}>회원가입</button>
        </div>

        {message && <div style={{ marginTop: 12 }}>{message}</div>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f8fafc",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 16,
    padding: 24,
  },
  input: {
    width: "100%",
    marginBottom: 12,
    padding: 10,
    boxSizing: "border-box",
  },
};