// =============================================================
// timer.ts — o "motor" do Tabata.
//
// Não sabe nada de HTML: só conta o tempo e avisa quem estiver a
// ouvir (neste caso o main.ts) quando algo acontece.
//
// Como funciona, em resumo:
//   1. No constructor, a configuração é transformada numa lista
//      de "passos" (preparação, trabalho, descanso, trabalho...).
//   2. iniciar() começa o primeiro passo e liga um setInterval
//      que chama tick() 10 vezes por segundo.
//   3. Cada tick vê quanto tempo falta. Quando chega a 0,
//      avança para o passo seguinte.
//   4. Quando não há mais passos, chama aoTerminar.
// =============================================================

import type { ConfigTabata, EstadoTimer, Fase } from "./tipos.ts";

/**
 * Um passo da sequência: ex. "trabalho do ciclo 2, ronda 5, 20 segundos".
 * "terminado" não é um passo, é o fim da lista.
 */
interface Passo {
  fase: Exclude<Fase, "terminado">;
  ciclo: number;
  ronda: number;
  duracaoMs: number;
}

/**
 * As funções que o timer chama quando algo acontece.
 */
export interface EventosTimer {
  aoAtualizar?: (estado: EstadoTimer) => void;
  aoMudarFase?: (estado: EstadoTimer) => void;
  /** Chamado em cada um dos últimos 3 segundos de uma fase (3, 2, 1). */
  aoContagemFinal?: (segundos: number) => void;
  /** Chamado quando passa metade do tempo de trabalho. */
  aoMeioTrabalho?: () => void;
  aoTerminar?: (duracaoTotalMs: number) => void;
}

/** De quantos em quantos milissegundos o timer verifica o relógio. */
const INTERVALO_TICK_MS = 100;

export class Timer {
  private readonly config: ConfigTabata;
  private readonly eventos: EventosTimer;
  private readonly passos: Passo[];

  private indicePasso = 0; // em que passo da lista vamos
  private fimDaFase = 0; // instante (em ms) em que a fase atual acaba
  private restanteEmPausa = 0; // quanto faltava quando se carregou em pausa
  private emPausa = false;
  private idIntervalo: number | null = null; // "id" do setInterval, para o poder parar
  private ultimoSegundoAvisado = -1; // evita tocar o bip do "3" várias vezes no mesmo segundo
  private meioAvisado = false; // evita tocar o bip de "meio" mais que uma vez

  // Para o resumo final: soma só o tempo a correr (sem pausas).
  private tempoAtivoMs = 0;
  private ultimoTick = 0;

  constructor(config: ConfigTabata, eventos: EventosTimer = {}) {
    this.config = config;
    this.eventos = eventos;
    this.passos = Timer.construirPassos(config);
  }

  /**
   * Transforma a configuração numa lista ordenada de passos.
   * Ex. (2 ciclos de 2 rondas):
   *   preparação → T1 → D → T2 → descanso ciclo → T1 → D → T2 → fim
   */
  private static construirPassos(config: ConfigTabata): Passo[] {
    const passos: Passo[] = [];
    const seg = (s: number) => s * 1000;

    if (config.preparacaoSeg > 0) {
      passos.push({ fase: "preparacao", ciclo: 1, ronda: 1, duracaoMs: seg(config.preparacaoSeg) });
    }
    for (let c = 1; c <= config.ciclos; c++) {
      for (let r = 1; r <= config.rondas; r++) {
        passos.push({ fase: "trabalho", ciclo: c, ronda: r, duracaoMs: seg(config.trabalhoSeg) });
        // Depois da última ronda do ciclo não há descanso curto.
        if (r < config.rondas && config.descansoSeg > 0) {
          passos.push({ fase: "descanso", ciclo: c, ronda: r, duracaoMs: seg(config.descansoSeg) });
        }
      }
      // Entre ciclos (mas não depois do último) há a pausa maior.
      if (c < config.ciclos && config.descansoCicloSeg > 0) {
        passos.push({
          fase: "descansoCiclo",
          ciclo: c,
          ronda: config.rondas,
          duracaoMs: seg(config.descansoCicloSeg),
        });
      }
    }
    return passos;
  }

  /**
   * Duração total prevista do treino, em ms (para mostrar antes de começar).
   */
  static duracaoPrevistaMs(config: ConfigTabata): number {
    return Timer.construirPassos(config).reduce((soma, p) => soma + p.duracaoMs, 0);
  }

  // ---------------------------------------------------------------
  // Comandos públicos
  // ---------------------------------------------------------------

  iniciar(): void {
    this.indicePasso = 0;
    this.tempoAtivoMs = 0;
    this.emPausa = false;
    this.comecarPasso();
    this.ligarIntervalo();
  }

  pausar(): void {
    if (this.emPausa || this.terminou()) return;
    this.acumularTempoAtivo();
    // Guarda quanto faltava, para retomar a partir daí.
    this.restanteEmPausa = this.fimDaFase - performance.now();
    this.emPausa = true;
    this.desligarIntervalo();
    this.emitirAtualizacao();
  }

  retomar(): void {
    if (!this.emPausa) return;
    // O novo fim da fase = agora + o que faltava quando pausou.
    this.fimDaFase = performance.now() + this.restanteEmPausa;
    this.ultimoTick = performance.now();
    this.emPausa = false;
    this.ligarIntervalo();
    this.emitirAtualizacao();
  }

  alternarPausa(): void {
    if (this.emPausa) this.retomar();
    else this.pausar();
  }

  /** Salta para a fase seguinte (ex.: encurtar um descanso). */
  saltar(): void {
    if (this.terminou()) return;
    if (!this.emPausa) this.acumularTempoAtivo();
    this.emPausa = false; // saltar também tira da pausa
    this.ligarIntervalo();
    this.avancarPasso();
  }

  /** Para tudo sem mostrar resumo (ex.: botão "sair"). */
  parar(): void {
    this.desligarIntervalo();
    this.indicePasso = this.passos.length; // "salta" para depois do último passo
  }

  // ---------------------------------------------------------------
  // Funcionamento interno
  // ---------------------------------------------------------------

  private terminou(): boolean {
    return this.indicePasso >= this.passos.length;
  }

  /** Começa o passo em que estamos (this.indicePasso). */
  private comecarPasso(): void {
    const passo = this.passos[this.indicePasso];
    const agora = performance.now();
    this.fimDaFase = agora + passo.duracaoMs;
    this.restanteEmPausa = passo.duracaoMs;
    this.ultimoTick = agora;
    this.ultimoSegundoAvisado = -1;
    this.meioAvisado = false;
    const estado = this.obterEstado();
    this.eventos.aoMudarFase?.(estado);
    this.eventos.aoAtualizar?.(estado);
  }

  /** Passa ao passo seguinte, ou termina se já não houver mais. */
  private avancarPasso(): void {
    this.indicePasso++;
    if (this.terminou()) {
      this.desligarIntervalo();
      this.eventos.aoTerminar?.(this.tempoAtivoMs);
      return;
    }
    this.comecarPasso();
  }

  /**
   * Corre ~10 vezes por segundo.
   *
   * Em vez de "tirar 1 a um contador" a cada segundo (que vai acumulando
   * atrasos), calcula quanto falta a partir do relógio: fimDaFase - agora.
   * Assim o timer nunca se atrasa, mesmo se o browser abrandar o
   * setInterval (acontece quando o separador está em segundo plano).
   */
  private tick = (): void => {
    if (this.emPausa || this.terminou()) return;
    this.acumularTempoAtivo();

    const passo = this.passos[this.indicePasso];
    const restante = this.fimDaFase - performance.now();
    if (restante <= 0) {
      this.avancarPasso();
      return;
    }

    // Contagem 3, 2, 1.
    const segundos = Math.ceil(restante / 1000);
    if (segundos <= 3 && segundos !== this.ultimoSegundoAvisado) {
      this.ultimoSegundoAvisado = segundos;
      this.eventos.aoContagemFinal?.(segundos);
    }

    // Aviso de "meio" só em trabalhos com 20 s ou mais.
    if (
      passo.fase === "trabalho" &&
      !this.meioAvisado &&
      passo.duracaoMs >= 20_000 &&
      restante <= passo.duracaoMs / 2
    ) {
      this.meioAvisado = true;
      this.eventos.aoMeioTrabalho?.();
    }

    this.emitirAtualizacao();
  };

  /** Soma ao tempo ativo o tempo que passou desde o último tick. */
  private acumularTempoAtivo(): void {
    const agora = performance.now();
    this.tempoAtivoMs += agora - this.ultimoTick;
    this.ultimoTick = agora;
  }

  private ligarIntervalo(): void {
    this.desligarIntervalo(); // garante que nunca há dois intervalos ao mesmo tempo
    this.idIntervalo = window.setInterval(this.tick, INTERVALO_TICK_MS);
  }

  private desligarIntervalo(): void {
    if (this.idIntervalo !== null) {
      window.clearInterval(this.idIntervalo);
      this.idIntervalo = null;
    }
  }

  private emitirAtualizacao(): void {
    this.eventos.aoAtualizar?.(this.obterEstado());
  }

  /**
   * Exercício do ciclo N. Se houver menos exercícios que ciclos,
   * a lista repete: com 2 exercícios e 4 ciclos -> A, B, A, B.
   */
  private exercicioDoCiclo(ciclo: number): string | null {
    const lista = this.config.exercicios;
    if (lista.length === 0 || ciclo > this.config.ciclos) return null;
    return lista[(ciclo - 1) % lista.length];
  }

  /**
   * Tira a "fotografia" do momento atual (um EstadoTimer).
   * É isto que a interface recebe para se desenhar.
   */
  obterEstado(): EstadoTimer {
    const passo = this.passos[this.indicePasso];
    const restante = this.emPausa
      ? this.restanteEmPausa
      : Math.max(0, this.fimDaFase - performance.now());

    // Tempo dos passos que ainda faltam depois deste.
    const depois = this.passos
      .slice(this.indicePasso + 1)
      .reduce((soma, p) => soma + p.duracaoMs, 0);

    // No descanso entre ciclos, o próximo exercício é o do ciclo seguinte.
    const cicloSeguinte = passo.fase === "descansoCiclo" ? passo.ciclo + 1 : passo.ciclo;

    return {
      fase: passo.fase,
      ronda: passo.ronda,
      totalRondas: this.config.rondas,
      ciclo: passo.ciclo,
      totalCiclos: this.config.ciclos,
      restanteMs: restante,
      duracaoFaseMs: passo.duracaoMs,
      restanteTreinoMs: restante + depois,
      exercicio: this.exercicioDoCiclo(passo.ciclo),
      proximoExercicio: this.exercicioDoCiclo(cicloSeguinte),
      emPausa: this.emPausa,
    };
  }
}
