"use client";


import { useState } from "react";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [shortLink, setShortLink] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShortLink("");

    if (!url) {
      setError("Please enter a URL");
      return;
    }

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (res.ok) {
        setShortLink(data.shortUrl);
        setUrl("");
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "1rem" }}>TinyLink - URL Shortener</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            padding: "0.5rem",
            width: "300px",
            marginRight: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Generate
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: "1rem" }}>
          {error}
        </p>
      )}

      {shortLink && (
        <div style={{ marginTop: "1rem", color: "black" }}>
          <strong>Short Link: </strong>
          <a
            href={shortLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "blue" }}
          >
            {shortLink}
          </a>
        </div>
      )}
    </div>
  );
}
