// =============================================================
// tipos.ts — os "moldes" de dados da aplicação.
// =============================================================

/**
 * As fases possíveis de um Tabata.
 */
export type Fase =
  | "preparacao" // contagem inicial ("3, 2, 1, vai!")
  | "trabalho" // 20 s a dar tudo
  | "descanso" // 10 s entre rondas
  | "descansoCiclo" // pausa maior entre dois Tabatas seguidos
  | "terminado";

/**
 * Configuração de um treino.
 * Um "ciclo" é um Tabata completo (ex.: 8 rondas de 20/10).
 * Com 4 ciclos fazes 4 Tabatas seguidos, com descanso entre eles.
 */
export interface ConfigTabata {
  preparacaoSeg: number;
  trabalhoSeg: number;
  descansoSeg: number;
  rondas: number; // rondas por ciclo
  ciclos: number;
  descansoCicloSeg: number;
  /** Um exercício por ciclo (ex.: ciclo 1 = Burpees, ciclo 2 = Air squats). */
  exercicios: string[];
}

/** Um modelo pronto a usar (o "Tabata clássico", etc.). */
export interface Predefinicao {
  nome: string;
  descricao: string;
  config: ConfigTabata;
}

/**
 * Uma "fotografia" do timer num dado instante.
 * A interface gráfica só precisa disto para se desenhar.
 */
export interface EstadoTimer {
  readonly fase: Fase;
  readonly ronda: number; // 1..rondas (dentro do ciclo atual)
  readonly totalRondas: number;
  readonly ciclo: number; // 1..ciclos
  readonly totalCiclos: number;
  readonly restanteMs: number; // tempo que falta na fase atual
  readonly duracaoFaseMs: number; // duração total da fase atual
  readonly restanteTreinoMs: number; // tempo que falta ao treino todo
  readonly exercicio: string | null; // null se não houver exercícios definidos
  readonly proximoExercicio: string | null;
  readonly emPausa: boolean;
}

/** Um treino guardado com nome, para reutilizar. */
export interface TreinoGuardado {
  nome: string;
  config: ConfigTabata;
}

/**
 * Reps feitas em cada ronda, para a pontuação.
 * reps[ciclo][ronda]; null = ronda não registada.
 */
export type RegistoReps = (number | null)[][];

/** Resumo mostrado no fim do treino. */
export interface ResumoTreino {
  config: ConfigTabata;
  rondasFeitas: number;
  duracaoTotalMs: number;
  reps: RegistoReps;
}
