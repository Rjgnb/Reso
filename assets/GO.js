/* ======================
   基础常量与状态
====================== */

const SIZE = 19;

let boardState = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ color: 0, step: 0 }))
);

let history = [];
let viewIndex = -1;
let currentPlayer = 1; // 1 == black ||  2 == white
let stepCounter = 0;
let showNumbers = false;
let lastBoardLayout = "";

/* ======================
   Python API（唯一出口）
====================== */

const PythonAPI = {

    async onHum_Move(r,c,color){
        const board = boardState.map(row => row.map(c => c.color));
        return window.pywebview.api.on_play(r, c, color, board);
    },

    async onAI_genMove(r, c, color) {
        const board = boardState.map(row => row.map(c => c.color));
        return window.pywebview.api.on_genmove(r, c, color, board);
    },

    async requestAnalysis(lastR,lastC,opponent) {
        const board = boardState.map(row => row.map(c => c.color));
        return window.pywebview.api.analysis(lastR,lastC,opponent, board);
    },

    async undo() {
        const board = boardState.map(row => row.map(c => c.color));
        return window.pywebview.api.undo(board);
    },

    async reset(){
        return window.pywebview.api.reset();
    }
};

/* ======================
   Python → JS（唯一入口）
====================== */

window.fromPython = {

    place(r, c) {
        tryPlace(r, c);
    },

    log(msg) {
        showLog(msg);
    },

    updateScore(S) {
        showScore(S.score);
    },

    setTerritory(map) {
        console.log("Territory map:", map);
    },

    lock() {
        document.body.style.pointerEvents = "none";
        showLog("AI 思考中…");
    },

    unlock(msg = "AI 已落子") {
        document.body.style.pointerEvents = "auto";
        showLog(msg);
    }
};

/* ======================
   初始化
====================== */

function init() {
    const axisY = document.getElementById("axis-y");
    const axisX = document.getElementById("axis-x");
    const COLUMNS = "ABCDEFGHJKLMNOPQRST".split("");

    for (let i = 19; i >= 1; i--) axisY.innerHTML += `<div>${i}</div>`;
    COLUMNS.forEach(c => axisX.innerHTML += `<div>${c}</div>`);

    const boardEl = document.getElementById("board");

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement("div");
            cell.className = `cell row-${r} col-${c} ${
                [3, 9, 15].includes(r) && [3, 9, 15].includes(c) ? "hoshi" : ""
            }`;
            cell.id = `cell-${r}-${c}`;
            cell.onclick = () => tryPlace(r, c);
            cell.onmouseenter = () => showGhost(r, c);
            cell.onmouseleave = clearGhost;
            boardEl.appendChild(cell);
        }
    }

    updateUI();
}

/* ======================
   交互与落子
====================== */

function showGhost(r, c) {
    if (
        (viewIndex !== history.length - 1 && history.length > 0) ||
        boardState[r][c].color !== 0
    )
        return;

    const cell = document.getElementById(`cell-${r}-${c}`);
    const g = document.createElement("div");
    g.className = `stone ${currentPlayer === 1 ? "black" : "white"} ghost`;
    cell.appendChild(g);
}

function clearGhost() {
    document.querySelectorAll(".ghost").forEach(e => e.remove());
}

function tryPlace(r, c) {
    if (
        (viewIndex !== history.length - 1 && history.length > 0) ||
        boardState[r][c].color !== 0
    )
        return;

    let tempBoard = JSON.parse(JSON.stringify(boardState));
    tempBoard[r][c] = { color: currentPlayer, step: stepCounter + 1 };

    let captured = findCaptures(tempBoard, 3 - currentPlayer);
    captured.forEach(p => (tempBoard[p.r][p.c] = { color: 0, step: 0 }));

    if (
        captured.length === 0 &&
        getLiberties(tempBoard, r, c).length === 0
    ) {
        showLog("此地为禁着点！");
        return;
    }

    let layout = JSON.stringify(tempBoard.map(row => row.map(c => c.color)));
    if (layout === lastBoardLayout) {
        showLog("劫争中，请先寻劫！");
        return;
    }

    clearGhost();
    executeMove(r, c, tempBoard, layout);
}

//判断双方角色

function isCurrentPlayerAI() {
    if (currentPlayer === 1) {
        return document.getElementById("p1-ai").checked;
    } else {
        return document.getElementById("p2-ai").checked;
    }
}

function checkAiTurn() {
    // 必须在最新局面
    if (viewIndex !== history.length - 1 && history.length > 0) return;

    if (!isCurrentPlayerAI()) return;

    fromPython.lock();

    const board = boardState.map(row => row.map(c => c.color));
    const lastColor = 3 - currentPlayer;

    PythonAPI.onAI_genMove(-1, -1, lastColor).then(res => {
        fromPython.unlock();

        if (res?.ai_move) {
            fromPython.place(res.ai_move.r, res.ai_move.c);
        }
        if (res?.log) showLog(res.log);
    });
}


/* ======================
   执行落子（核心）
====================== */

function executeMove(r, c, nextBoard, layout) {
    history.push({
        board: JSON.parse(JSON.stringify(boardState)),
        player: currentPlayer,
        step: stepCounter,
        lastMove: { r, c },
        layout: lastBoardLayout
    });

    lastBoardLayout = JSON.stringify(boardState.map(r => r.map(c => c.color)));
    boardState = nextBoard;

    stepCounter++;
    viewIndex = history.length - 1;

    render(r, c);

    if (isCurrentPlayerAI() === false) {
        PythonAPI.onHum_Move(r, c, currentPlayer).then(res=>
        {
            if (res?.log) showLog(res.log);
        });
    }
    const playedColor = currentPlayer;
    currentPlayer = 3 - currentPlayer;

    updateUI();
    playSfx();

    const isLive = viewIndex === history.length - 1;

    if (isLive && isCurrentPlayerAI()) {
        fromPython.lock();

        PythonAPI.onAI_genMove(r, c, playedColor).then(res => {
            fromPython.unlock();

            if (res?.ai_move) {
                fromPython.place(res.ai_move.r, res.ai_move.c);
            }
            if (res?.log) showLog(res.log);
        });
    }
}

/* ======================
    查看历史局面
   ====================== */

//前|后 一步
function navigate(dir) {
    const target = viewIndex + dir;
    if (target >= -1 && target < history.length) {
        viewIndex = target;
        render();
        updateUI();
    }
}

//回到 开局|最后
function jumpTo(idx) {
    viewIndex = idx - 1; // idx 是第几手
    render();
    updateUI();
}

/* ======================
   渲染
====================== */

function render(lastR, lastC) {
    const currentBoard =
        viewIndex === history.length - 1 || history.length === 0
            ? boardState
            : history[viewIndex + 1].board;

    const lastMove =
        viewIndex >= 0 ? history[viewIndex].lastMove : null;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            const data = currentBoard[r][c];
            cell.innerHTML = "";

            if (data.color !== 0) {
                const s = document.createElement("div");
                s.className = `stone ${data.color === 1 ? "black" : "white"}`;
                if (showNumbers) s.innerText = data.step;
                if (lastMove && r === lastMove.r && c === lastMove.c)
                    s.classList.add("last-move", "new-move");
                cell.appendChild(s);
            }
        }
    }
}

/* ======================
   围棋规则辅助
====================== */

function findCaptures(state, opp) {
    let caps = [];
    let checked = Array.from({ length: SIZE }, () =>
        Array(SIZE).fill(false)
    );

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (state[r][c].color === opp && !checked[r][c]) {
                let g = getGroup(state, r, c);
                g.forEach(p => (checked[p.r][p.c] = true));
                if (getLiberties(state, r, c, g).length === 0) caps.push(...g);
            }
        }
    }
    return caps;
}

function getGroup(state, r, c) {
    const col = state[r][c].color;
    const stack = [{ r, c }];
    const group = [];
    const seen = new Set([`${r},${c}`]);

    while (stack.length) {
        const cur = stack.pop();
        group.push(cur);
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => {
            const nr = cur.r + dr;
            const nc = cur.c + dc;
            const key = `${nr},${nc}`;
            if (
                nr >= 0 && nr < SIZE &&
                nc >= 0 && nc < SIZE &&
                state[nr][nc].color === col &&
                !seen.has(key)
            ) {
                seen.add(key);
                stack.push({ r: nr, c: nc });
            }
        });
    }
    return group;
}

function getLiberties(state, r, c, group = null) {
    if (!group) group = getGroup(state, r, c);
    const libs = new Set();

    group.forEach(p => {
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr, dc]) => {
            const nr = p.r + dr;
            const nc = p.c + dc;
            if (
                nr >= 0 && nr < SIZE &&
                nc >= 0 && nc < SIZE &&
                state[nr][nc].color === 0
            ) {
                libs.add(`${nr},${nc}`);
            }
        });
    });

    return [...libs];
}

/* ======================
   UI 操作
====================== */

function updateUI() {
    document.getElementById("section-p1").classList.toggle("active", currentPlayer === 1);
    document.getElementById("section-p2").classList.toggle("active", currentPlayer === 2);
    document.getElementById("cur-v").innerText = viewIndex + 1;
    document.getElementById("total-v").innerText = history.length;
}

function undo() {
    if (history.length === 0) return;

    PythonAPI.undo().then(res => showLog(res.msg));

    const last = history.pop();
    boardState = last.board;
    currentPlayer = last.player;
    stepCounter = last.step;
    lastBoardLayout = last.layout;
    viewIndex = history.length - 1;

    render();
    updateUI();

    if (isCurrentPlayerAI()){
        undo()
    }
}

function toggleNumbers() {
    showNumbers = !showNumbers;
    document.getElementById("btn-num").classList.toggle("active", showNumbers);
    render();
}

let checkAnalysing = false;
function requestAnalysis() {
    if (checkAnalysing) return;
    checkAnalysing = true;
    let lastR = -1;
    let lastC = -1;
    let opponent = "white"
    if (history.length !== 0) {
        const last = history[history.length - 1];
        lastR = last.lastMove.r
        lastC = last.lastMove.c;
        opponent = currentPlayer === 1 ? "white" : "black"; //对手
    }
    showAnalysis("分析中...");
    PythonAPI.requestAnalysis(lastR,lastC,opponent).then(msg => {showAnalysis(msg);checkAnalysing = false});
}

function showLog(msg) {
    document.getElementById("status-log").innerText = msg;
}

function  showScore(score) {
    document.getElementById("score-info").innerText = score;
}

function  showAnalysis(msg) {
    document.getElementById("ai-log").innerText = msg;
}

function startNewGame() {
    if (!confirm("确定开始新对局？当前对局将被清空")) return;

    PythonAPI.reset().then(res=>{showLog(res.log)});      // 清空棋盘
    history = [];
    curView = 0;

    boardState = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ color: 0, step: 0 }))
);

    viewIndex = -1;
    currentPlayer = 1
    stepCounter = 0;
    lastBoardLayout = "";

    render();
    updateUI();

    showLog("新对局开始");

    checkAiTurn();           // 如果是 AI 先手，立即触发
}


function playSfx() {
    try {
        const ctx = new AudioContext();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = 150;
        g.gain.value = 0.1;
        o.start();
        o.stop(ctx.currentTime + 0.1);
    } catch {}
}

function sleepSync(ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        // 空循环，阻塞主线程
    }
}

/* ======================
   启动
====================== */

init();
