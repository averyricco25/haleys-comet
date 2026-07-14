import { useEffect, useState } from 'react'

export default function NoteBox({ value, onSave }) {
  const [text, setText] = useState(value || '')

  useEffect(() => {
    setText(value || '')
  }, [value])

  const dirty = text !== (value || '')

  return (
    <div className="note-block">
      <span className="rate-label">📝 My notes</span>
      <textarea
        className="note-input"
        placeholder="e.g. great twists, bad ending, watch with Mom…"
        value={text}
        rows={2}
        onChange={(e) => setText(e.target.value)}
      />
      {dirty && (
        <button className="btn btn-primary btn-small" onClick={() => onSave(text.trim())}>
          Save note
        </button>
      )}
    </div>
  )
}
