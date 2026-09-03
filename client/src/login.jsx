import React, { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save JWT token
      localStorage.setItem("syncspace_token", data.token);

      // Save user information
      localStorage.setItem(
        "syncspace_user",
        JSON.stringify(data.user)
      );

      // Tell App that login was successful
      onLogin(data.user);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0f172a",
        padding: "20px",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#1e293b",
          padding: "35px",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <h1
          style={{
            color: "white",
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          SyncSpace
        </h1>

        <p
          style={{
            color: "#94a3b8",
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          Sign in to continue
        </p>

        <label style={{ color: "white" }}>
          Email
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter your email"
          required
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            marginBottom: "20px",
            borderRadius: "8px",
            border: "1px solid #475569",
            boxSizing: "border-box",
            fontSize: "15px",
          }}
        />

        <label style={{ color: "white" }}>
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          required
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            marginBottom: "20px",
            borderRadius: "8px",
            border: "1px solid #475569",
            boxSizing: "border-box",
            fontSize: "15px",
          }}
        />

        {error && (
          <div
            style={{
              background: "#7f1d1d",
              color: "#fecaca",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "15px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p
          style={{
            color: "#64748b",
            textAlign: "center",
            marginTop: "20px",
            fontSize: "13px",
          }}
        >
          Week 4 • JWT Authentication
        </p>
      </form>
    </div>
  );
}

export default Login;