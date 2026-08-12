export default function HomePage() {
  return (
    <main className="shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">North Jersey pilot</p>
        <h1 id="page-title">Find fish evidence near you.</h1>
        <p className="lede">
          Fish Nearby is being built to connect public records about fish
          species to the lakes and streams around you.
        </p>
        <div className="status" role="status">
          <span className="statusDot" aria-hidden="true" />
          The interactive map and verified pilot data are coming next.
        </div>
      </section>
    </main>
  );
}
