export const metadata = { title: 'Nobody home · GitRoom' };

export default function NotFound() {
  return (
    <main className="lost grass">
      <div className="plaque lost-card">
        <span className="lost-code">404</span>
        <h1>Nobody home</h1>
        <p>This address doesn&apos;t lead to a house. GitHub usernames use letters, numbers and single dashes.</p>
        <a className="btn hot" href="/">Build a house</a>
      </div>
    </main>
  );
}
