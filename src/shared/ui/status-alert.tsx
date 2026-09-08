export function StatusAlert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "success" | "info" }) {
  return <div className={`status-alert status-alert--${tone}`} role={tone === "error" ? "alert" : "status"}><span aria-hidden>{tone === "error" ? "!" : tone === "success" ? "✓" : "i"}</span><p>{children}</p></div>;
}
