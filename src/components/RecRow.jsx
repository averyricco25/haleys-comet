export default function RecRow({ title, items, onOpen }) {
  if (!items || items.length === 0) return null
  return (
    <div className="rec-section">
      <h2 className="section-title">{title}</h2>
      <div className="rec-row">
        {items.map((r) => (
          <button key={r.id} className="rec-card" onClick={() => onOpen(r)}>
            {r.image ? (
              <img src={r.image} alt={r.name} className="rec-poster" loading="lazy" />
            ) : (
              <div className="rec-poster poster-empty">📺</div>
            )}
            <span className="rec-name">{r.name}</span>
            {r.year && <span className="rec-year">{r.year}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
