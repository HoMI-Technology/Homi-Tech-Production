"use client";

/* ------------------------------------------------------------------ */
/* BankingCommand — Banks & bills tab (planner spec §5).                */
/*                                                                      */
/* Live cash command: linked accounts (connect/sync/disconnect demo     */
/* flows) + bill pay tiles and bill cards. Pay now goes through         */
/* payBillWithImpact (lib/planner/closed-loop.ts) which snapshots the   */
/* score, mutates, and sets lastImpact — the shell's ImpactToast        */
/* renders the closed-loop card; this tab only calls the wrapper.       */
/*                                                                      */
/* No required props — reads usePlannerStore directly.                  */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Landmark,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Unlink,
  Wallet,
} from 'lucide-react'
import ConfirmDialog from "@/components/planner/ui/ConfirmDialog"
import EmptyState from "@/components/planner/ui/EmptyState"
import { payBillWithImpact } from '@/lib/planner/closed-loop'
import { summarizeAccounts, todayISO } from '@/lib/planner/derived'
import {
  INSTITUTIONS,
  institutionMeta,
} from '@/lib/planner/institutions'
import type {
  AddAccountInput,
  BankAccount,
  BankAccountType,
  BankInstitution,
  Bill,
  BillFrequency,
  ExpenseCategory,
} from '@/lib/planner/types'
import { formatCurrency } from '@/lib/tools/format'
import { usePlannerStore } from "@/lib/planner/store"
import {
  BILL_STATUS_CHIP,
  EXPENSE_CATEGORY_IDS,
  EXPENSE_CATEGORY_LABEL,
  billTiles,
  defaultPayFromId,
  dueRelativeLabel,
  eomProjection,
  formatDay,
  formatSyncLong,
  formatSyncStamp,
  payFromOptions,
  sortBillsForPay,
} from './banking-derive'

/* ------------------------------------------------------------------ */
/* Shared atoms                                                        */
/* ------------------------------------------------------------------ */

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-navyLight/80 px-3 py-2 text-sm text-light outline-none transition-colors focus:border-cyan/50'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function CyanButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <motion.button
      type={type}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </motion.button>
  )
}

function GhostButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-dim transition-colors hover:bg-white/[0.06] hover:text-light disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function StatTile({
  label,
  value,
  tone = 'light',
  caption,
}: {
  label: string
  value: string
  tone?: 'light' | 'cyan' | 'emerald' | 'gold' | 'crimson' | 'dim'
  caption?: string
}) {
  const toneCls = {
    light: 'text-light',
    cyan: 'text-cyan',
    emerald: 'text-emerald',
    gold: 'text-yellow',
    crimson: 'text-crimson',
    dim: 'text-dim',
  }[tone]
  return (
    <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-3">
      <p className="text-label">{label}</p>
      <p className={`mt-1 text-lg font-semibold score-numeral ${toneCls}`}>
        {value}
      </p>
      {caption && <p className="mt-0.5 text-[11px] text-dim">{caption}</p>}
    </div>
  )
}

function CardHeader({
  icon,
  title,
  caption,
  actions,
}: {
  icon: React.ReactNode
  title: string
  caption: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-semibold text-light">{title}</h3>
          <p className="mt-0.5 max-w-md text-xs leading-relaxed text-dim">
            {caption}
          </p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bill form (add + edit)                                              */
/* ------------------------------------------------------------------ */

const BILL_FREQUENCIES: BillFrequency[] = [
  'monthly',
  'weekly',
  'biweekly',
  'quarterly',
  'yearly',
  'once',
]

interface BillFormState {
  name: string
  amount: string
  category: ExpenseCategory
  dueDate: string
  frequency: BillFrequency
  autopay: boolean
  accountId: string
}

function billFormFrom(bill: Bill | null, fallbackAccountId?: string): BillFormState {
  return {
    name: bill?.name ?? '',
    amount: bill ? String(bill.amount) : '',
    category: bill?.category ?? 'utilities',
    dueDate: bill?.dueDate ?? todayISO(),
    frequency: bill?.frequency ?? 'monthly',
    autopay: bill?.autopay ?? false,
    accountId: bill?.accountId ?? fallbackAccountId ?? '',
  }
}

function BillForm({
  initial,
  accounts,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: BillFormState
  accounts: BankAccount[]
  submitLabel: string
  onSubmit: (form: BillFormState) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const set = <K extends keyof BillFormState>(key: K, value: BillFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))
  const amount = Number(form.amount)
  const valid = form.name.trim().length > 0 && Number.isFinite(amount) && amount > 0 && form.dueDate.length > 0

  return (
    <form
      className="mt-4 rounded-2xl border border-cyan/15 bg-navyLight/70 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit(form)
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input
            className={inputCls}
            placeholder="e.g. Car payment"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field label="Amount">
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </Field>
        <Field label="Category">
          <select
            className={inputCls}
            value={form.category}
            onChange={(e) => set('category', e.target.value as ExpenseCategory)}
          >
            {EXPENSE_CATEGORY_IDS.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date">
          <input
            type="date"
            className={inputCls}
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
        </Field>
        <Field label="Frequency">
          <select
            className={inputCls}
            value={form.frequency}
            onChange={(e) => set('frequency', e.target.value as BillFrequency)}
          >
            {BILL_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pay from">
          <select
            className={inputCls}
            value={form.accountId}
            onChange={(e) => set('accountId', e.target.value)}
          >
            <option value="">Pick at pay time</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {formatCurrency(a.balance, { decimals: 2 })}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-dim">
        <input
          type="checkbox"
          checked={form.autopay}
          onChange={(e) => set('autopay', e.target.checked)}
          className="h-4 w-4 accent-cyan"
        />
        Autopay — mark scheduled
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <CyanButton type="submit" disabled={!valid}>
          {submitLabel}
        </CyanButton>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* Bill card                                                           */
/* ------------------------------------------------------------------ */

const CHIP_TONE: Record<Bill['status'], string> = {
  overdue: 'border-crimson/30 bg-crimson/10 text-crimson',
  due: 'border-yellow/30 bg-yellow/10 text-yellow',
  upcoming: 'border-cyan/30 bg-cyan/10 text-cyan',
  scheduled: 'border-white/[0.1] bg-white/[0.06] text-dim',
  paid: 'border-emerald/30 bg-emerald/10 text-emerald',
}

function BillCard({
  bill,
  accounts,
  onEdit,
  onRemove,
}: {
  bill: Bill
  accounts: BankAccount[]
  onEdit: () => void
  onRemove: () => void
}) {
  const scheduleBill = usePlannerStore((s) => s.scheduleBill)
  const options = useMemo(() => payFromOptions(accounts), [accounts])
  const [payFromId, setPayFromId] = useState<string | undefined>(() =>
    defaultPayFromId(bill, accounts),
  )
  const [error, setError] = useState<string | null>(null)

  const resolvedPayFrom =
    payFromId && options.some((a) => a.id === payFromId)
      ? payFromId
      : defaultPayFromId(bill, accounts)
  const payAccount = accounts.find((a) => a.id === bill.accountId)
  const paid = bill.status === 'paid'

  const meta = [
    EXPENSE_CATEGORY_LABEL[bill.category],
    `due ${formatDay(bill.dueDate)}`,
    dueRelativeLabel(bill),
    payAccount
      ? `${institutionMeta(payAccount.institution).label} ••${payAccount.mask}`
      : null,
    bill.source === 'bank' ? 'From bank' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`rounded-2xl border p-4 ${
        bill.status === 'overdue'
          ? 'border-crimson/25 bg-crimson/[0.04]'
          : 'border-white/[0.06] bg-navyLight/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-light">
              {bill.name}
            </p>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${CHIP_TONE[bill.status]}`}
            >
              {BILL_STATUS_CHIP[bill.status]}
            </span>
            {bill.autopay && !paid && (
              <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cyan">
                AUTOPAY
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-dim">{meta}</p>
        </div>
        <p
          className={`shrink-0 text-base font-semibold score-numeral ${
            bill.status === 'overdue' ? 'text-crimson' : 'text-light'
          }`}
        >
          {formatCurrency(bill.amount, { decimals: 2 })}
        </p>
      </div>

      {!paid && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {options.length > 0 && (
            <select
              aria-label="Pay from account"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-navyLight/80 px-3 py-2 text-xs text-light outline-none focus:border-cyan/50 sm:flex-none sm:min-w-[180px]"
              value={resolvedPayFrom ?? ''}
              onChange={(e) => setPayFromId(e.target.value)}
            >
              {options.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {formatCurrency(a.balance, { decimals: 2 })}
                </option>
              ))}
            </select>
          )}
          <CyanButton
            disabled={!resolvedPayFrom}
            onClick={() => {
              void payBillWithImpact(bill.id, resolvedPayFrom).then((result) =>
                setError(result.ok ? null : (result.error ?? 'Payment failed')),
              )
            }}
          >
            Pay now
          </CyanButton>
          {bill.status !== 'scheduled' && (
            <GhostButton
              onClick={() => {
                scheduleBill(bill.id)
                setError(null)
              }}
            >
              <CalendarClock size={14} />
              Schedule
            </GhostButton>
          )}
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${bill.name}`}
            className="rounded-xl p-2 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl px-2 py-2 text-xs text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
          >
            Remove
          </button>
        </div>
      )}
      {paid && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs text-emerald">
            <Check size={13} />
            Paid — closed loop recorded in the ledger.
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl px-2 py-1 text-xs text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
          >
            Remove
          </button>
        </div>
      )}
      {error && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-crimson">
          <AlertTriangle size={13} />
          {error} — pick an account that covers {formatCurrency(bill.amount, { decimals: 2 })}.
        </p>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Linked accounts card                                                */
/* ------------------------------------------------------------------ */

const ACCOUNT_TYPES: BankAccountType[] = ['checking', 'savings', 'credit', 'other']

function ConnectBankForm({
  onDone,
  onCancel,
}: {
  onDone: () => void
  onCancel: () => void
}) {
  const connectBank = usePlannerStore((s) => s.connectBank)
  const [institution, setInstitution] = useState<BankInstitution>('chase')
  const [name, setName] = useState('')
  const [type, setType] = useState<BankAccountType>('checking')
  const [balance, setBalance] = useState('')
  const [mask, setMask] = useState('')
  const [busy, setBusy] = useState(false)

  const amount = Number(balance)
  const valid = Number.isFinite(amount) && amount >= 0 && balance.trim() !== ''

  return (
    <form
      className="mt-4 rounded-2xl border border-cyan/15 bg-navyLight/70 p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!valid || busy) return
        setBusy(true)
        const input: AddAccountInput = {
          institution,
          name: name.trim() || `${institutionMeta(institution).label} ${type}`,
          type,
          balance: amount,
          mask: mask || undefined,
        }
        await connectBank(input)
        setBusy(false)
        onDone()
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Institution">
          <select
            className={inputCls}
            value={institution}
            onChange={(e) => setInstitution(e.target.value as BankInstitution)}
          >
            {INSTITUTIONS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Account name">
          <input
            className={inputCls}
            placeholder="e.g. Total Checking"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Type">
          <select
            className={inputCls}
            value={type}
            onChange={(e) => setType(e.target.value as BankAccountType)}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Balance">
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </Field>
        <Field label="Mask (last 4)">
          <input
            className={inputCls}
            inputMode="numeric"
            placeholder="0000"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
          />
        </Field>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-dim">
        Demo open-banking — production swaps in Plaid / MX credentials.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <CyanButton type="submit" disabled={!valid || busy}>
          {busy ? 'Linking…' : 'Link account'}
        </CyanButton>
      </div>
    </form>
  )
}

function AccountRow({
  account,
  onDisconnect,
}: {
  account: BankAccount
  onDisconnect: () => void
}) {
  const meta = institutionMeta(account.institution)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-navyLight/50 p-3.5"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-xs font-bold text-navy"
        style={{ backgroundColor: meta.accent }}
      >
        {meta.short}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-light">
          {account.name}
        </p>
        <p className="mt-0.5 text-xs text-dim">
          {meta.label} · {account.type} · ••••{account.mask}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold score-numeral text-light">
          {formatCurrency(account.balance, { decimals: 2 })}
        </p>
        <p className="mt-0.5 text-[11px] text-dim">
          {formatCurrency(account.available, { decimals: 2 })} avail.
        </p>
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        aria-label={`Disconnect ${account.name}`}
        title="Disconnect"
        className="shrink-0 rounded-xl p-2 text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
      >
        <Unlink size={15} />
      </button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* BankingCommand                                                      */
/* ------------------------------------------------------------------ */

export function BankingCommand() {
  const accounts = usePlannerStore((s) => s.accounts)
  const bills = usePlannerStore((s) => s.bills)
  const bankLinkStatus = usePlannerStore((s) => s.bankLinkStatus)
  const lastBankSyncAt = usePlannerStore((s) => s.lastBankSyncAt)
  const lastImpact = usePlannerStore((s) => s.lastImpact)
  const syncBanks = usePlannerStore((s) => s.syncBanks)
  const disconnectAccount = usePlannerStore((s) => s.disconnectAccount)
  const addBill = usePlannerStore((s) => s.addBill)
  const updateBill = usePlannerStore((s) => s.updateBill)
  const deleteBill = usePlannerStore((s) => s.deleteBill)

  const [connectOpen, setConnectOpen] = useState(false)
  const [accountAdded, setAccountAdded] = useState(false)
  const [confirmAccount, setConfirmAccount] = useState<BankAccount | null>(null)
  const [billFormOpen, setBillFormOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [confirmBill, setConfirmBill] = useState<Bill | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState<string | null>(null)

  const { cash, credit } = summarizeAccounts(accounts)
  const tiles = billTiles(bills)
  const eom = eomProjection(accounts, bills)
  const orderedBills = useMemo(() => sortBillsForPay(bills), [bills])
  const connecting = bankLinkStatus === 'connecting'
  const allPaid = bills.length > 0 && tiles.openCount === 0

  const showPaidBanner =
    lastImpact?.actionKind === 'bill_paid' && bannerDismissed !== lastImpact.id

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------ header card */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass p-5 sm:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex items-center gap-2 text-cyan">
              <Landmark size={14} />
              <span className="text-label !text-cyan">Banks &amp; bills</span>
            </div>
            <h2 className="mt-2 font-serif text-3xl italic text-light">
              Live cash command
            </h2>
            <p className="mt-1 text-sm text-dim">
              Linked balances drive bill pay and closed-loop readiness.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatTile
                label="Cash"
                value={formatCurrency(cash, { decimals: 2 })}
                tone="cyan"
              />
              <StatTile label="Accounts" value={String(accounts.length)} />
              <StatTile
                label="Bills open"
                value={formatCurrency(tiles.openTotal, { decimals: 2 })}
                tone="gold"
              />
              <StatTile
                label="Overdue"
                value={String(tiles.overdue)}
                tone={tiles.overdue > 0 ? 'crimson' : 'dim'}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-navyLight/60 p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-light/90">
              <span aria-hidden className="text-cyan">
                ▤
              </span>
              Paying a bill updates ledger, cash, score, path, and signals.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-label">EOM projected</span>
              <span className="text-sm font-semibold score-numeral text-cyan">
                {formatCurrency(eom, { decimals: 2 })}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-label">Last sync</span>
              <span className="text-xs score-numeral text-dim">
                {formatSyncLong(lastBankSyncAt)}
              </span>
            </div>
            <div className="mt-3 h-[4px] overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full bg-cyan shadow-glow-cyan ${
                  connecting ? 'animate-pulse-dot' : ''
                }`}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-dim">
              Balances you enter drive bill pay. Open banking can replace entry
              when connected.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              Demo open-banking — production swaps in Plaid / MX credentials.
            </p>
          </div>
        </div>
      </motion.section>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        {/* ------------------------------------------- linked accounts */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: 'easeOut' }}
          className="glass p-5 sm:p-6"
        >
          <CardHeader
            icon={<Landmark size={16} />}
            title={accounts.length ? 'Linked accounts' : 'Accounts — Cash you control'}
            caption={
              accounts.length
                ? 'Pull live balances for bill pay. Demo open-banking flow — swap in Plaid / MX / Finicity for production credentials.'
                : 'Add balances you trust. They drive bill pay, runway, and the closed loop — educational readiness only.'
            }
            actions={
              <>
                {accounts.length > 0 && (
                  <GhostButton
                    disabled={connecting}
                    onClick={() => void syncBanks()}
                  >
                    <RefreshCw
                      size={14}
                      className={connecting ? 'animate-spin' : ''}
                    />
                    {connecting ? 'Syncing…' : 'Sync now'}
                  </GhostButton>
                )}
                <CyanButton onClick={() => setConnectOpen((v) => !v)}>
                  <Link2 size={14} />
                  {accounts.length ? 'Link bank' : 'Add account'}
                </CyanButton>
              </>
            }
          />

          {accounts.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <StatTile
                label="Cash on hand"
                value={formatCurrency(cash, { decimals: 2 })}
                tone="emerald"
              />
              <StatTile
                label="Credit utilized"
                value={formatCurrency(credit, { decimals: 2 })}
                tone="gold"
              />
              <StatTile
                label="Last sync"
                value={formatSyncStamp(lastBankSyncAt)}
              />
            </div>
          )}

          {connectOpen && (
            <ConnectBankForm
              onDone={() => {
                setConnectOpen(false)
                setAccountAdded(true)
              }}
              onCancel={() => setConnectOpen(false)}
            />
          )}
          {accountAdded && !connectOpen && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald">
              <Check size={13} />
              Account added. Balances power bill pay and readiness.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {accounts.map((a) => (
              <AccountRow
                key={a.id}
                account={a}
                onDisconnect={() => setConfirmAccount(a)}
              />
            ))}
            {accounts.length === 0 && !connectOpen && (
              <EmptyState
                compact
                illustration={false}
                line="No accounts yet — add the cash you control."
                caption="Checking and savings balances power bill pay, runway, and the closed loop."
                actionLabel="Add account"
                onAction={() => setConnectOpen(true)}
              />
            )}
          </div>
        </motion.section>

        {/* -------------------------------------------------- bill pay */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12, ease: 'easeOut' }}
          className="glass p-5 sm:p-6"
        >
          <CardHeader
            icon={<Wallet size={16} />}
            title="Bill pay"
            caption="Pay or schedule from live account balances — each pay closes the score loop."
            actions={
              <CyanButton
                onClick={() => {
                  setEditingBill(null)
                  setBillFormOpen((v) => !v)
                }}
              >
                <Plus size={14} />
                Add bill
              </CyanButton>
            }
          />

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <StatTile
              label="Open"
              value={formatCurrency(tiles.openTotal)}
              caption={`${tiles.openCount} bill${tiles.openCount === 1 ? '' : 's'}`}
            />
            <StatTile
              label="Due today"
              value={String(tiles.dueToday)}
              tone={tiles.dueToday > 0 ? 'gold' : 'dim'}
            />
            <StatTile
              label="Overdue"
              value={String(tiles.overdue)}
              tone={tiles.overdue > 0 ? 'crimson' : 'dim'}
              caption={
                tiles.overdue > 0
                  ? formatCurrency(tiles.overdueTotal, { decimals: 2 })
                  : undefined
              }
            />
          </div>

          {showPaidBanner && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald/30 bg-emerald/10 px-3.5 py-2.5 text-sm text-emerald"
            >
              <span className="inline-flex items-center gap-2">
                <Check size={15} />
                Bill paid. Ledger, cash, path &amp; readiness updated.
              </span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setBannerDismissed(lastImpact?.id ?? null)}
                className="text-emerald/70 transition-colors hover:text-emerald"
              >
                ×
              </button>
            </motion.div>
          )}

          {billFormOpen && !editingBill && (
            <BillForm
              initial={billFormFrom(null, payFromOptions(accounts)[0]?.id)}
              accounts={accounts}
              submitLabel="Save bill"
              onSubmit={(form) => {
                addBill({
                  name: form.name.trim(),
                  amount: Number(form.amount),
                  category: form.category,
                  dueDate: form.dueDate,
                  frequency: form.frequency,
                  autopay: form.autopay,
                  accountId: form.accountId || undefined,
                  source: 'manual',
                })
                setBillFormOpen(false)
              }}
              onCancel={() => setBillFormOpen(false)}
            />
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {orderedBills.map((bill) =>
              editingBill?.id === bill.id ? (
                <BillForm
                  key={bill.id}
                  initial={billFormFrom(bill)}
                  accounts={accounts}
                  submitLabel="Save changes"
                  onSubmit={(form) => {
                    updateBill(bill.id, {
                      name: form.name.trim(),
                      amount: Number(form.amount),
                      category: form.category,
                      dueDate: form.dueDate,
                      frequency: form.frequency,
                      autopay: form.autopay,
                      accountId: form.accountId || undefined,
                    })
                    setEditingBill(null)
                  }}
                  onCancel={() => setEditingBill(null)}
                />
              ) : (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  accounts={accounts}
                  onEdit={() => {
                    setBillFormOpen(false)
                    setEditingBill(bill)
                  }}
                  onRemove={() => setConfirmBill(bill)}
                />
              ),
            )}
            {(bills.length === 0 || allPaid) && (
              <div className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-8 text-center">
                <p className="font-serif text-lg italic text-light/90">
                  All bills paid — closed loop is clear.
                </p>
                {bills.length === 0 && (
                  <p className="mt-1 text-xs text-dim">
                    Schedule an obligation; paying it closes the score loop.
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.section>
      </div>

      <ConfirmDialog
        open={confirmAccount !== null}
        title="Disconnect account?"
        body={
          confirmAccount
            ? `${confirmAccount.name} (${institutionMeta(confirmAccount.institution).label} ••••${confirmAccount.mask}) will be removed. Bills already paid from it stay in your ledger.`
            : ''
        }
        confirmLabel="Disconnect"
        onConfirm={() => {
          if (confirmAccount) disconnectAccount(confirmAccount.id)
        }}
        onClose={() => setConfirmAccount(null)}
      />
      <ConfirmDialog
        open={confirmBill !== null}
        title="Remove bill?"
        body={
          confirmBill
            ? `${confirmBill.name} (${formatCurrency(confirmBill.amount, { decimals: 2 })}, due ${formatDay(confirmBill.dueDate)}) will be removed. Payments already made stay in your ledger.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmBill) deleteBill(confirmBill.id)
        }}
        onClose={() => setConfirmBill(null)}
      />
    </div>
  )
}

export default BankingCommand
