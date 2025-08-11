"use strict";

const bannerEl = document.getElementById("banner");
const AUTO_RESET_MS = 1600; // thời gian hiển thị kết quả trước khi tự reset

function showBanner(type){
  // type: "X" | "O" | "D"
  bannerEl.className = "banner"; // clear
  if(type === "X"){ bannerEl.classList.add("show","xwin"); bannerEl.textContent = "X"; }
  else if(type === "O"){ bannerEl.classList.add("show","owin"); bannerEl.textContent = "O"; }
  else { bannerEl.classList.add("show","draw"); bannerEl.textContent = "HÒA"; }
}

function hideBanner(){
  bannerEl.classList.remove("show","xwin","owin","draw");
  bannerEl.textContent = "";
}

const cells = Array.from(document.querySelectorAll(".cell"));
const announceEl = document.getElementById("announce");
const btnNew = document.getElementById("btnNew");
const btnReset = document.getElementById("btnReset");

const scoreXEl = document.getElementById("scoreX");
const scoreOEl = document.getElementById("scoreO");
const scoreDEl = document.getElementById("scoreD");

const modeSel = document.getElementById("mode");           // "human" | "bot"
const levelSel = document.getElementById("level");         // "easy" | "medium" | "hard"
const humanSel = document.getElementById("humanSymbol");   // "X" | "O"
const firstSel = document.getElementById("first");         // "X" | "O" | "auto"

// ====== Trạng thái ======
const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // hàng
  [0,3,6],[1,4,7],[2,5,8], // cột
  [0,4,8],[2,4,6]          // chéo
];

let board = Array(9).fill(null);   // 'X' | 'O' | null
let turn = "X";
let locked = false;

let mode = modeSel.value;
let level = levelSel.value;
let humanSymbol = humanSel.value;

const SCORE_KEY = "ttt-score-v1";
const score = loadScore();
renderScore();

// ====== Điểm số ======
function loadScore(){
  try{
    const raw = localStorage.getItem(SCORE_KEY);
    if(!raw) return { X:0, O:0, D:0 };
    const p = JSON.parse(raw);
    return { X: p.X|0, O: p.O|0, D: p.D|0 };
  }catch{ return { X:0, O:0, D:0 }; }
}
function saveScore(){ localStorage.setItem(SCORE_KEY, JSON.stringify(score)); }
function renderScore(){
  scoreXEl.textContent = String(score.X);
  scoreOEl.textContent = String(score.O);
  scoreDEl.textContent = String(score.D);
}

// ====== Tiện ích ======
function setAnnouncement(msg){ announceEl.textContent = msg; }

function clearBoardUI(){
  cells.forEach(c=>{
    c.textContent = "";
    c.removeAttribute("data-mark");
    c.classList.remove("win");
    c.disabled = false;
  });
}

function resetBoard(keepTurn = true){
  board.fill(null);
  locked = false;
  clearBoardUI();
  if(!keepTurn) turn = "X";
  setAnnouncement(`Lượt của ${turn}`);
  // focus ô đầu để thuận tiện bàn phím
  cells[0].focus({preventScroll:true});
}

function startRoundFromOptions(){
  // cập nhật tùy chọn
  mode = modeSel.value;
  level = levelSel.value;
  humanSymbol = humanSel.value;

  // xác định người đi trước
  const first = firstSel.value === "auto"
    ? (Math.random() < 0.5 ? "X" : "O")
    : firstSel.value;

  turn = first;
  resetBoard(true);
  setAnnouncement(`Ván mới — ${turn} đi trước`);
  maybeBotTurn(); // nếu đến lượt máy -> đánh
}

function endRound(winner){
  // winner: "X" | "O" | "D"
  locked = true;
  cells.forEach(c => c.disabled = true);

  if(winner === "D"){
    score.D++; setAnnouncement("Hòa! Chuẩn bị ván mới…");
  }else{
    score[winner]++; setAnnouncement(`Người thắng: ${winner}. Chuẩn bị ván mới…`);
  }
  saveScore();
  renderScore();

  // Hiển thị banner lớn (X/O/HÒA)
  showBanner(winner === "D" ? "D" : winner);

  // Tự reset sau 1.6s — giữ đúng tùy chọn người đi trước
  setTimeout(()=>{
    hideBanner();
    startRoundFromOptions(); // random nếu bạn để “Ngẫu nhiên”, còn lại giữ như đã chọn
  }, AUTO_RESET_MS);
}

function getWinner(){
  for(const [a,b,c] of WIN_LINES){
    const va = board[a], vb = board[b], vc = board[c];
    if(va && va === vb && vb === vc){
      return { player: va, line: [a,b,c] };
    }
  }
  return null;
}

// ====== Lượt đi ======
function handleMove(i){
  if(locked) return;
  if(board[i]) return;

  board[i] = turn;
  cells[i].textContent = turn;
  cells[i].setAttribute("data-mark", turn);

  const win = getWinner();
  if(win){
    win.line.forEach(idx => cells[idx].classList.add("win"));
    endRound(win.player);
    return;
  }
  if(board.every(Boolean)){ endRound("D"); return; }

  turn = (turn === "X") ? "O" : "X";
  setAnnouncement(`Lượt của ${turn}`);
  maybeBotTurn();
}

// ====== Bàn phím (di chuyển bằng mũi tên) ======
cells.forEach((cell) => {
  const i = Number(cell.dataset.i);

  cell.addEventListener("click", () => handleMove(i));

  cell.addEventListener("keydown", (e) => {
    const key = e.key;
    const row = Math.floor(i / 3);
    const col = i % 3;

    let targetIndex = i;
    if(key === "ArrowLeft"){ targetIndex = row*3 + ((col+2)%3); }
    else if(key === "ArrowRight"){ targetIndex = row*3 + ((col+1)%3); }
    else if(key === "ArrowUp"){ targetIndex = ((row+2)%3)*3 + col; }
    else if(key === "ArrowDown"){ targetIndex = ((row+1)%3)*3 + col; }
    else return;

    e.preventDefault();
    cells[targetIndex].focus();
  });
});

// ====== Nút ======
btnNew.addEventListener("click", startRoundFromOptions);

btnReset.addEventListener("click", () => {
  score.X = score.O = score.D = 0;
  saveScore();
  renderScore();
  turn = "X";
  resetBoard(false);
  setAnnouncement("Đã reset tất cả — lượt của X");
});

// Đổi tùy chọn -> bắt đầu ván mới ngay (trải nghiệm giống Google)
[modeSel, levelSel, humanSel, firstSel].forEach(el=>{
  el.addEventListener("change", startRoundFromOptions);
});

// ====== Máy đánh (AI) ======
function maybeBotTurn(){
  if(mode !== "bot") return;
  const botSymbol = (humanSymbol === "X") ? "O" : "X";
  if(turn !== botSymbol) return;

  setTimeout(()=>{
    const idx = pickBotMove(botSymbol, level);
    if (idx != null) handleMove(idx);
  }, 280); // delay nhỏ để có cảm giác "suy nghĩ"
}

function pickBotMove(bot, lvl){
  const empties = board
    .map((v,i)=> v ? null : i)
    .filter(i=> i!==null);

  if(empties.length === 0) return null;

  if(lvl === "easy"){
    return empties[Math.floor(Math.random()*empties.length)];
  }

  if(lvl === "medium"){
    // 1) nếu có nước thắng -> lấy
    for(const i of empties){
      board[i] = bot;
      if(getWinner()?.player === bot){ board[i]=null; return i; }
      board[i] = null;
    }
    // 2) chặn đối thủ
    const opp = bot === "X" ? "O":"X";
    for(const i of empties){
      board[i] = opp;
      if(getWinner()?.player === opp){ board[i]=null; return i; }
      board[i] = null;
    }
    // 3) ưu tiên ô giữa, góc, cạnh (heuristic nhẹ)
    if(!board[4]) return 4;
    const corners = empties.filter(i => [0,2,6,8].includes(i));
    if(corners.length) return corners[Math.floor(Math.random()*corners.length)];
    return empties[Math.floor(Math.random()*empties.length)];
  }

  // hard = minimax (bất bại)
  return bestMoveMinimax(bot);
}

function bestMoveMinimax(bot){
  let bestScore = -Infinity;
  let move = null;
  for (let i=0;i<9;i++){
    if(!board[i]){
      board[i]=bot;
      const score = minimax(false, bot);
      board[i]=null;
      if(score>bestScore){ bestScore=score; move=i; }
    }
  }
  return move;
}

function minimax(isMaximizing, bot){
  const winner = getWinner();
  if(winner){
    if(winner.player === bot) return 10;
    return -10;
  }
  if(board.every(Boolean)) return 0; // hòa

  const me = bot;
  const opp = bot === "X" ? "O":"X";
  let best = isMaximizing ? -Infinity : Infinity;

  for(let i=0;i<9;i++){
    if(!board[i]){
      board[i] = isMaximizing ? me : opp;
      const score = minimax(!isMaximizing, bot);
      board[i] = null;
      best = isMaximizing ? Math.max(best, score) : Math.min(best, score);
    }
  }
  return best;
}

// ====== Khởi tạo ======
startRoundFromOptions();
