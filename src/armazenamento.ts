// =============================================================
// armazenamento.ts — guarda os treinos no localStorage do browser.
// Os dados ficam só neste browser e neste aparelho.
// =============================================================

import type { ConfigTabata, TreinoGuardado } from "./tipos.ts";

const CHAVE_TREINOS = "tabata:treinos";
const CHAVE_ULTIMA = "tabata:ultima-config";

/**
 * Lê um valor guardado em JSON. Devolve valorPorDefeito se não existir,
 * se os dados estiverem estragados ou se o browser bloquear o acesso.
 */
function ler<T>(chave: string, valorPorDefeito: T): T {
  try {
    const texto = localStorage.getItem(chave);
    return texto === null ? valorPorDefeito : (JSON.parse(texto) as T);
  } catch {
    return valorPorDefeito;
  }
}

/** Grava um valor em JSON. Se falhar, a app continua sem guardar. */
function escrever(chave: string, valor: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem espaço ou sem permissão.
  }
}

export function listarTreinos(): TreinoGuardado[] {
  return ler<TreinoGuardado[]>(CHAVE_TREINOS, []);
}

/** Guarda um treino (substitui se já existir um com o mesmo nome). */
export function guardarTreino(treino: TreinoGuardado): void {
  const outros = listarTreinos().filter((t) => t.nome !== treino.nome);
  escrever(CHAVE_TREINOS, [...outros, treino]);
}

export function apagarTreino(nome: string): void {
  escrever(CHAVE_TREINOS, listarTreinos().filter((t) => t.nome !== nome));
}

/** Última configuração usada, para a próxima vez que a app abrir. */
export function lerUltimaConfig(): ConfigTabata | null {
  const config = ler<ConfigTabata | null>(CHAVE_ULTIMA, null);
  // Ignora dados de uma versão antiga da app (sem "ciclos").
  return config !== null && typeof config.ciclos === "number" ? config : null;
}

export function guardarUltimaConfig(config: ConfigTabata): void {
  escrever(CHAVE_ULTIMA, config);
}
