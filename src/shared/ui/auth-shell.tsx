export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__identity">
        <div className="wordmark wordmark--auth"><strong>عيادة الاستراتيجية والتنفيذ</strong><span>STRATEGY &amp; EXECUTION CLINIC</span></div>
      </div>
      <section className="auth-shell__panel">{children}</section>
    </div>
  );
}
