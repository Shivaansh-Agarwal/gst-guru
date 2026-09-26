"use client";
import { useState } from "react";
import type { Video } from "@/lib/content";

const KIND: Record<Video["kind"], string> = {
  official: "Official",
  professional: "Professional body",
  educator: "CA educator",
  course: "Paid course",
};

/** Video cards that load nothing from YouTube until you press play, then play in place. */
export default function VideoShelf({ videos }: { videos: Video[] }) {
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <ul className="video-grid">
      {videos.map((v) => {
        const key = v.youtube ?? v.url!;
        const href = v.youtube ? `https://www.youtube.com/watch?v=${v.youtube}` : v.url!;
        const isPlaying = playing === v.youtube;
        return (
          <li key={key} className={`video-card ${v.kind}`}>
            {v.youtube ? (
              isPlaying ? (
                <div className="video-frame">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${v.youtube}?autoplay=1&rel=0`}
                    title={v.title}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                </div>
              ) : (
                <button type="button" className="video-screen" onClick={() => setPlaying(v.youtube!)} aria-label={`Play here: ${v.title}`}>
                  <span className="video-play" aria-hidden>
                    ▶
                  </span>
                  <span className="video-hint">Play here</span>
                </button>
              )
            ) : (
              <a className="video-screen course" href={href} target="_blank" rel="noopener noreferrer">
                <span className="video-play" aria-hidden>
                  ↗
                </span>
                <span className="video-hint">Open course on Udemy</span>
              </a>
            )}
            <div className="video-info">
              <p className="video-badges">
                <span className={`video-kind ${v.kind}`}>{KIND[v.kind]}</span>
                {v.lang && <span className="video-lang">{v.lang}</span>}
              </p>
              <p className="video-title">{v.title}</p>
              <p className="video-channel">
                {v.channel} ·{" "}
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {v.youtube ? "Open on YouTube" : "Open on Udemy"} <span aria-hidden>↗</span>
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
