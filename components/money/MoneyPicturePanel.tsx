/**
 * Money Reality picture panel — RETIRED.
 *
 * The persistent 280px left panel is gone with the three-column shell. Every
 * figure it carried (surplus, income, runway, DTI, evidence) now renders once,
 * inline, in the Stand instrument — the panel was the source of the duplicate
 * readings between the rail and the main column. The bank-connection CTA is
 * the Stand next-move action.
 *
 * The file stays so no lingering import breaks a build. Delete it once nothing
 * references it.
 *
 * @deprecated Renders nothing. See components/money/MoneyStand.tsx.
 */
export function MoneyPicturePanel() {
  return null;
}
