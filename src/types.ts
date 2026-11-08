// Modelo de dominio de Ludok Monster.
//
// Dos mundos que no se mezclan:
//  - El CATÁLOGO (las 45 latas con su modelo 3D) es fijo y viene dentro de la app
//    (`src/lib/catalogo.ts`). No se guarda en la base de datos ni en las copias: si una
//    versión nueva de la app añade latas, aparecen solas.
//  - Lo que hace cada persona (qué ha probado, su valoración, sus compras) sí vive en
//    SQLite y viaja en las copias. Se enlaza con el catálogo por el `slug` de la lata.
//
// Los campos ausentes son `undefined`, nunca `null`: así el fichero de copia mantiene
// siempre la misma forma (ver `src/lib/rows.ts`).

/** Una lata que esta persona ha probado. Si no hay fila, no la ha probado. */
export interface Probada {
  slug: string
  /** Cuándo la marcó como probada (ms). */
  probadaAt: number
  /** Valoración de 1 a 10. Sin valorar todavía si falta. */
  valoracion?: number
  nota?: string
  updatedAt: number
}

/** Una compra de una lata: dónde y por cuánto. Puede haber varias por lata. */
export interface Compra {
  id: string
  slug: string
  /** En céntimos, para que las sumas no arrastren decimales de coma flotante. */
  precioCentimos?: number
  /** Código ISO de la moneda (EUR, JPY…). Las estadísticas no mezclan monedas. */
  moneda: string
  pais?: string
  ciudad?: string
  /** Coordenadas del lugar (ciudad + país), en caché una vez geocodificadas, para el mapa. */
  lat?: number
  lng?: number
  addedAt: number
  updatedAt: number
}

export type Theme = 'dark' | 'light' | 'system'

export interface Settings {
  id: 'app'
  theme: Theme
  lastBackup: number
  schemaVersion: number
  /** Moneda que se propone al añadir una compra. */
  moneda: string

  /* --- Copia automática a un Nextcloud propio ------------------------------ */
  nextcloudUrl?: string
  nextcloudUser?: string
  /**
   * Contraseña de aplicación de Nextcloud.
   *
   * NO se incluye en las copias exportadas a propósito: una copia se comparte y se mueve
   * de sitio, y esta contraseña da permiso de ESCRITURA sobre tus ficheros: la propia
   * copia acaba subida ahí, así que viajaría con su propia llave dentro. Al restaurar en
   * otro móvil hay que volver a escribirla.
   */
  nextcloudPassword?: string
  nextcloudFolder?: string
  autoBackup?: boolean
  lastAutoBackupAt?: number
}

/** Forma exacta del fichero de copia. Solo crece: nunca se quitan ni se renombran campos. */
export interface BackupFile {
  app: 'ludok-monster'
  schemaVersion: number
  exportedAt: number
  probadas: Probada[]
  compras: Compra[]
  settings: Omit<Settings, 'nextcloudPassword'> | null
}
