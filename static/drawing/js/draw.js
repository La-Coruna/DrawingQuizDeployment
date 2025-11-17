const canvas = document.getElementById('board');
const gridEl = document.getElementById('grid');
const stage = document.getElementById('stage');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// UI elements
const penBtn = document.getElementById('penBtn');
const eraserBtn = document.getElementById('eraserBtn');
const colorInput = document.getElementById('color');
const sizeInput = document.getElementById('size');
const opacityInput = document.getElementById('opacity');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const uploadBtn = document.getElementById('uploadBtn');
const uploadUrlInput = document.getElementById('uploadUrl');
const gridBtn = document.getElementById('gridBtn');
const fitBtn = document.getElementById('fitBtn');
const squareBtn = document.getElementById('squareBtn');
const bgColorInput = document.getElementById('bgcolor');
const bgInclude = document.getElementById('bgInclude');
const bgBakeBtn = document.getElementById('bgBake');
const bgClearBtn = document.getElementById('bgClear');
const refreshBtn = document.getElementById('refreshTopicBtn');
const subjectInput = document.getElementById('subject');

// Drawing state
let tool = 'pen';
let drawing = false;
let last = null;

// Size mode state
let sizingMode = 'square'; // 'fit' | 'square'
const SQUARE_PX = 512;

const MAX_HISTORY = 50;
const history = [];
let hIdx = -1;

function resizeWithBackup(targetCssW, targetCssH) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    // 1) 백업
    let backup = null;
    if (canvas.width > 0 && canvas.height > 0) {
    backup = document.createElement('canvas');
    backup.width = canvas.width; backup.height = canvas.height;
    backup.getContext('2d').drawImage(canvas, 0, 0);
    }
    // 2) 리사이즈
    canvas.width = Math.floor(targetCssW * dpr);
    canvas.height = Math.floor(targetCssH * dpr);
    canvas.style.width = targetCssW + 'px';
    canvas.style.height = targetCssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 3) 복원(스케일)
    if (backup) {
    // ✅ 스케일 없이 붙여넣기(바깥쪽은 잘라냄) — 가운데 정렬
    const copyW = Math.min(backup.width, canvas.width);
    const copyH = Math.min(backup.height, canvas.height);
    // 소스/대상 중앙 정렬 좌표(디바이스 픽셀 기준)
    const srcX = Math.floor((backup.width  - copyW) / 2);
    const srcY = Math.floor((backup.height - copyH) / 2);
    const dstX = Math.floor((canvas.width  - copyW) / 2);
    const dstY = Math.floor((canvas.height - copyH) / 2);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // 픽셀 단위 복사
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // src:(srcX,srcY,copyW,copyH) → dst:(dstX,dstY,copyW,copyH)
    ctx.drawImage(backup, srcX, srcY, copyW, copyH, dstX, dstY, copyW, copyH);
    ctx.restore();
    }
    updateButtons();
}

function setSize() {
    if (sizingMode === 'fit') {
    const rect = stage.getBoundingClientRect();
    resizeWithBackup(rect.width, rect.height);
    } else if (sizingMode === 'square') {
    resizeWithBackup(SQUARE_PX, SQUARE_PX);
    }
} {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = stage.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // 리사이즈 시 히스토리를 푸시하면 undo/redo 흐름이 끊기므로 여기서는 푸시하지 않음
    updateButtons();
}

// Initialize size after mount
const resizeObserver = new ResizeObserver(() => { if (sizingMode === 'fit') setSize(); }); /* 히스토리 푸시는 setSize 안에서 하지 않음 */
resizeObserver.observe(stage);

function updateButtons() {
    undoBtn.disabled = hIdx <= 0;
    redoBtn.disabled = hIdx >= history.length - 1 || history.length === 0;
    if (tool === 'pen') {
    penBtn.classList.add('primary');
    eraserBtn.classList.remove('primary');
    } else {
    eraserBtn.classList.add('primary');
    penBtn.classList.remove('primary');
    }
}

function pushHistory() {
    try {
    const snapshot = canvas.toDataURL('image/png');
    // 가지치기: 현재 인덱스 이후(redo 영역) 제거
    if (hIdx < history.length - 1) {
        history.splice(hIdx + 1);
    }
    history.push(snapshot);
    if (history.length > MAX_HISTORY) history.shift();
    // 최신 인덱스 갱신
    hIdx = history.length - 1;
    } catch (e) { /* no-op */ }

}

function restoreFrom(dataURL) {
    const img = new Image();
    img.onload = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    // 픽셀 기준으로 전체 지우기
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // 스케일 영향 없이 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 히스토리 스냅샷은 "픽셀 크기(canvas.width/height)" 기준이므로
    // 현재 dpr 스케일과 중복되지 않게 CSS 크기로 그려준다.
    // CSS 크기 = 내부픽셀 / dpr
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 현재 렌더 스케일 복원
    ctx.drawImage(img, 0, 0, cssW, cssH);
    ctx.restore();
    updateButtons();
    };
    img.src = dataURL;
}

function undo() {
    if (hIdx <= 0) return;
    hIdx -= 1;
    restoreFrom(history[hIdx]);
    updateButtons();
}

function redo() {
    if (hIdx >= history.length - 1) return;
    hIdx += 1;
    restoreFrom(history[hIdx]);
    updateButtons();
}

function setTool(next) { tool = next; updateButtons(); }

function getStrokeStyle() {
    const color = colorInput.value;
    const alpha = parseFloat(opacityInput.value || '1');
    // 색상 + 불투명도
    const rgba = hexToRgba(color, alpha);
    return rgba;
}

function hexToRgba(hex, a=1) {
    const m = hex.replace('#','');
    const bigint = parseInt(m.length===3 ? m.split('').map(x=>x+x).join('') : m, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function beginStroke(x, y, pressure=1) {
    drawing = true; last = {x, y};
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = (parseInt(sizeInput.value, 10) || 8) * (pressure || 1);
    if (tool === 'pen') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = getStrokeStyle();
    } else {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    }
}

function drawStroke(x, y, pressure=1) {
    if (!drawing || !last) return;
    const w = (parseInt(sizeInput.value, 10) || 8) * (pressure || 1);
    ctx.lineWidth = w;
    // 간단한 스무딩: 직전점과의 중간점으로 quadraticCurveTo
    const midX = (last.x + x) / 2;
    const midY = (last.y + y) / 2;
    ctx.quadraticCurveTo(last.x, last.y, midX, midY);
    ctx.stroke();
    last = {x, y};
}

function endStroke() {
    if (!drawing) return;
    drawing = false; last = null;
    pushHistory();
    updateButtons();
}

// Pointer events (마우스/펜/터치 통합)
canvas.addEventListener('pointerdown', (e) => {
    const {x, y} = getCanvasPos(e);
    canvas.setPointerCapture(e.pointerId);
    beginStroke(x, y, e.pressure || 1);
    e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const {x, y} = getCanvasPos(e);
    drawStroke(x, y, e.pressure || 1);
    e.preventDefault();
});
canvas.addEventListener('pointerup', (e) => { endStroke(); e.preventDefault(); });
canvas.addEventListener('pointercancel', (e) => { endStroke(); e.preventDefault(); });

function getCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left);
    const y = (evt.clientY - rect.top);
    return { x, y };
}

// Buttons
penBtn.addEventListener('click', () => setTool('pen'));
eraserBtn.addEventListener('click', () => setTool('eraser'));
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

clearBtn.addEventListener('click', () => {
    if (!confirm('전체를 지울까요?')) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pushHistory();
    updateButtons();
});

saveBtn.addEventListener('click', savePNG);

// 서버 업로드 버튼
uploadBtn.addEventListener('click', () => { uploadPNG().catch(err => alert('업로드 실패: ' + (err?.message || err))); });

if (refreshBtn && subjectInput) {
    console.log("asdf");
  refreshBtn.addEventListener('click', async () => {
    try {
      refreshBtn.disabled = true;
      const resp = await fetch('/drawing/random-topic/');
      if (!resp.ok) throw new Error("서버 응답 오류");
      const data = await resp.json();
      subjectInput.value = data.topic;
    } catch (err) {
      console.error(err);
      alert("❌ 새 주제 불러오기 실패");
    } finally {
      refreshBtn.disabled = false;
    }
  });
}

if (gridBtn) {
    gridBtn.addEventListener('click', () => {
    gridEl.classList.toggle('show');
    });
}

// 크기 모드 버튼
function updateSizeButtons() {
    if (sizingMode === 'fit') {
    fitBtn.classList.add('primary');
    squareBtn.classList.remove('primary');
    } else {
    squareBtn.classList.add('primary');
    fitBtn.classList.remove('primary');
    }
}
fitBtn.addEventListener('click', () => { sizingMode = 'fit'; updateSizeButtons(); setSize(); });
squareBtn.addEventListener('click', () => {
    // 정사각형 전환 시 크롭 경고
    if (sizingMode !== 'square') {
    const ok = confirm('정사각형으로 전환하면, 바깥 영역의 그림은 잘려 사라질 수 있어요. 계속하시겠어요?');
    if (!ok) return;
    }
    sizingMode = 'square';
    updateSizeButtons();
    setSize();
});

// 배경 미리보기: 캔버스 스타일 배경만 변경(비파괴)
if (bgColorInput) {
    canvas.style.background = bgColorInput.value; // 초기값 반영
    bgColorInput.addEventListener('input', () => {
    canvas.style.background = bgColorInput.value || 'transparent';
    });
}

// 배경 투명 미리보기
bgClearBtn?.addEventListener('click', () => {
    canvas.style.background = 'transparent';
});

// 배경 굽기(픽셀에 반영, 되돌리기 가능: 히스토리로만)
function bakeBackground(color) {
    const snapshot = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    pushHistory();
    updateButtons();
    };
    img.src = snapshot;
}

bgBakeBtn?.addEventListener('click', () => {
    bakeBackground(bgColorInput?.value || '#10161f');
});

function savePNG() {
    // 배경 포함 옵션이 꺼져 있으면, 캔버스의 투명 픽셀 그대로 저장
    if (!bgInclude || !bgInclude.checked) {
    const link = document.createElement('a');
    link.download = `drawing-${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return;
    }
    // 포함되어 있다면 임시 캔버스에 배경을 깔고 그림을 합성한 뒤 저장
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width; tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = bgColorInput?.value || '#10161f';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.download = `drawing-${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
    link.href = tmp.toDataURL('image/png');
    link.click();
}

async function getPngBlob(includeBg) {
    // includeBg가 true면 배경을 합성한 뒤 PNG Blob 생성
    if (includeBg) {
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width; tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.fillStyle = bgColorInput?.value || '#ffffff';
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(canvas, 0, 0);
    return await new Promise((res) => tmp.toBlob(res, 'image/png'));
    }
    // 투명 포함 그대로 저장
    return await new Promise((res) => canvas.toBlob(res, 'image/png'));
}

async function getCsrfToken() {
    // Django의 csrftoken 쿠키 읽기
    const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

async function uploadPNG() {
  const includeBg = true;
  const blob = await getPngBlob(includeBg);
  const subject = document.getElementById('subject').value || '기타';

  // ✅ SweetAlert2 모달로 제목 입력받기
  const { value: title, isConfirmed, isDismissed } = await Swal.fire({
    title: '그림 제목을 입력하세요',
    input: 'text',
    inputPlaceholder: '예: 여름 바다',
    confirmButtonText: '저장',
    cancelButtonText: '취소',
    showCancelButton: true,
    confirmButtonColor: '#4ea1ff',
    background: '#121821',
    color: '#e8eef7',
    inputAttributes: { autocapitalize: 'off' }
  });

  // case 1) 사용자가 "취소" 눌렀을 때
  if (isDismissed) {
    Swal.fire('🚫 업로드가 취소되었습니다.', '', 'info');
    return;
  }

  // case 2) "확인" 눌렀지만 제목을 비워둔 경우
  if (isConfirmed && (!title || !title.trim())) {
    Swal.fire('⚠️ 제목을 입력해야 합니다.', '', 'warning');
    return;
  }

  // case 3) 정상 입력 시 업로드 진행
  const fd = new FormData();
  fd.append('file', blob, `${title}.png`);
  fd.append('title', title);
  fd.append('subject', subject);

  const csrf = await getCsrfToken();
  const resp = await fetch('/drawing/create', {
    method: 'POST',
    body: fd,
    headers: { 'X-CSRFToken': csrf },
  });

  if (!resp.ok) {
    Swal.fire('❌ 업로드 실패', '', 'error');
    return;
  }

  const data = await resp.json();
  Swal.fire({
    icon: 'success',
    title: '✅ 업로드 완료!',
    html: `<b>${title}</b><br>주제: ${subject}`,
    background: '#121821',
    color: '#e8eef7',
  });
}

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'b') { setTool('pen'); }
    else if (k === 'e') { setTool('eraser'); }
    else if (k === 'g') { gridEl.classList.toggle('show'); }
    else if (e.ctrlKey && !e.shiftKey && k === 'z') { e.preventDefault(); undo(); }
    else if (e.ctrlKey && e.shiftKey && k === 'z') { e.preventDefault(); redo(); }
    else if (e.ctrlKey && k === 's') { e.preventDefault(); uploadPNG(); }
    else if (e.ctrlKey && e.altKey && k === 's') { e.preventDefault(); savePNG(); }
});

// 첫 크기 세팅 및 히스토리 초기화
updateSizeButtons();
setSize();
setTimeout(() => { pushHistory(); updateButtons(); }, 0);

// 휠스크롤 방지
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) { e.preventDefault(); /* 여기서 앱 전용 zoom 변수로 확대/축소 */ }
}, { passive: false });
