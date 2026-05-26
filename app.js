// ─── Estado ───────────────────────────────────────────
let transacciones    = JSON.parse(localStorage.getItem('transacciones')) || [];
let ahorros          = JSON.parse(localStorage.getItem('ahorros'))       || [];
let metaAhorro       = parseFloat(localStorage.getItem('metaAhorro'))    || 0;
let categorias       = JSON.parse(localStorage.getItem('categorias'))    || [
  { id: 'general',  nombre: 'General',      emoji: '🏷️' },
  { id: 'comida',   nombre: 'Comida',        emoji: '🍔' },
  { id: 'salud',    nombre: 'Salud',         emoji: '🏥' },
  { id: 'educacion',nombre: 'Educación',     emoji: '📚' },
  { id: 'ropa',     nombre: 'Ropa',          emoji: '👕' },
  { id: 'hogar',    nombre: 'Hogar',         emoji: '🏠' },
];
let tipoSeleccionado     = 'ingreso';
let editTipoSeleccionado = 'ingreso';
let emojiSeleccionado    = '🏷️';
let grafico = null;

// ─── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  mostrarMes();
  setFechasHoy();
  initNav();
  initChips('#tipo-chips', t => tipoSeleccionado = t);
  initChips('#edit-tipo-chips', t => editTipoSeleccionado = t);
  initModals();
  cargarCategorias();
  renderizar();

  document.getElementById('btn-agregar').addEventListener('click', agregarTransaccion);
  document.getElementById('btn-agregar-ahorro').addEventListener('click', agregarAhorro);
  document.getElementById('btn-guardar-meta').addEventListener('click', guardarMetaAhorro);
  document.getElementById('btn-cerrar-mes').addEventListener('click', abrirModalCierre);
  document.getElementById('btn-nueva-cat').addEventListener('click', () => abrirModal('modal-cat-overlay'));
  document.getElementById('btn-analizar-ia').addEventListener('click', abrirAnalisisIA);
  document.getElementById('btn-cerrar-ia').addEventListener('click', () => cerrarModal('modal-ia-overlay'));
});

// ─── Mes ──────────────────────────────────────────────
function mostrarMes() {
  const texto = new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
  document.getElementById('mes-actual').textContent = texto;
  document.getElementById('badge-mes').textContent  = texto;
}

function setFechasHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  ['fecha','ahorro-fecha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = hoy;
  });
}

// ─── Nav ──────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('screen-' + screen).classList.add('active');
    });
  });
}

// ─── Chips tipo ───────────────────────────────────────
function initChips(selector, onSelect) {
  document.querySelectorAll(selector + ' .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll(selector + ' .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      onSelect(chip.dataset.tipo);
    });
  });
}

function setChipActivo(selector, tipo) {
  document.querySelectorAll(selector + ' .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.tipo === tipo);
  });
}

// ─── Categorías ───────────────────────────────────────
function guardarCategorias() {
  localStorage.setItem('categorias', JSON.stringify(categorias));
}

function cargarCategorias() {
  llenarSelectCategorias('categoria-select');
  llenarSelectCategorias('edit-categoria-select');
}

function llenarSelectCategorias(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const val = sel.value;
  sel.innerHTML = categorias.map(c =>
    `<option value="${c.id}">${c.emoji} ${c.nombre}</option>`
  ).join('');
  if (val) sel.value = val;
}

// ─── Modales ──────────────────────────────────────────
function abrirModal(id) {
  document.getElementById(id).classList.add('open');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('open');
}

function initModals() {
  // Config
  document.getElementById('btn-config').addEventListener('click', () => {
    document.getElementById('modal-meta-input').value = metaAhorro || '';
    abrirModal('modal-overlay');
  });
  document.getElementById('modal-cancel').addEventListener('click', () => cerrarModal('modal-overlay'));
  document.getElementById('modal-save').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('modal-meta-input').value);
    if (!isNaN(val) && val >= 0) {
      metaAhorro = val;
      localStorage.setItem('metaAhorro', metaAhorro);
      document.getElementById('meta-ahorro-input').value = metaAhorro || '';
      renderizar();
      mostrarToast('✅ Meta guardada');
    }
    cerrarModal('modal-overlay');
  });

  // Edit transacción
  document.getElementById('btn-guardar-edicion').addEventListener('click', guardarEdicion);
  document.getElementById('btn-cancelar-edicion').addEventListener('click', () => cerrarModal('modal-edit-overlay'));

  // Nueva categoría
  document.getElementById('btn-crear-cat').addEventListener('click', crearCategoria);
  document.getElementById('btn-cancelar-cat').addEventListener('click', () => cerrarModal('modal-cat-overlay'));
  document.querySelectorAll('#emoji-picker .emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#emoji-picker .emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      emojiSeleccionado = btn.dataset.emoji;
    });
  });

  // Cerrar mes
  document.getElementById('btn-confirmar-cierre').addEventListener('click', confirmarCierreMes);
  document.getElementById('btn-cancelar-cierre').addEventListener('click', () => cerrarModal('modal-cierre-overlay'));

  // Click backdrop
  ['modal-overlay','modal-edit-overlay','modal-cat-overlay','modal-cierre-overlay','modal-ia-overlay'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target.id === id) cerrarModal(id);
    });
  });
}

// ─── Guardar meta ─────────────────────────────────────
function guardarMetaAhorro() {
  const val = parseFloat(document.getElementById('meta-ahorro-input').value);
  if (isNaN(val) || val < 0) { mostrarToast('⚠️ Ingresá un monto válido'); return; }
  metaAhorro = val;
  localStorage.setItem('metaAhorro', metaAhorro);
  renderizar();
  mostrarToast('✅ Meta guardada: ' + formatear(metaAhorro));
}

// ─── Agregar transacción ──────────────────────────────
function agregarTransaccion() {
  const descripcion = document.getElementById('descripcion').value.trim();
  const monto       = parseFloat(document.getElementById('monto').value);
  const fechaInput  = document.getElementById('fecha').value;
  const categoriaId = document.getElementById('categoria-select').value;

  if (!descripcion)               { mostrarToast('⚠️ Escribí una descripción'); return; }
  if (isNaN(monto) || monto <= 0) { mostrarToast('⚠️ Ingresá un monto válido'); return; }
  if (!fechaInput)                { mostrarToast('⚠️ Seleccioná una fecha'); return; }

  const fecha = new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-CR');
  transacciones.push({ id: Date.now(), descripcion, monto, tipo: tipoSeleccionado, fecha, categoriaId });
  guardar();
  renderizar();

  document.getElementById('descripcion').value = '';
  document.getElementById('monto').value = '';

  const labels = { ingreso: '💰 Ingreso', gasto: '🛒 Gasto', 'gasto-fijo': '📋 Gasto fijo', gasolina: '⛽ Gasolina' };
  mostrarToast(labels[tipoSeleccionado] + ' agregado');
}

// ─── Editar transacción ───────────────────────────────
function abrirEdicion(id) {
  const t = transacciones.find(x => x.id === id);
  if (!t) return;

  document.getElementById('edit-id').value          = id;
  document.getElementById('edit-descripcion').value = t.descripcion;
  document.getElementById('edit-monto').value       = t.monto;

  // fecha inversa es-CR → YYYY-MM-DD
  const parts = t.fecha.split('/');
  if (parts.length === 3) {
    document.getElementById('edit-fecha').value = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }

  editTipoSeleccionado = t.tipo;
  setChipActivo('#edit-tipo-chips', t.tipo);

  llenarSelectCategorias('edit-categoria-select');
  if (t.categoriaId) document.getElementById('edit-categoria-select').value = t.categoriaId;

  abrirModal('modal-edit-overlay');
}

function guardarEdicion() {
  const id          = parseInt(document.getElementById('edit-id').value);
  const descripcion = document.getElementById('edit-descripcion').value.trim();
  const monto       = parseFloat(document.getElementById('edit-monto').value);
  const fechaInput  = document.getElementById('edit-fecha').value;
  const categoriaId = document.getElementById('edit-categoria-select').value;

  if (!descripcion)               { mostrarToast('⚠️ Escribí una descripción'); return; }
  if (isNaN(monto) || monto <= 0) { mostrarToast('⚠️ Ingresá un monto válido'); return; }

  const idx = transacciones.findIndex(x => x.id === id);
  if (idx === -1) return;

  const fecha = fechaInput
    ? new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-CR')
    : transacciones[idx].fecha;

  transacciones[idx] = { ...transacciones[idx], descripcion, monto, tipo: editTipoSeleccionado, fecha, categoriaId };
  guardar();
  renderizar();
  cerrarModal('modal-edit-overlay');
  mostrarToast('✏️ Transacción actualizada');
}

function eliminarTransaccion(id) {
  transacciones = transacciones.filter(x => x.id !== id);
  guardar();
  renderizar();
  mostrarToast('🗑️ Eliminado');
}

// ─── Agregar ahorro ───────────────────────────────────
function agregarAhorro() {
  const descripcion = document.getElementById('ahorro-desc').value.trim();
  const monto       = parseFloat(document.getElementById('ahorro-monto').value);
  const fechaInput  = document.getElementById('ahorro-fecha').value;

  if (!descripcion)               { mostrarToast('⚠️ Escribí una descripción'); return; }
  if (isNaN(monto) || monto <= 0) { mostrarToast('⚠️ Ingresá un monto válido'); return; }
  if (!fechaInput)                { mostrarToast('⚠️ Seleccioná una fecha'); return; }

  const fecha = new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-CR');
  ahorros.push({ id: Date.now(), descripcion, monto, fecha });
  localStorage.setItem('ahorros', JSON.stringify(ahorros));
  renderizar();

  document.getElementById('ahorro-desc').value = '';
  document.getElementById('ahorro-monto').value = '';
  mostrarToast('🏦 Ahorro registrado');
}

// ─── Crear categoría ──────────────────────────────────
function crearCategoria() {
  const nombre = document.getElementById('nueva-cat-nombre').value.trim();
  if (!nombre) { mostrarToast('⚠️ Escribí un nombre'); return; }

  const id = 'cat_' + Date.now();
  categorias.push({ id, nombre, emoji: emojiSeleccionado });
  guardarCategorias();
  cargarCategorias();

  document.getElementById('nueva-cat-nombre').value = '';
  cerrarModal('modal-cat-overlay');
  mostrarToast('🏷️ Categoría creada');
}

// ─── Guardar transacciones ────────────────────────────
function guardar() {
  localStorage.setItem('transacciones', JSON.stringify(transacciones));
}

// ─── Totales ──────────────────────────────────────────
function calcularTotales() {
  const ingresos = transacciones
    .filter(t => t.tipo === 'ingreso')
    .reduce((s, t) => s + t.monto, 0);

  const gastos = transacciones
    .filter(t => ['gasto','gasto-fijo','gasolina'].includes(t.tipo))
    .reduce((s, t) => s + t.monto, 0);

  const gasolina = transacciones
    .filter(t => t.tipo === 'gasolina')
    .reduce((s, t) => s + t.monto, 0);

  const totalAhorros = ahorros.reduce((s, a) => s + a.monto, 0);
  const disponible   = ingresos - gastos - totalAhorros;

  return { ingresos, gastos, gasolina, totalAhorros, disponible };
}

// ─── Renderizar ───────────────────────────────────────
function renderizar() {
  const { ingresos, gastos, gasolina, totalAhorros, disponible } = calcularTotales();

  // Hero
  const heroEl = document.getElementById('total-disponible');
  heroEl.textContent = (disponible < 0 ? '-' : '') + formatearNumero(Math.abs(disponible));
  heroEl.classList.toggle('negativo', disponible < 0);

  const hintEl = document.getElementById('balance-hint');
  if (ingresos === 0) {
    hintEl.textContent = 'Agregá tus ingresos para comenzar';
  } else if (disponible < 0) {
    hintEl.textContent = `Déficit de ${formatear(Math.abs(disponible))} este mes`;
  } else {
    const pct = ingresos > 0 ? Math.round((gastos / ingresos) * 100) : 0;
    hintEl.textContent = `Gastaste el ${pct}% de tus ingresos`;
  }

  // Mini stats
  document.getElementById('stat-ingresos').textContent = formatear(ingresos);
  document.getElementById('stat-gastos').textContent   = formatear(gastos);
  document.getElementById('stat-gasolina').textContent = formatear(gasolina);
  document.getElementById('stat-ahorros').textContent  = formatear(totalAhorros);

  // Contadores y dots
  const txCount     = transacciones.length;
  const ahorroCount = ahorros.length;
  document.getElementById('contador-tx').textContent      = txCount;
  document.getElementById('contador-ahorros').textContent = ahorroCount;
  document.getElementById('nav-dot-transacciones').style.opacity = txCount     > 0 ? '1' : '0';
  document.getElementById('nav-dot-ahorros').style.opacity       = ahorroCount > 0 ? '1' : '0';

  // Ahorro progress
  const pctAhorro = metaAhorro > 0 ? Math.min((totalAhorros / metaAhorro) * 100, 100) : 0;
  const fillEl = document.getElementById('progress-fill');
  fillEl.style.width = pctAhorro + '%';
  fillEl.classList.toggle('completo', pctAhorro >= 100);
  document.getElementById('ahorro-pct').textContent          = Math.round(pctAhorro) + '%';
  document.getElementById('ahorro-actual-label').textContent = formatear(totalAhorros) + ' ahorrado';
  document.getElementById('ahorro-meta-label').textContent   = 'Meta: ' + (metaAhorro > 0 ? formatear(metaAhorro) : 'sin definir');

  renderizarLista();
  renderizarListaAhorros();
  renderizarGrafico(ingresos, gastos - gasolina, gasolina, totalAhorros, Math.max(disponible, 0));
}

// ─── Formato ──────────────────────────────────────────
function formatear(monto) {
  return '₡' + Math.abs(monto).toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatearNumero(monto) {
  return Math.abs(monto).toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Lista transacciones ──────────────────────────────
function renderizarLista() {
  const ul = document.getElementById('lista-transacciones');
  ul.innerHTML = '';

  if (transacciones.length === 0) {
    ul.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span>Sin transacciones este mes</div>`;
    return;
  }

  const cfg = {
    ingreso:     { emoji: '💰', bg: 'var(--green-dim)',  color: 'color-green',  signo: '+' },
    gasto:       { emoji: '🛒', bg: 'var(--red-dim)',    color: 'color-red',    signo: '-' },
    'gasto-fijo':{ emoji: '📋', bg: 'var(--blue-dim)',   color: 'color-red',    signo: '-' },
    gasolina:    { emoji: '⛽', bg: 'var(--yellow-dim)', color: 'color-yellow', signo: '-' },
  };

  [...transacciones].reverse().forEach(t => {
    const c = cfg[t.tipo] || cfg.gasto;
    const cat = categorias.find(x => x.id === t.categoriaId);
    const catBadge = cat && cat.id !== 'general'
      ? `<span class="item-cat-badge">${cat.emoji} ${cat.nombre}</span>`
      : '';
    const typeBadge = t.tipo === 'gasto-fijo'
      ? `<span class="item-type-badge badge-fijo">Fijo</span>`
      : t.tipo === 'gasolina'
        ? `<span class="item-type-badge badge-gasolina">⛽</span>`
        : '';

    const li = document.createElement('li');
    li.className = 'item-tx';
    li.innerHTML = `
      <div class="item-emoji" style="background:${c.bg}">${c.emoji}</div>
      <div class="item-info">
        <div class="item-desc">${t.descripcion}</div>
        <div class="item-meta">
          <span class="item-fecha">${t.fecha}</span>
          ${typeBadge}
          ${catBadge}
        </div>
      </div>
      <div class="item-right">
        <div class="item-amount ${c.color}">${c.signo}${formatear(t.monto)}</div>
        <div class="item-actions">
          <button class="action-btn edit" title="Editar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="action-btn del" title="Eliminar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;

    li.querySelector('.action-btn.edit').addEventListener('click', e => { e.stopPropagation(); abrirEdicion(t.id); });
    li.querySelector('.action-btn.del').addEventListener('click', e => { e.stopPropagation(); eliminarTransaccion(t.id); });
    ul.appendChild(li);
  });
}

// ─── Lista ahorros ────────────────────────────────────
function renderizarListaAhorros() {
  const ul = document.getElementById('lista-ahorros');
  ul.innerHTML = '';

  if (ahorros.length === 0) {
    ul.innerHTML = `<div class="empty-state"><span class="empty-icon">🏦</span>Sin ahorros registrados</div>`;
    return;
  }

  [...ahorros].reverse().forEach(a => {
    const li = document.createElement('li');
    li.className = 'item-tx';
    li.innerHTML = `
      <div class="item-emoji" style="background:var(--blue-dim)">🏦</div>
      <div class="item-info">
        <div class="item-desc">${a.descripcion}</div>
        <div class="item-meta"><span class="item-fecha">${a.fecha}</span></div>
      </div>
      <div class="item-right">
        <div class="item-amount color-blue">+${formatear(a.monto)}</div>
        <div class="item-actions">
          <button class="action-btn del" title="Eliminar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;
    li.querySelector('.action-btn.del').addEventListener('click', () => {
      ahorros = ahorros.filter(x => x.id !== a.id);
      localStorage.setItem('ahorros', JSON.stringify(ahorros));
      renderizar();
      mostrarToast('🗑️ Eliminado');
    });
    ul.appendChild(li);
  });
}

// ─── Gráfico ──────────────────────────────────────────
function renderizarGrafico(ingresos, gastos, gasolina, ahorro, disponible) {
  const ctx = document.getElementById('miGrafico').getContext('2d');
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos', 'Gasolina', 'Ahorros', 'Disponible'],
      datasets: [{
        data: [ingresos, gastos, gasolina, ahorro, disponible],
        backgroundColor: [
          'rgba(74,222,128,0.75)',
          'rgba(232,0,30,0.75)',
          'rgba(251,191,36,0.75)',
          'rgba(96,165,250,0.75)',
          'rgba(255,255,255,0.12)',
        ],
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ' ₡' + ctx.raw.toLocaleString('es-CR') }
        }
      },
      scales: {
        x: {
          ticks: { color: '#555', font: { family: 'DM Sans', size: 11 } },
          grid:  { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#555',
            font: { family: 'DM Sans', size: 10 },
            callback: val => '₡' + val.toLocaleString('es-CR')
          },
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      }
    }
  });
}

// ─── Toast ────────────────────────────────────────────
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── Cerrar mes modal ─────────────────────────────────
function abrirModalCierre() {
  if (transacciones.length === 0 && ahorros.length === 0) {
    mostrarToast('📭 No hay datos para exportar');
    return;
  }

  const { ingresos, gastos, gasolina, totalAhorros, disponible } = calcularTotales();
  const mes = new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

  document.getElementById('cierre-mes-label').textContent = mes.charAt(0).toUpperCase() + mes.slice(1);

  document.getElementById('cierre-summary').innerHTML = `
    <div class="cierre-row">
      <span class="cierre-lbl">Ingresos</span>
      <span class="cierre-val color-green">+${formatear(ingresos)}</span>
    </div>
    <div class="cierre-row">
      <span class="cierre-lbl">Gastos</span>
      <span class="cierre-val color-red">-${formatear(gastos - gasolina)}</span>
    </div>
    <div class="cierre-row">
      <span class="cierre-lbl">Gasolina</span>
      <span class="cierre-val color-yellow">-${formatear(gasolina)}</span>
    </div>
    <div class="cierre-row">
      <span class="cierre-lbl">Ahorros</span>
      <span class="cierre-val color-blue">-${formatear(totalAhorros)}</span>
    </div>
    <div class="cierre-row total">
      <span class="cierre-lbl">Disponible final</span>
      <span class="cierre-val ${disponible < 0 ? 'color-red' : 'color-green'}">${disponible < 0 ? '-' : '+'}${formatear(Math.abs(disponible))}</span>
    </div>
  `;

  abrirModal('modal-cierre-overlay');
}

function confirmarCierreMes() {
  exportarExcel();
  cerrarModal('modal-cierre-overlay');

  setTimeout(() => {
    transacciones = [];
    ahorros = [];
    guardar();
    localStorage.setItem('ahorros', JSON.stringify(ahorros));
    renderizar();
    mostrarToast('✅ Mes cerrado — Excel generado');
  }, 400);
}

// ─── Análisis IA ──────────────────────────────────────
async function abrirAnalisisIA() {
  if (transacciones.length === 0 && ahorros.length === 0) {
    mostrarToast('📭 No hay datos para analizar');
    return;
  }

  const { ingresos, gastos, gasolina, totalAhorros, disponible } = calcularTotales();
  const mes = new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
  const pctGasto = ingresos > 0 ? Math.round((gastos / ingresos) * 100) : 0;
  const pctAhorro = metaAhorro > 0 ? Math.round((totalAhorros / metaAhorro) * 100) : null;

  // Resumen de categorías
  const porCategoria = {};
  transacciones.filter(t => t.tipo !== 'ingreso').forEach(t => {
    const cat = categorias.find(c => c.id === t.categoriaId);
    const nombre = cat ? cat.nombre : 'General';
    porCategoria[nombre] = (porCategoria[nombre] || 0) + t.monto;
  });
  const catResumen = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ₡${v.toLocaleString('es-CR')}`)
    .join(', ');

  const prompt = `Sos un asesor financiero personal amigable y directo. Analizá estas finanzas del mes de ${mes} y dá un resumen con sugerencias concretas.

DATOS DEL MES:
- Ingresos totales: ₡${ingresos.toLocaleString('es-CR')}
- Gastos totales: ₡${gastos.toLocaleString('es-CR')} (${pctGasto}% de los ingresos)
- Gasolina: ₡${gasolina.toLocaleString('es-CR')}
- Ahorros: ₡${totalAhorros.toLocaleString('es-CR')}${metaAhorro > 0 ? ` (${pctAhorro}% de la meta de ₡${metaAhorro.toLocaleString('es-CR')})` : ''}
- Disponible restante: ₡${disponible.toLocaleString('es-CR')} ${disponible < 0 ? '(DÉFICIT)' : ''}
- Gastos por categoría: ${catResumen || 'sin categorizar'}
- Número de transacciones: ${transacciones.length}

Respondé en español de Costa Rica, de forma concisa y práctica. Estructurá tu respuesta exactamente así (usá estos encabezados literalmente):

[POSITIVO]
(1-2 cosas buenas del mes)

[ATENCIÓN]
(1-2 áreas de mejora o alertas)

[SUGERENCIAS]
(2-3 acciones concretas para el próximo mes)

[RESUMEN]
(1 oración que resuma el estado financiero del mes)

Sé directo, usa datos específicos del mes, y no uses markdown como asteriscos o guiones.`;

  // Abrir modal y resetear estado
  const iaText   = document.getElementById('ia-text');
  const iaLoading = document.getElementById('ia-loading');
  const iaSubtitle = document.getElementById('ia-subtitle');
  const iaAvatar  = document.querySelector('.ia-avatar');

  iaText.innerHTML = '';
  iaLoading.style.display = 'flex';
  iaSubtitle.textContent = 'Claude está analizando tus finanzas...';
  iaAvatar.classList.remove('done');
  abrirModal('modal-ia-overlay');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) throw new Error('Error en la API');

    iaLoading.style.display = 'none';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullText += parsed.delta.text;
            iaText.innerHTML = formatearRespuestaIA(fullText);
          }
        } catch {}
      }
    }

    iaAvatar.classList.add('done');
    iaSubtitle.textContent = 'Análisis completado';

  } catch (err) {
    iaLoading.style.display = 'none';
    iaText.innerHTML = `<div class="ia-item alert">No se pudo conectar con Claude. Verificá tu conexión e intentá de nuevo.</div>`;
    iaSubtitle.textContent = 'Error al analizar';
    console.error(err);
  }
}

function formatearRespuestaIA(texto) {
  const secciones = [
    { key: '[POSITIVO]',   clase: 'positive', titulo: '✅ Lo que vas bien' },
    { key: '[ATENCIÓN]',   clase: 'warning',  titulo: '⚠️ Puntos de atención' },
    { key: '[SUGERENCIAS]',clase: 'tip',      titulo: '💡 Sugerencias' },
    { key: '[RESUMEN]',    clase: 'alert',    titulo: '📊 Resumen del mes' },
  ];

  let html = '';
  let restante = texto;

  for (let i = 0; i < secciones.length; i++) {
    const { key, clase, titulo } = secciones[i];
    const inicio = restante.indexOf(key);
    if (inicio === -1) continue;

    const despues = restante.indexOf('[', inicio + key.length);
    const contenido = despues === -1
      ? restante.slice(inicio + key.length).trim()
      : restante.slice(inicio + key.length, despues).trim();

    if (!contenido) continue;

    const lineas = contenido.split('\n').filter(l => l.trim());
    const items  = lineas.map(l => `<div class="ia-item ${clase}">${l.trim()}</div>`).join('');

    html += `<div class="ia-section">
      <span class="ia-section-title">${titulo}</span>
      ${items}
    </div>`;
  }

  return html || `<div class="ia-item">${texto}</div>`;
}

// ─── Exportar Excel ───────────────────────────────────
function exportarExcel() {
  const { ingresos, gastos, gasolina, totalAhorros, disponible } = calcularTotales();
  const mes  = new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
  const tipos = { ingreso: 'Ingreso', gasto: 'Gasto', 'gasto-fijo': 'Gasto Fijo', gasolina: 'Gasolina' };

  const datosT = transacciones.map(t => {
    const cat = categorias.find(c => c.id === t.categoriaId);
    return {
      'Fecha':       t.fecha,
      'Descripción': t.descripcion,
      'Tipo':        tipos[t.tipo],
      'Categoría':   cat ? cat.nombre : 'General',
      'Monto (₡)':  t.tipo === 'ingreso' ? t.monto : -t.monto
    };
  });

  datosT.push({});
  datosT.push({ 'Descripción': '── RESUMEN ──' });
  datosT.push({ 'Descripción': 'TOTAL INGRESOS',   'Monto (₡)': ingresos });
  datosT.push({ 'Descripción': 'TOTAL GASTOS',     'Monto (₡)': -(gastos - gasolina) });
  datosT.push({ 'Descripción': 'TOTAL GASOLINA',   'Monto (₡)': -gasolina });
  datosT.push({ 'Descripción': 'TOTAL AHORROS',    'Monto (₡)': -totalAhorros });
  datosT.push({ 'Descripción': 'DISPONIBLE',       'Monto (₡)': disponible });

  const datosA = ahorros.map(a => ({
    'Fecha': a.fecha, 'Descripción': a.descripcion, 'Monto (₡)': a.monto
  }));
  datosA.push({});
  datosA.push({ 'Descripción': 'TOTAL AHORRADO', 'Monto (₡)': totalAhorros });
  datosA.push({ 'Descripción': 'META',           'Monto (₡)': metaAhorro });
  datosA.push({ 'Descripción': 'DIFERENCIA',     'Monto (₡)': totalAhorros - metaAhorro });

  const libro = XLSX.utils.book_new();

  const hojaT = XLSX.utils.json_to_sheet(datosT);
  hojaT['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(libro, hojaT, 'Transacciones');

  const hojaA = XLSX.utils.json_to_sheet(datosA);
  hojaA['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(libro, hojaA, 'Ahorros');

  XLSX.writeFile(libro, `Finanzas_${mes}.xlsx`);
}