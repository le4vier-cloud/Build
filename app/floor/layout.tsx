export default function FloorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#141414",
        color: "#F0F0F0",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
