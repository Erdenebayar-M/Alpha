import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: "linear-gradient(to bottom, #E5F1FD, #D3EFB5)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 160,
            height: 160,
            borderRadius: 999,
            background: "#2F5BE4",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 90, height: 90, borderRadius: 999, background: "#F8FBFF" }} />
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, color: "#2F5BE4" }}>ОРто</div>
        <div style={{ fontSize: 32, color: "#24428F", maxWidth: 800, textAlign: "center" }}>
          Хүүхдийн Монгол хэлний хөгжлийн үнэлгээ
        </div>
      </div>
    ),
    { ...size }
  );
}
