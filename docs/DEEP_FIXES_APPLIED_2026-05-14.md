# Deep fixes applied — 2026-05-14

Se aplicaron correcciones directas al motor ICC/TCC/NOM:

1. Sensibilidad multi-zona LSIG/MCCB: LT, ST, INST y GF. Ya no marca falso “NO VE FALLA” cuando el instantáneo no alcanza pero sí disparan short/long delay o ground fault.
2. Coordinación TCC jerárquica de downstream a upstream: retardos y pickups crecen progresivamente; se evita que todos queden en 6.4 s / 0.40 s.
3. Validación de coordinación menos ruidosa: reporta el peor cruce por par y no 50+ puntos repetidos.
4. Bloqueo NOM conservado: NOM/ampacidad sigue por encima de TCC.
5. Límite físico de paralelos: evita 3–4 paralelos en alimentadores chicos; fuerza calibre/rediseño antes de paralelizar absurdamente.
6. Validación NOM 125% depurada: elimina warning falso cuando I_diseño ya incluye Fcc=1.25.
7. UI/exports muestran la zona efectiva de sensibilidad: LT/ST/INST/GF.
8. Se aplicó en copias public, dist e icc-core cuando existían.

Backups creados con sufijo `.bak-20260514-deep-fixes`.
