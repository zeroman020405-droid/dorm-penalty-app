import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return session ? <Dashboard session={session} /> : <AuthPage />;
}