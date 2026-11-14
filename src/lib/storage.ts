/** localStorage protegido: nunca quebra em aba anônima ou com armazenamento bloqueado. */
export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* ignora */ }
  },
};
