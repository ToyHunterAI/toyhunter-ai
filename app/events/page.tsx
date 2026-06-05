const events = [
  {
    title: "Toy & Collectors Fair",
    location: "Houten, Netherlands",
    country: "Netherlands",
    date: "Coming soon",
    type: "Toy Fair",
  },
  {
    title: "Vintage Toy Market",
    location: "Utrecht, Netherlands",
    country: "Netherlands",
    date: "Coming soon",
    type: "Vintage Market",
  },
  {
    title: "Comic & Collectors Convention",
    location: "Den Bosch, Netherlands",
    country: "Netherlands",
    date: "Coming soon",
    type: "Comic Con",
  },
  {
    title: "Retro Gaming & Toy Event",
    location: "Antwerp, Belgium",
    country: "Belgium",
    date: "Coming soon",
    type: "Retro Event",
  },
  {
    title: "Collectors Toy Show",
    location: "Germany",
    country: "Germany",
    date: "Coming soon",
    type: "Toy Show",
  },
];

export default function EventsPage() {
  return (
    <main style={pageStyle}>
      <section style={headerStyle}>
        <p style={eyebrowStyle}>ToyHunter AI</p>

        <h1 style={titleStyle}>
          Toy <span style={{ color: "#22d3ee" }}>Events.</span>
        </h1>

        <p style={subtitleStyle}>
          Discover toy fairs, collector conventions, vintage toy markets and
          retro gaming events.
        </p>
      </section>

      <section style={filterPanelStyle}>
        <button style={activeFilterStyle}>Netherlands</button>
        <button style={filterStyle}>Belgium</button>
        <button style={filterStyle}>Germany</button>
        <button style={filterStyle}>All Events</button>
      </section>

      <section style={gridStyle}>
        {events.map((event) => (
          <article key={event.title} style={eventCardStyle}>
            <p style={eventTypeStyle}>{event.type}</p>

            <h2 style={eventTitleStyle}>{event.title}</h2>

            <p style={eventInfoStyle}>{event.location}</p>
            <p style={eventDateStyle}>{event.date}</p>

            <button style={eventButtonStyle}>Website coming soon</button>
          </article>
        ))}
      </section>

      <section style={futurePanelStyle}>
        <h2 style={futureTitleStyle}>Automatic Event Finder</h2>

        <p style={futureTextStyle}>
          Later, ToyHunter will automatically collect upcoming toy fairs and
          collector events based on your selected region.
        </p>
      </section>
    </main>
  );
}

const pageStyle = {
  padding: "60px 40px",
};

const headerStyle = {
  maxWidth: "1200px",
  margin: "0 auto 36px",
};

const eyebrowStyle = {
  color: "#f59e0b",
  fontWeight: "900",
  textTransform: "uppercase" as const,
  letterSpacing: "2px",
};

const titleStyle = {
  color: "white",
  fontSize: "54px",
  margin: "10px 0",
  fontWeight: "900",
};

const subtitleStyle = {
  color: "#cbd5e1",
  fontSize: "18px",
  maxWidth: "760px",
  lineHeight: "1.6",
};

const filterPanelStyle = {
  maxWidth: "1200px",
  margin: "0 auto 24px",
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const activeFilterStyle = {
  color: "#020617",
  backgroundColor: "#22d3ee",
  border: "1px solid #22d3ee",
  borderRadius: "999px",
  padding: "10px 16px",
  fontWeight: "900",
  cursor: "pointer",
};

const filterStyle = {
  color: "#cbd5e1",
  backgroundColor: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: "999px",
  padding: "10px 16px",
  fontWeight: "900",
  cursor: "pointer",
};

const gridStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "22px",
};

const eventCardStyle = {
  backgroundColor: "rgba(6,10,30,0.68)",
  border: "1px solid rgba(34,211,238,0.35)",
  borderRadius: "22px",
  padding: "24px",
  boxShadow: "0 0 28px rgba(34,211,238,0.15)",
};

const eventTypeStyle = {
  color: "#f59e0b",
  fontWeight: "900",
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
  fontSize: "13px",
};

const eventTitleStyle = {
  color: "white",
  fontSize: "22px",
  margin: "10px 0",
};

const eventInfoStyle = {
  color: "#cbd5e1",
  lineHeight: "1.6",
};

const eventDateStyle = {
  color: "#22d3ee",
  fontWeight: "900",
};

const eventButtonStyle = {
  marginTop: "18px",
  padding: "11px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(34,211,238,0.55)",
  backgroundColor: "rgba(34,211,238,0.08)",
  color: "#22d3ee",
  fontWeight: "900",
  cursor: "pointer",
};

const futurePanelStyle = {
  maxWidth: "1200px",
  margin: "24px auto 0",
  backgroundColor: "rgba(34,197,94,0.08)",
  border: "1px solid rgba(34,197,94,0.45)",
  borderRadius: "22px",
  padding: "26px",
};

const futureTitleStyle = {
  color: "#22c55e",
  marginTop: 0,
  textTransform: "uppercase" as const,
  letterSpacing: "1px",
};

const futureTextStyle = {
  color: "#cbd5e1",
  lineHeight: "1.6",
};