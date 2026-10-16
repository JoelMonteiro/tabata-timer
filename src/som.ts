// =============================================================
// som.ts — buzinas e bips gerados com a Web Audio API
// (sem ficheiros de som). Cada bip é um oscilador ligado a um
// controlo de volume.
// =============================================================

let contexto: AudioContext | null = null;

/** Se false, os bips são ignorados (checkbox "Som ligado"). */
let ativo = true;

/**
 * Os browsers só deixam tocar som depois de um clique do utilizador,
 * por isso isto é chamado no clique de "Começar".
 */
export function prepararSom(): void {
  contexto ??= new AudioContext();
  if (contexto.state === "suspended") void contexto.resume();
}

export function definirSomAtivo(valor: boolean): void {
  ativo = valor;
}

/**
 * Toca um bip.
 * frequencia em Hz (mais alto = mais agudo), duracao em ms.
 * `tipo` muda o timbre: "square" soa a buzina, "sine" é mais suave.
 */
function bip(frequencia: number, duracaoMs: number, volume = 0.25, tipo: OscillatorType = "square"): void {
  if (!ativo || contexto === null) return;

  const oscilador = contexto.createOscillator();
  const ganho = contexto.createGain(); // controla o volume
  const agora = contexto.currentTime; // em segundos
  const fim = agora + duracaoMs / 1000;

  oscilador.type = tipo;
  oscilador.frequency.value = frequencia;

  // Fade out para o som não acabar com um estalido.
  ganho.gain.setValueAtTime(volume, agora);
  ganho.gain.exponentialRampToValueAtTime(0.001, fim);

  oscilador.connect(ganho).connect(contexto.destination);
  oscilador.start(agora);
  oscilador.stop(fim);
}

/** Bip curto dos últimos 3 segundos. */
export function bipContagem(): void {
  bip(880, 120, 0.2, "sine");
}

/** Buzina longa e aguda: começa o trabalho. */
export function buzinaTrabalho(): void {
  bip(1046, 700, 0.3);
}

/** Buzina grave: começa o descanso. */
export function buzinaDescanso(): void {
  bip(392, 500, 0.3);
}

/** Dois bips rápidos a meio do trabalho. */
export function bipMeio(): void {
  bip(1318, 80, 0.15, "sine");
  setTimeout(() => bip(1318, 80, 0.15, "sine"), 140);
}

/** Quatro notas a subir no fim do treino. */
export function somFim(): void {
  [523, 659, 784, 1046].forEach((freq, i) => {
    setTimeout(() => bip(freq, i === 3 ? 900 : 180, 0.3), i * 200);
  });
}
