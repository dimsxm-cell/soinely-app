import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const alt = "Soinely — Le copilote des infirmiers libéraux";

const VIOLET_CHARTE = "#6A4CFF";

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
          background: "linear-gradient(135deg, #221b33 0%, #3a2260 60%, #6d28d9 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 140,
            height: 140,
            borderRadius: 40,
            background: VIOLET_CHARTE,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <svg width="88" height="88" viewBox="0 0 48 48">
            <path
              d="M24 42S5 29.5 5 17.6C5 11.2 9.9 6 16 6c3.7 0 7 1.9 8 4.8C25 7.9 28.3 6 32 6c6.1 0 11 5.2 11 11.6C43 29.5 24 42 24 42Z"
              fill="#ffffff"
            />
            <path d="M30 12h6v5h5v6h-5v5h-6v-5h-5v-6h5v-5Z" fill={VIOLET_CHARTE} />
          </svg>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
          }}
        >
          Soinely
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 32,
            fontWeight: 600,
            color: "#c9bdf0",
          }}
        >
          Le copilote des infirmiers libéraux
        </div>
      </div>
    ),
    { ...size }
  );
}
