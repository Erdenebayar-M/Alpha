"use client";

/**
 * TT1 variant — large photo with an inline audio pill, then text choice rows.
 * Covers "Сонсоод сонгох" (hear + choose spelling): photo of subject at top,
 * audio cue overlaid on image, text spelling options below.
 */

import { useState } from "react";
import Image from "next/image";
import { ScreenShell } from "../ScreenShell";
import { ActionButton } from "../ActionButton";
import { FeedbackBanner } from "../FeedbackBanner";
import { ChoiceRow } from "../ChoiceRow";
import type { RowStatus } from "../ChoiceRow";
import type { BaseScreenProps } from "../types";

export interface SpellingChoice {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface ListenPickTextScreenProps extends BaseScreenProps {
  title?: string;
  imageUrl?: string;
  imageAlt?: string;
  audioHint?: string;
  choices: SpellingChoice[];
  onAudio?: () => void;
}

export function ListenPickTextScreen({
  progress,
  stage,
  navItems,
  assets,
  onComplete,
  title = "Сонсоод сонгох",
  imageUrl,
  imageAlt = "",
  audioHint = "Анхааралтай сонсоорой",
  choices,
  onAudio,
}: ListenPickTextScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedChoice = choices.find((c) => c.id === selectedId);
  const isCorrect = submitted && (selectedChoice?.isCorrect ?? false);

  function getRowStatus(choice: SpellingChoice): RowStatus {
    if (!submitted) return selectedId === choice.id ? "selected" : "idle";
    if (choice.id === selectedId) return choice.isCorrect ? "correct" : "wrong";
    return "idle";
  }

  function handleAudio() {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 1200);
    onAudio?.();
  }

  function handleNext() {
    setSelectedId(null);
    setSubmitted(false);
    onComplete?.();
  }

  return (
    <ScreenShell
      title={title}
      progress={progress}
      stage={stage}
      backIconUrl={assets.backIcon}
      navItems={navItems}
      footer={
        <div style={{ padding: "10px 20px 8px" }}>
          {submitted ? (
            <ActionButton
              label="Дараагийнх"
              variant="next"
              onClick={handleNext}
            />
          ) : (
            <ActionButton
              label="Шалгах"
              onClick={() => {
                if (selectedId) setSubmitted(true);
              }}
              disabled={!selectedId}
            />
          )}
        </div>
      }
    >
      {/* ── Photo with audio pill overlay ─────────────────────────────────── */}
      <div
        style={{
          marginTop: "24px",
          width: "min(342px, calc(100% - 32px))",
          borderRadius: "28px",
          overflow: "hidden",
          background: "#E9F1FF",
          aspectRatio: "4/3",
          position: "relative",
          boxShadow: "0 4px 20px rgba(0,97,143,0.06)",
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            unoptimized
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "80px",
            }}
          >
            🐻
          </div>
        )}

        {/* Audio pill — centred on bottom edge of the photo */}
        <button
          onClick={handleAudio}
          aria-label="Дуу тоглуулах"
          style={{
            position: "absolute",
            bottom: "14px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "none",
            borderRadius: "9999px",
            padding: "6px 16px 6px 6px",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
          }}
        >
          {/* Mini gradient audio circle */}
          <span
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "9999px",
              background:
                "linear-gradient(135.18deg, #00618F 0%, #31B2FB 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transform: isPlaying ? "scale(0.88)" : "scale(1)",
              transition: "transform 0.15s ease",
            }}
          >
            <Image
              src={assets.audioIcon}
              alt=""
              width={14}
              height={14}
              unoptimized
            />
          </span>

          <span
            style={{
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 700,
              fontSize: "13px",
              color: "#01618F",
            }}
          >
            {audioHint}
          </span>
        </button>
      </div>

      {/* ── Text choice rows ──────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: "20px",
          width: "min(342px, calc(100% - 32px))",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          paddingBottom: "8px",
        }}
      >
        {choices.map((choice) => (
          <ChoiceRow
            key={choice.id}
            label={choice.label}
            status={getRowStatus(choice)}
            badgeCheckUrl={assets.checkmark}
            badgeCrossUrl={assets.cross}
            onClick={() => !submitted && setSelectedId(choice.id)}
          />
        ))}
      </div>

      {submitted && (
        <FeedbackBanner
          isCorrect={isCorrect}
          correctAnswer={
            isCorrect ? undefined : choices.find((c) => c.isCorrect)?.label
          }
          checkmarkUrl={assets.checkmark}
          crossUrl={assets.cross}
        />
      )}
    </ScreenShell>
  );
}
