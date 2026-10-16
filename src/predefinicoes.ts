// =============================================================
// predefinicoes.ts — os "Treinos rápidos" do ecrã inicial.
// Para acrescentar um, copia um bloco { ... } e muda os valores.
// =============================================================

import type { Predefinicao } from "./tipos.ts";

export const PREDEFINICOES: Predefinicao[] = [
  {
    nome: "Tabata clássico",
    descricao: "20 s / 10 s × 8 rondas",
    config: {
      preparacaoSeg: 10,
      trabalhoSeg: 20,
      descansoSeg: 10,
      rondas: 8,
      ciclos: 1,
      descansoCicloSeg: 60,
      exercicios: [],
    },
  },
  {
    nome: "Tabata This!",
    descricao: "5 Tabatas: row, squat, pull-up, push-up, sit-up",
    config: {
      preparacaoSeg: 10,
      trabalhoSeg: 20,
      descansoSeg: 10,
      rondas: 8,
      ciclos: 5,
      descansoCicloSeg: 60,
      exercicios: ["Row", "Air squats", "Pull-ups", "Push-ups", "Sit-ups"],
    },
  },
  {
    nome: "Tabata duplo",
    descricao: "2 Tabatas com 1 min de pausa",
    config: {
      preparacaoSeg: 10,
      trabalhoSeg: 20,
      descansoSeg: 10,
      rondas: 8,
      ciclos: 2,
      descansoCicloSeg: 60,
      exercicios: ["Burpees", "Kettlebell swings"],
    },
  },
  {
    nome: "Iniciante",
    descricao: "15 s / 15 s × 8 rondas",
    config: {
      preparacaoSeg: 10,
      trabalhoSeg: 15,
      descansoSeg: 15,
      rondas: 8,
      ciclos: 1,
      descansoCicloSeg: 60,
      exercicios: [],
    },
  },
];
