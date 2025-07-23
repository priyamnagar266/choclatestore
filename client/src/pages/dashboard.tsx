import React, { useEffect, useState } from "react";
import { useAuth } from "../components/auth-context";
import { getMeApi } from "../lib/auth";

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const data = await getMeApi(user.token);
        setProfile(data.user);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  if (!user) return <div className="p-8">Please log in to view your dashboard.</div>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-4">User Dashboard</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {profile && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <div><strong>Name:</strong> {profile.name}</div>
          <div><strong>Email:</strong> {profile.email}</div>
          <div><strong>Role:</strong> {profile.role}</div>
        </div>
      )}
      <button className="button bg-red-600 text-white" onClick={logout}>Logout</button>
    </div>
  );
}
