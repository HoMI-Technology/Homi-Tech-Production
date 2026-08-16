import { useEffect, useState } from 'react'
import type { SimulationInputs } from '@/lib/rehearsal'

type FieldSpec = {
  key: keyof SimulationInputs
  label: string
  prefix?: string
  suffix?: string
  step?: number
}

const FIELDS: FieldSpec[] = [
  { key: 'homePrice', label: 'Home price', prefix: '$', step: 5000 },
  { key: 'downPaymentSaved', label: 'Down payment saved', prefix: '$', step: 1000 },
  { key: 'monthlySavings', label: 'Monthly savings', prefix: '$', step: 100 },
  { key: 'rent', label: 'Current rent', prefix: '$', step: 50 },
  { key: 'rate', label: 'Mortgage rate', suffix: '%', step: 0.125 },
  { key: 'appreciation', label: 'Home appreciation', suffix: '%/yr', step: 0.1 },
  { key: 'rentIncrease', label: 'Rent increase', suffix: '%/yr', step: 0.1 },
]

/**
 * Rehearsal input grid — pre-filled from the user's ledger, every field
 * editable. Edits are committed on change and persisted by the page.
 */
export default function RehearsalInputs({
  inputs,
  onChange,
}: {
  inputs: SimulationInputs
  onChange: (next: SimulationInputs) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {FIELDS.map((f) => (
        <NumberField key={f.key} spec={f} value={inputs[f.key]} onCommit={(v) => onChange({ ...inputs, [f.key]: v })} />
      ))}
    </div>
  )
}

function NumberField({
  spec,
  value,
  onCommit,
}: {
  spec: FieldSpec
  value: number
  onCommit: (v: number) => void
}) {
  // Local text state so typing intermediate values ("", "4.") doesn't clobber
  // the simulation; commits on blur / Enter when parseable.
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = () => {
    const parsed = Number(text.replace(/[^0-9.\-]/g, ''))
    if (Number.isFinite(parsed)) {
      onCommit(parsed)
    } else {
      setText(String(value))
    }
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label">{spec.label}</span>
      <span className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 transition-colors focus-within:border-cyan/40">
        {spec.prefix && <span className="text-xs text-dim">{spec.prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="text-data-sm w-full min-w-0 bg-transparent text-light outline-none"
          aria-label={spec.label}
        />
        {spec.suffix && <span className="shrink-0 text-xs text-dim">{spec.suffix}</span>}
      </span>
    </label>
  )
}
