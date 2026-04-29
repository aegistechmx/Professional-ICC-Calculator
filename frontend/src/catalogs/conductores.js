// Complete conductor catalog (AWG + kcmil) based on NEC Table 310.16
// Sorted by ampacity ascending
export const conductoresCu = [
  { calibre: '14', ampacidad: 20 },
  { calibre: '12', ampacidad: 25 },
  { calibre: '10', ampacidad: 35 },
  { calibre: '8', ampacidad: 50 },
  { calibre: '6', ampacidad: 65 },
  { calibre: '4', ampacidad: 85 },
  { calibre: '3', ampacidad: 100 },
  { calibre: '2', ampacidad: 115 },
  { calibre: '1', ampacidad: 130 },
  { calibre: '1/0', ampacidad: 150 },
  { calibre: '2/0', ampacidad: 175 },
  { calibre: '3/0', ampacidad: 200 },
  { calibre: '4/0', ampacidad: 230 },
  { calibre: '250', ampacidad: 255 },
  { calibre: '300', ampacidad: 285 },
  { calibre: '350', ampacidad: 310 },
  { calibre: '400', ampacidad: 335 },
  { calibre: '500', ampacidad: 380 },
  { calibre: '600', ampacidad: 420 },
  { calibre: '700', ampacidad: 460 },
  { calibre: '750', ampacidad: 475 },
  { calibre: '800', ampacidad: 490 },
  { calibre: '900', ampacidad: 520 },
  { calibre: '1000', ampacidad: 545 },
  { calibre: '1250', ampacidad: 590 },
  { calibre: '1500', ampacidad: 625 },
  { calibre: '1750', ampacidad: 650 },
  { calibre: '2000', ampacidad: 665 },
]

export function formatCalibreLabel(calibre) {
  const s = String(calibre)
  // Heuristic: treat 14..1 as AWG, 'x/0' and >= 250 as kcmil label (common usage)
  const n = Number(s)
  if (Number.isFinite(n) && n <= 14) return `AWG ${s}`
  if (s.includes('/0')) return `${s} AWG`
  return `${s} kcmil`
}
