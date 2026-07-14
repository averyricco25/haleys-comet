export default function RatingStars({ rating = 0, onRate, size = 'md' }) {
  return (
    <div className={`stars stars-${size}`} role={onRate ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star${n <= rating ? ' filled' : ''}`}
          disabled={!onRate}
          onClick={() => onRate && onRate(n === rating ? 0 : n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
