export default function HuntPage() {
  const categories = [
    {
      title: "Transformers",
      description: "G1, G2, Takara, Diaclone en varianten",
    },
    {
      title: "M.A.S.K.",
      description: "Voertuigen, masks en losse onderdelen",
    },
    {
      title: "Star Wars",
      description: "Kenner 1977-1990, voertuigen en figuren",
    },
    {
      title: "G.I. Joe",
      description: "Vintage Joe, Cobra en voertuigen",
    },
    {
      title: "MOTU",
      description: "Masters of the Universe vintage lijn",
    },
    {
      title: "Bootlegs & KO",
      description: "Hong Kong, Taiwan, Mexico en onbekende merken",
    },
  ];

  return (
    <main style={{ padding: "60px 40px" }}>
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <h1>Hunt Dashboard</h1>

        <p
          style={{
            color: "#6b7280",
            marginBottom: "40px",
          }}
        >
          Jouw belangrijkste vintage speelgoedcategorieën.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
          }}
        >
          {categories.map((category) => (
            <div
              key={category.title}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "24px",
                backgroundColor: "white",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  fontSize: "22px",
                }}
              >
                {category.title}
              </h2>

              <p
                style={{
                  color: "#6b7280",
                }}
              >
                {category.description}
              </p>

              <button
                style={{
                  marginTop: "16px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Bekijk categorie
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}