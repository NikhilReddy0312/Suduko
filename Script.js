const GIVENS = { easy: 36, medium: 28, hard: 22 };

let solution = [], puzzle = [], userGrid = [], notes = [];
let selected = null, noteMode = false;
let mistakes = 0, difficulty = 'easy', won = false;
let timerSec = 0, timerInt = null;

// ── Utilities ──────────────────────────────────────────────
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Puzzle Generation ──────────────────────────────────────
function generateSolution() {
  const g = Array.from({ length: 9 }, () => Array(9).fill(0));

  function valid(g, r, c, n) {
    for (let i = 0; i < 9; i++)
      if (g[r][i] === n || g[i][c] === n) return false;
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        if (g[br + i][bc + j] === n) return false;
    return true;
  }

  function solve(g) {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (g[r][c] === 0) {
          for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
            if (valid(g, r, c, n)) {
              g[r][c] = n;
              if (solve(g)) return true;
              g[r][c] = 0;
            }
          }
          return false;
        }
    return true;
  }

  solve(g);
  return g;
}

function makePuzzle(sol, givens) {
  const p = sol.map(r => [...r]);
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0, target = 81 - givens;
  for (const idx of cells) {
    if (removed >= target) break;
    const r = Math.floor(idx / 9), c = idx % 9;
    p[r][c] = 0;
    removed++;
  }
  return p;
}

// ── Game State ─────────────────────────────────────────────
function startGame() {
  clearInterval(timerInt);
  timerSec = 0;
  document.getElementById('timer').textContent = '0:00';
  won = false; mistakes = 0; noteMode = false; selected = null;
  document.getElementById('mistakeCount').textContent = '0';
  document.getElementById('status').textContent = '';
  document.getElementById('status').className = 'sdk-status';

  solution = generateSolution();
  puzzle   = makePuzzle(solution, GIVENS[difficulty]);
  userGrid = puzzle.map(r => [...r]);
  notes    = Array.from({ length: 9 }, () =>
               Array.from({ length: 9 }, () => new Set()));

  renderGrid();
  updateNoteBtn();

  timerInt = setInterval(() => {
    if (won) return;
    timerSec++;
    const m = Math.floor(timerSec / 60), s = timerSec % 60;
    document.getElementById('timer').textContent =
      m + ':' + (s < 10 ? '0' : '') + s;
  }, 1000);
}

// ── Rendering ──────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'sdk-cell';
      if (c === 2 || c === 5) cell.classList.add('border-right');
      if (r === 2 || r === 5) cell.classList.add('border-bottom');

      const isGiven = puzzle[r][c] !== 0;
      if (isGiven) cell.classList.add('given');

      const val = userGrid[r][c];
      if (selected && selected[0] === r && selected[1] === c)
        cell.classList.add('selected');
      if (selected && val && val === userGrid[selected[0]][selected[1]] &&
          !(selected[0] === r && selected[1] === c))
        cell.classList.add('same-num');
      if (val && !isGiven && val !== solution[r][c])
        cell.classList.add('error');

      if (val) {
        cell.textContent = val;
      } else if (notes[r][c].size > 0) {
        const nd = document.createElement('div');
        nd.className = 'sdk-notes';
        for (let n = 1; n <= 9; n++) {
          const ns = document.createElement('div');
          ns.className = 'sdk-note';
          ns.textContent = notes[r][c].has(n) ? n : '';
          nd.appendChild(ns);
        }
        cell.appendChild(nd);
      }

      cell.addEventListener('click', () => selectCell(r, c));
      grid.appendChild(cell);
    }
  }
}

function renderNumpad() {
  const pad = document.getElementById('numpad');
  pad.innerHTML = '';

  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('div');
    btn.className = 'sdk-num';
    btn.textContent = n;
    btn.addEventListener('click', () => inputNum(n));
    pad.appendChild(btn);
  }

  const erase = document.createElement('div');
  erase.className = 'sdk-num erase';
  erase.textContent = 'Erase';
  erase.addEventListener('click', eraseCell);
  pad.appendChild(erase);

  const noteBtn = document.createElement('div');
  noteBtn.className = 'sdk-num note-toggle';
  noteBtn.id = 'noteToggleBtn';
  noteBtn.textContent = '✏ Notes';
  noteBtn.addEventListener('click', () => { noteMode = !noteMode; updateNoteBtn(); });
  pad.appendChild(noteBtn);
}

function updateNoteBtn() {
  const btn = document.getElementById('noteToggleBtn');
  if (btn) btn.classList.toggle('active', noteMode);
}

// ── Interactions ───────────────────────────────────────────
function selectCell(r, c) {
  if (won) return;
  selected = [r, c];
  renderGrid();
}

function inputNum(n) {
  if (!selected || won) return;
  const [r, c] = selected;
  if (puzzle[r][c] !== 0) return;

  if (noteMode) {
    if (userGrid[r][c]) return;
    if (notes[r][c].has(n)) notes[r][c].delete(n);
    else notes[r][c].add(n);
    renderGrid();
    return;
  }

  notes[r][c].clear();
  if (userGrid[r][c] === n) { userGrid[r][c] = 0; renderGrid(); return; }
  userGrid[r][c] = n;

  if (n !== solution[r][c]) {
    mistakes++;
    document.getElementById('mistakeCount').textContent = mistakes;
    if (mistakes >= 3) {
      document.getElementById('status').textContent =
        'Too many mistakes — try a new game!';
      won = true;
      clearInterval(timerInt);
    }
  }

  renderGrid();
  checkWin();
}

function eraseCell() {
  if (!selected || won) return;
  const [r, c] = selected;
  if (puzzle[r][c] !== 0) return;
  userGrid[r][c] = 0;
  notes[r][c].clear();
  renderGrid();
}

function giveHint() {
  if (won) return;
  const empties = [];
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (userGrid[r][c] === 0) empties.push([r, c]);
  if (!empties.length) return;

  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  userGrid[r][c] = solution[r][c];
  notes[r][c].clear();
  selected = [r, c];
  renderGrid();

  const el = document.getElementById('grid').children[r * 9 + c];
  el.classList.add('hint-flash');
  setTimeout(() => el.classList.remove('hint-flash'), 800);
}

function checkWin() {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (userGrid[r][c] !== solution[r][c]) return;
  won = true;
  clearInterval(timerInt);
  const m = Math.floor(timerSec / 60), s = timerSec % 60;
  document.getElementById('status').textContent =
    'Solved in ' + (m > 0 ? m + 'm ' : '') + s + 's — well done!';
  document.getElementById('status').className = 'sdk-status win';
}

// ── Event Listeners ────────────────────────────────────────
document.getElementById('newBtn').addEventListener('click', startGame);
document.getElementById('hintBtn').addEventListener('click', giveHint);

document.querySelectorAll('.sdk-diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = btn.dataset.d;
    document.querySelectorAll('.sdk-diff-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    startGame();
  });
});

document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= '9') inputNum(parseInt(e.key));
  if (e.key === 'Backspace' || e.key === 'Delete') eraseCell();
  if (e.key === 'n' || e.key === 'N') { noteMode = !noteMode; updateNoteBtn(); }
  if (selected && !won) {
    const [r, c] = selected;
    if (e.key === 'ArrowUp'    && r > 0) selectCell(r - 1, c);
    if (e.key === 'ArrowDown'  && r < 8) selectCell(r + 1, c);
    if (e.key === 'ArrowLeft'  && c > 0) selectCell(r, c - 1);
    if (e.key === 'ArrowRight' && c < 8) selectCell(r, c + 1);
  }
});

// ── Init ───────────────────────────────────────────────────
renderNumpad();
startGame();