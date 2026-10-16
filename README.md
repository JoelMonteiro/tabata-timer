# Tabata Timer

Timer de Tabata para CrossFit e treino HIIT, feito em TypeScript com Vite.
Funciona no browser do PC e do telemóvel.

- 20 s de trabalho / 10 s de descanso × 8 rondas (tudo configurável)
- Vários Tabatas seguidos (ciclos), com pausa entre eles
- Um exercício por Tabata (Burpees, Air squats...)
- Registo de reps por ronda e pontuação no estilo CrossFit (a ronda com menos reps)
- Treinos rápidos prontos a usar e treinos guardados
- Buzinas, contagem 3-2-1, aviso a meio do trabalho e vibração

## Correr

```powershell
cd [repo]\tabata-timer
npm install
npm run dev
```

Outros comandos:

- `npm run verificar` só verifica os tipos, sem gerar nada.
- `npm run build` gera a versão final na pasta `dist`.
- `npm run preview` serve a versão final, já com o modo offline (PWA).

## O package.json explicado

O `package.json` não aceita comentários, por isso fica explicado aqui.
Define o nome do projeto, as dependências e os comandos.

- `"type": "module"`: o projeto usa `import`/`export` (a forma moderna).
- `"scripts"`: os comandos que corres com `npm run <nome>`.
  - `dev`: arranca o Vite em modo de desenvolvimento, que atualiza a página sempre que gravas.
  - `build`: primeiro `tsc` (verifica os tipos), depois `vite build` (gera a pasta `dist`).
  - `preview`: serve a pasta `dist` para testares a versão final.
  - `verificar`: só corre o `tsc`.
- `"devDependencies"`: pacotes que só são precisos para desenvolver.
  O `npm install` descarrega-os para a pasta `node_modules`.
  - `typescript`: o compilador.
  - `vite`: o servidor de desenvolvimento, que também gera a versão final.
  - O `~` e o `^` antes da versão dizem que atualizações o `npm install` pode aceitar.

## Ficheiros

| Ficheiro | O que faz |
| --- | --- |
| `index.html` | Os três ecrãs: configurar, treino e resumo |
| `src/tipos.ts` | Os tipos: `Fase`, `ConfigTabata`, `EstadoTimer`, `RegistoReps`... |
| `src/predefinicoes.ts` | Os treinos rápidos (Tabata clássico, Tabata This!...) |
| `src/timer.ts` | A classe `Timer`, o motor que conta o tempo (sem HTML) |
| `src/som.ts` | Buzinas e bips gerados com a Web Audio API |
| `src/armazenamento.ts` | Treinos guardados no `localStorage` |
| `src/main.ts` | Liga o HTML ao `Timer`: cliques, campos, reps e resumo |
| `src/style.css` | Visual e cores por fase |
| `public/` | Ícone, manifest e service worker (PWA) |

Ordem sugerida de leitura: `tipos.ts`, depois `timer.ts`, depois `main.ts`.

## Cores

| Fase | Cor |
| --- | --- |
| Preparação | Amarelo |
| Trabalho | Vermelho |
| Descanso | Verde |
| Pausa entre Tabatas | Azul |
| Em pausa | Cinzento |

## Atalhos durante o treino

- Espaço: pausa / retomar
- Seta para a direita: saltar fase
- Setas cima / baixo: +1 / −1 rep
