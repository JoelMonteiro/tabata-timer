// =============================================================
// main.ts — liga o HTML ao Timer.
//
// Secções:
//   1. Elementos do HTML
//   2. Estado da aplicação
//   3. Funções auxiliares
//   4. Ecrã de configuração
//   5. Ecrã de treino
//   6. Ecrã de resumo
//   7. Manter o ecrã do telemóvel ligado
//   8. Arranque
// =============================================================

import "./style.css";
import { Timer } from "./timer.ts";
import { PREDEFINICOES } from "./predefinicoes.ts";
import type { ConfigTabata, EstadoTimer, Fase, RegistoReps, ResumoTreino } from "./tipos.ts";
import * as som from "./som.ts";
import * as armazenamento from "./armazenamento.ts";

// ---------------------------------------------------------------
// 1. Elementos do HTML
// ---------------------------------------------------------------

/**
 * Procura um elemento pelo id e confirma que é do tipo esperado.
 * Se não existir ou for de outro tipo, lança um erro logo no arranque.
 */
function el<T extends HTMLElement>(id: string, tipo: { new (): T }): T {
  const elemento = document.getElementById(id);
  if (!(elemento instanceof tipo)) {
    throw new Error(`Elemento #${id} não encontrado ou de tipo errado`);
  }
  return elemento;
}

// Os três ecrãs da app.
const ecras = {
  config: el("ecra-config", HTMLElement),
  treino: el("ecra-treino", HTMLElement),
  resumo: el("ecra-resumo", HTMLElement),
};

// Campos numéricos da configuração.
// A chave de cada campo é igual ao id no HTML e ao data-alvo dos botões − e +.
const campos = {
  trabalho: el("trabalho", HTMLInputElement),
  descanso: el("descanso", HTMLInputElement),
  rondas: el("rondas", HTMLInputElement),
  ciclos: el("ciclos", HTMLInputElement),
  descansoCiclo: el("descansoCiclo", HTMLInputElement),
  preparacao: el("preparacao", HTMLInputElement),
};

const ui = {
  // Ecrã de configuração
  predefinicoes: el("predefinicoes", HTMLDivElement),
  treinos: el("treinos-guardados", HTMLSelectElement),
  apagarTreino: el("apagar-treino", HTMLButtonElement),
  formExercicio: el("form-exercicio", HTMLFormElement),
  novoExercicio: el("novo-exercicio", HTMLInputElement),
  listaExercicios: el("lista-exercicios", HTMLOListElement),
  som: el("som", HTMLInputElement),
  duracaoPrevista: el("duracao-prevista", HTMLSpanElement),
  formula: el("formula", HTMLSpanElement),
  erroConfig: el("erro-config", HTMLParagraphElement),
  comecar: el("comecar", HTMLButtonElement),
  formGuardar: el("form-guardar", HTMLFormElement),
  nomeTreino: el("nome-treino", HTMLInputElement),
  mensagemGuardar: el("mensagem-guardar", HTMLParagraphElement),

  // Ecrã de treino
  ciclo: el("ciclo", HTMLSpanElement),
  totalRestante: el("total-restante", HTMLSpanElement),
  faseNome: el("fase-nome", HTMLParagraphElement),
  exercicio: el("exercicio", HTMLParagraphElement),
  tempo: el("tempo", HTMLParagraphElement),
  barra: el("barra-progresso", HTMLDivElement),
  ronda: el("ronda", HTMLParagraphElement),
  pontos: el("pontos-rondas", HTMLOListElement),
  aSeguir: el("a-seguir", HTMLParagraphElement),
  painelReps: el("painel-reps", HTMLDivElement),
  repsRotulo: el("reps-rotulo", HTMLSpanElement),
  repsValor: el("reps-valor", HTMLSpanElement),
  repsMenos: el("reps-menos", HTMLButtonElement),
  repsMais: el("reps-mais", HTMLButtonElement),
  pausa: el("pausa", HTMLButtonElement),
  saltar: el("saltar", HTMLButtonElement),
  sair: el("sair", HTMLButtonElement),

  // Ecrã de resumo
  resumoTempo: el("resumo-tempo", HTMLSpanElement),
  resumoRondas: el("resumo-rondas", HTMLSpanElement),
  resumoPontuacao: el("resumo-pontuacao", HTMLDivElement),
  repetir: el("repetir", HTMLButtonElement),
  voltar: el("voltar", HTMLButtonElement),
};

// ---------------------------------------------------------------
// 2. Estado da aplicação
// ---------------------------------------------------------------

/** Exercícios adicionados no ecrã de configuração. */
let exercicios: string[] = [];

/** Timer em curso (null quando não há treino a decorrer). */
let timerAtual: Timer | null = null;

/** Configuração do treino em curso (usada pelo botão "Repetir"). */
let configAtual: ConfigTabata | null = null;

/** Último estado recebido do timer (usado pelos botões de reps). */
let estadoAtual: EstadoTimer | null = null;

/** Reps registadas no treino em curso: reps[ciclo][ronda]. */
let reps: RegistoReps = [];

// Texto mostrado para cada fase. O Record obriga a ter todas as fases do tipo Fase.
const NOMES_FASE: Record<Fase, string> = {
  preparacao: "Prepara-te",
  trabalho: "Vai!",
  descanso: "Descansa",
  descansoCiclo: "Pausa",
  terminado: "Feito",
};

// ---------------------------------------------------------------
// 3. Funções auxiliares
// ---------------------------------------------------------------

/**
 * Converte milissegundos em "m:ss" (ex.: 75000 -> "1:15").
 * Arredonda para cima para mostrar "0:01" até ao último instante.
 */
function formatarTempo(ms: number): string {
  const totalSeg = Math.ceil(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${min}:${seg.toString().padStart(2, "0")}`;
}

/** Lê um campo numérico e limita o valor ao min/max definidos no HTML. */
function lerNumero(campo: HTMLInputElement): number {
  const valor = Math.round(Number(campo.value));
  const min = Number(campo.min);
  const max = Number(campo.max);
  if (Number.isNaN(valor)) return min;
  return Math.min(max, Math.max(min, valor));
}

/** Lê os campos do ecrã e devolve a configuração do treino. */
function lerConfig(): ConfigTabata {
  return {
    preparacaoSeg: lerNumero(campos.preparacao),
    trabalhoSeg: lerNumero(campos.trabalho),
    descansoSeg: lerNumero(campos.descanso),
    rondas: lerNumero(campos.rondas),
    ciclos: lerNumero(campos.ciclos),
    descansoCicloSeg: lerNumero(campos.descansoCiclo),
    // Cópia, para alterações na lista do ecrã não afetarem o treino em curso.
    exercicios: [...exercicios],
  };
}

/** Escreve uma configuração nos campos do ecrã. */
function aplicarConfig(config: ConfigTabata): void {
  campos.preparacao.value = String(config.preparacaoSeg);
  campos.trabalho.value = String(config.trabalhoSeg);
  campos.descanso.value = String(config.descansoSeg);
  campos.rondas.value = String(config.rondas);
  campos.ciclos.value = String(config.ciclos);
  campos.descansoCiclo.value = String(config.descansoCicloSeg);
  exercicios = [...config.exercicios];
  desenharExercicios();
  atualizarResumoConfig();
}

/** Valida os campos. Devolve a mensagem de erro, ou null se estiver tudo bem. */
function validar(): string | null {
  for (const campo of Object.values(campos)) {
    const valor = Number(campo.value);
    if (campo.value.trim() === "" || Number.isNaN(valor)) {
      return "Preenche todos os campos com números.";
    }
    if (valor < Number(campo.min) || valor > Number(campo.max)) {
      const nome = campo.labels?.[0]?.textContent ?? campo.id;
      return `${nome}: entre ${campo.min} e ${campo.max}.`;
    }
  }
  return null;
}

/** Mostra um ecrã e esconde os outros. */
function mostrarEcra(nome: keyof typeof ecras): void {
  for (const [chave, ecra] of Object.entries(ecras)) {
    ecra.hidden = chave !== nome;
  }
  // Fora do treino, o fundo volta à cor neutra (o CSS usa o data-fase do <body>).
  if (nome !== "treino") document.body.dataset.fase = nome;
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------
// 4. Ecrã de configuração
// ---------------------------------------------------------------

/** Cria um botão por cada treino rápido (lista em predefinicoes.ts). */
function desenharPredefinicoes(): void {
  for (const predef of PREDEFINICOES) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "predefinicao";

    const nome = document.createElement("strong");
    nome.textContent = predef.nome;
    const descricao = document.createElement("span");
    descricao.textContent = predef.descricao;

    botao.append(nome, descricao);
    botao.addEventListener("click", () => {
      aplicarConfig(predef.config);
      ui.treinos.value = "";
      ui.nomeTreino.value = "";
    });
    ui.predefinicoes.append(botao);
  }
}

/** Redesenha a lista de exercícios, cada um com um botão × para remover. */
function desenharExercicios(): void {
  ui.listaExercicios.replaceChildren();
  exercicios.forEach((nome, indice) => {
    const item = document.createElement("li");
    item.className = "chip";
    item.textContent = `${indice + 1}. ${nome}`;

    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = "×";
    botao.setAttribute("aria-label", `Remover ${nome}`);
    botao.addEventListener("click", () => {
      exercicios.splice(indice, 1);
      desenharExercicios();
    });

    item.append(botao);
    ui.listaExercicios.append(item);
  });
}

/** Atualiza a duração total ("4:00") e a fórmula ("8 × 20/10") por baixo dos campos. */
function atualizarResumoConfig(): void {
  const erro = validar();
  ui.erroConfig.textContent = "";
  if (erro !== null) {
    ui.duracaoPrevista.textContent = "";
    ui.formula.textContent = "";
    return;
  }
  const config = lerConfig();
  ui.duracaoPrevista.textContent = formatarTempo(Timer.duracaoPrevistaMs(config));
  const vezes = config.ciclos > 1 ? `${config.ciclos} × ` : "";
  ui.formula.textContent = `${vezes}${config.rondas} × ${config.trabalhoSeg}/${config.descansoSeg}`;
}

/** Preenche a lista "Os teus treinos…" com os treinos guardados no browser. */
function desenharTreinosGuardados(): void {
  const treinos = armazenamento.listarTreinos();
  ui.treinos.replaceChildren(new Option("Os teus treinos…", ""));
  for (const treino of treinos) {
    ui.treinos.append(new Option(treino.nome, treino.nome));
  }
  ui.treinos.disabled = treinos.length === 0;
  ui.apagarTreino.disabled = treinos.length === 0;
}

// Botões − e +: cada um diz no HTML qual o campo (data-alvo) e quanto somar (data-passo).
document.querySelectorAll<HTMLButtonElement>("[data-alvo]").forEach((botao) => {
  botao.addEventListener("click", () => {
    const alvo = botao.dataset.alvo as keyof typeof campos;
    const campo = campos[alvo];
    const passo = Number(botao.dataset.passo);
    const novo = lerNumero(campo) + passo;
    campo.value = String(Math.min(Number(campo.max), Math.max(Number(campo.min), novo)));
    atualizarResumoConfig();
  });
});

// Recalcula a duração sempre que se escreve num campo.
for (const campo of Object.values(campos)) {
  campo.addEventListener("input", atualizarResumoConfig);
}

// Adicionar exercício (botão ou Enter).
ui.formExercicio.addEventListener("submit", (evento) => {
  evento.preventDefault(); // impede o form de recarregar a página
  const nome = ui.novoExercicio.value.trim();
  if (nome === "") return;
  exercicios.push(nome);
  ui.novoExercicio.value = "";
  desenharExercicios();
  ui.novoExercicio.focus();
});

ui.som.addEventListener("change", () => som.definirSomAtivo(ui.som.checked));

// Carregar um treino guardado.
ui.treinos.addEventListener("change", () => {
  const treino = armazenamento.listarTreinos().find((t) => t.nome === ui.treinos.value);
  if (treino) {
    aplicarConfig(treino.config);
    ui.nomeTreino.value = treino.nome;
  }
});

ui.apagarTreino.addEventListener("click", () => {
  const nome = ui.treinos.value;
  if (nome === "") {
    ui.mensagemGuardar.textContent = "Escolhe primeiro um treino na lista.";
    return;
  }
  armazenamento.apagarTreino(nome);
  desenharTreinosGuardados();
  ui.mensagemGuardar.textContent = `"${nome}" apagado.`;
});

// Guardar o treino atual com um nome.
ui.formGuardar.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nome = ui.nomeTreino.value.trim();
  const erro = nome === "" ? "Dá um nome ao treino." : validar();
  if (erro !== null) {
    ui.mensagemGuardar.textContent = erro;
    return;
  }
  armazenamento.guardarTreino({ nome, config: lerConfig() });
  desenharTreinosGuardados();
  ui.treinos.value = nome;
  ui.mensagemGuardar.textContent = `"${nome}" guardado.`;
});

ui.nomeTreino.addEventListener("input", () => (ui.mensagemGuardar.textContent = ""));

// ---------------------------------------------------------------
// 5. Ecrã de treino
// ---------------------------------------------------------------

/**
 * Desenha o ecrã de treino a partir do estado do timer.
 * É chamada pelo Timer cerca de 10 vezes por segundo.
 */
function desenharEstado(estado: EstadoTimer): void {
  estadoAtual = estado;

  // O CSS escolhe a cor de fundo a partir do data-fase e da classe em-pausa.
  document.body.dataset.fase = estado.fase;
  document.body.classList.toggle("em-pausa", estado.emPausa);

  ui.ciclo.textContent =
    estado.totalCiclos > 1 ? `Tabata ${estado.ciclo}/${estado.totalCiclos}` : "Tabata";
  ui.totalRestante.textContent = `Falta ${formatarTempo(estado.restanteTreinoMs)}`;

  ui.faseNome.textContent = estado.emPausa ? "Em pausa" : NOMES_FASE[estado.fase];

  // Na preparação e na pausa entre Tabatas mostra o exercício que vem a seguir.
  ui.exercicio.textContent =
    estado.fase === "descansoCiclo" || estado.fase === "preparacao"
      ? estado.proximoExercicio ?? ""
      : estado.exercicio ?? "";
  ui.tempo.textContent = formatarTempo(estado.restanteMs);

  // Barra de progresso da fase atual, em percentagem.
  const progresso = 1 - estado.restanteMs / estado.duracaoFaseMs;
  ui.barra.style.width = `${Math.round(progresso * 1000) / 10}%`;

  ui.ronda.textContent = `Ronda ${estado.ronda}/${estado.totalRondas}`;
  desenharPontos(estado);
  ui.aSeguir.textContent = textoASeguir(estado);
  desenharReps(estado);

  ui.pausa.textContent = estado.emPausa ? "▶" : "❚❚";
  ui.pausa.setAttribute("aria-label", estado.emPausa ? "Retomar" : "Pausa");
}

/** Uma bolinha por ronda: cheia = feita, a piscar = atual. */
function desenharPontos(estado: EstadoTimer): void {
  // Só recria as bolinhas quando o número de rondas muda.
  if (ui.pontos.childElementCount !== estado.totalRondas) {
    ui.pontos.replaceChildren(
      ...Array.from({ length: estado.totalRondas }, () => document.createElement("li")),
    );
  }
  // No trabalho a ronda atual ainda não conta como feita; no descanso já conta.
  const feitas = estado.fase === "trabalho" || estado.fase === "preparacao" ? estado.ronda - 1 : estado.ronda;
  Array.from(ui.pontos.children).forEach((ponto, i) => {
    ponto.classList.toggle("feita", i < feitas);
    ponto.classList.toggle("atual", estado.fase === "trabalho" && i === estado.ronda - 1);
  });
}

/** Texto "A seguir: ..." por baixo das bolinhas. */
function textoASeguir(estado: EstadoTimer): string {
  switch (estado.fase) {
    case "preparacao":
      return `A seguir: ${configAtual?.trabalhoSeg ?? 0} s de trabalho`;
    case "trabalho":
      if (estado.ronda < estado.totalRondas) return `A seguir: descanso ${configAtual?.descansoSeg ?? 0} s`;
      return estado.ciclo < estado.totalCiclos ? "Última ronda deste Tabata!" : "Última ronda! Tudo!";
    case "descanso":
      return `A seguir: ronda ${estado.ronda + 1}`;
    case "descansoCiclo":
      return `A seguir: Tabata ${estado.ciclo + 1}`;
    case "terminado":
      return "";
  }
}

// ---------------- Registo de reps (pontuação) ----------------

/** Cria a matriz de reps vazia (ciclos × rondas), com null = ronda não registada. */
function criarRegistoReps(config: ConfigTabata): RegistoReps {
  return Array.from({ length: config.ciclos }, () =>
    Array<number | null>(config.rondas).fill(null),
  );
}

/** Atualiza o painel "Reps ronda N  [−] 12 [+]". */
function desenharReps(estado: EstadoTimer): void {
  const mostrar = estado.fase !== "preparacao";
  ui.painelReps.hidden = !mostrar;
  if (!mostrar) return;
  // No trabalho regista a ronda atual; no descanso, a ronda que acabou.
  ui.repsRotulo.textContent = `Reps ronda ${estado.ronda}`;
  const valor = reps[estado.ciclo - 1]?.[estado.ronda - 1] ?? null;
  ui.repsValor.textContent = String(valor ?? 0);
  ui.repsValor.classList.toggle("vazio", valor === null);
}

/** Soma delta (+1 ou -1) às reps da ronda atual, sem descer abaixo de 0. */
function alterarReps(delta: number): void {
  if (estadoAtual === null || estadoAtual.fase === "preparacao") return;
  const linha = reps[estadoAtual.ciclo - 1];
  const i = estadoAtual.ronda - 1;
  linha[i] = Math.max(0, (linha[i] ?? 0) + delta);
  desenharReps(estadoAtual);
}

ui.repsMais.addEventListener("click", () => alterarReps(1));
ui.repsMenos.addEventListener("click", () => alterarReps(-1));

// ---------------- Eventos do Timer ----------------

/** Chamado no início de cada fase: toca a buzina e vibra o telemóvel. */
function aoMudarFase(estado: EstadoTimer): void {
  if (estado.fase === "trabalho") som.buzinaTrabalho();
  else if (estado.fase === "descanso" || estado.fase === "descansoCiclo") som.buzinaDescanso();
  navigator.vibrate?.(estado.fase === "trabalho" ? [200, 100, 200] : 300);
}

/** Chamado no fim do treino, com o tempo total sem pausas. */
function aoTerminar(duracaoTotalMs: number): void {
  som.somFim();
  libertarEcraLigado();
  if (configAtual !== null) {
    desenharResumo({
      config: configAtual,
      rondasFeitas: configAtual.rondas * configAtual.ciclos,
      duracaoTotalMs,
      reps,
    });
  }
  mostrarEcra("resumo");
  timerAtual = null;
}

/** Prepara e arranca um treino novo. */
function comecarTreino(config: ConfigTabata): void {
  som.prepararSom(); // tem de acontecer dentro de um clique (regra dos browsers)
  som.definirSomAtivo(ui.som.checked);
  void manterEcraLigado();
  configAtual = config;
  reps = criarRegistoReps(config);
  armazenamento.guardarUltimaConfig(config);

  timerAtual?.parar();
  timerAtual = new Timer(config, {
    aoAtualizar: desenharEstado,
    aoMudarFase,
    aoContagemFinal: () => som.bipContagem(),
    aoMeioTrabalho: () => som.bipMeio(),
    aoTerminar,
  });
  ui.pontos.replaceChildren();
  mostrarEcra("treino");
  timerAtual.iniciar();
}

ui.comecar.addEventListener("click", () => {
  const erro = validar();
  if (erro !== null) {
    ui.erroConfig.textContent = erro;
    return;
  }
  comecarTreino(lerConfig());
});

ui.pausa.addEventListener("click", () => timerAtual?.alternarPausa());
ui.saltar.addEventListener("click", () => timerAtual?.saltar());
ui.sair.addEventListener("click", () => {
  timerAtual?.parar();
  timerAtual = null;
  libertarEcraLigado();
  mostrarEcra("config");
});

// Atalhos de teclado durante o treino:
// Espaço = pausa, seta direita = saltar, seta cima/baixo = reps.
document.addEventListener("keydown", (evento) => {
  if (timerAtual === null || ecras.treino.hidden) return;
  switch (evento.code) {
    case "Space":
      evento.preventDefault(); // evita o scroll da página
      timerAtual.alternarPausa();
      break;
    case "ArrowRight":
      timerAtual.saltar();
      break;
    case "ArrowUp":
      evento.preventDefault();
      alterarReps(1);
      break;
    case "ArrowDown":
      evento.preventDefault();
      alterarReps(-1);
      break;
  }
});

// ---------------------------------------------------------------
// 6. Ecrã de resumo
// ---------------------------------------------------------------

/** Mostra o tempo, as rondas e um cartão de pontuação por Tabata com reps registadas. */
function desenharResumo(resumo: ResumoTreino): void {
  ui.resumoTempo.textContent = formatarTempo(resumo.duracaoTotalMs);
  ui.resumoRondas.textContent = String(resumo.rondasFeitas);
  ui.resumoPontuacao.replaceChildren();

  resumo.reps.forEach((linha, c) => {
    const registadas = linha.filter((r): r is number => r !== null);
    if (registadas.length === 0) return; // Tabata sem reps registadas: sem cartão

    const nome = resumo.config.exercicios.length > 0
      ? resumo.config.exercicios[c % resumo.config.exercicios.length]
      : `Tabata ${c + 1}`;

    // Pontuação Tabata: a ronda com menos reps.
    const pontuacao = Math.min(...registadas);
    const total = registadas.reduce((a, b) => a + b, 0);

    const cartao = document.createElement("section");
    cartao.className = "cartao-pontuacao";

    const titulo = document.createElement("h3");
    titulo.textContent = nome;

    // innerHTML só com números calculados aqui; o nome do exercício vai por textContent.
    const numeros = document.createElement("div");
    numeros.className = "pontuacao-numeros";
    numeros.innerHTML = `
      <div><span class="metrica-rotulo">Pontuação</span><span class="metrica-valor">${pontuacao}</span></div>
      <div><span class="metrica-rotulo">Total reps</span><span class="metrica-valor">${total}</span></div>`;

    // Reps de cada ronda; a(s) pior(es) ficam destacadas.
    const rondas = document.createElement("ol");
    rondas.className = "reps-por-ronda";
    for (const r of linha) {
      const item = document.createElement("li");
      item.textContent = r === null ? "–" : String(r);
      if (r === pontuacao) item.classList.add("minimo");
      rondas.append(item);
    }

    cartao.append(titulo, numeros, rondas);
    ui.resumoPontuacao.append(cartao);
  });

  if (ui.resumoPontuacao.childElementCount === 0) {
    const nota = document.createElement("p");
    nota.className = "ajuda";
    nota.textContent = "Dica: usa os botões − e + durante o treino para registar as reps e ver a tua pontuação aqui.";
    ui.resumoPontuacao.append(nota);
  }
}

ui.repetir.addEventListener("click", () => {
  if (configAtual) comecarTreino(configAtual);
});
ui.voltar.addEventListener("click", () => mostrarEcra("config"));

// ---------------------------------------------------------------
// 7. Manter o ecrã do telemóvel ligado durante o treino
// ---------------------------------------------------------------

let bloqueioEcra: WakeLockSentinel | null = null;

/** Pede ao sistema para não apagar o ecrã. Se não for suportado, ignora. */
async function manterEcraLigado(): Promise<void> {
  try {
    bloqueioEcra = (await navigator.wakeLock?.request("screen")) ?? null;
  } catch {
    // Não suportado ou recusado: o timer funciona na mesma.
  }
}

function libertarEcraLigado(): void {
  void bloqueioEcra?.release();
  bloqueioEcra = null;
}

// O sistema cancela o bloqueio quando se muda de app; ao voltar, pede-se outra vez.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && timerAtual !== null) {
    void manterEcraLigado();
  }
});

// ---------------------------------------------------------------
// 8. Arranque
// ---------------------------------------------------------------

desenharPredefinicoes();
desenharTreinosGuardados();
// Carrega a última configuração usada, ou o Tabata clássico.
aplicarConfig(armazenamento.lerUltimaConfig() ?? PREDEFINICOES[0].config);

// Modo offline (PWA): só na versão final, para não interferir com o npm run dev.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register("/sw.js");
}
