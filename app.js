// ─── Estado ───────────────────────────────────────────
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let ahorros       = JSON.parse(localStorage.getItem('ahorros'))       || [];
let metaAhorro    = parseFloat(localStorage.getItem('metaAhorro'))    || 0;
let tipoSeleccionado = 'ingreso';
let grafico = null;

// ─── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  mostrarMes();
  setFechasHoy();
  initTabs();
  initChips();
  initModal();
  cargarMeta();
  renderizar();

  document.getElementById('btn-agregar').addEventListener('click', agregarTransaccion);
  document.getElementById('btn-agregar-ahorro').addEventListener('click', agregarAhorro);
  document.getElementById('btn-guardar-meta').addEventListener('click', guardarMetaAhorro);
  document.getElementById('btn-cerrar-mes').addEventListener('click', cerrarMes);
});

// ─── Mes ──────────────────────────────────────────────
function mostrarMes() {
  const texto = new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
  document.getElementById('mes-actual').textContent = texto;
  document.getElementById('badge-mes').textContent = texto;
}

// ─── Fechas por defecto hoy ───────────────────────────
function setFechasHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;
  document.getElementById('ahorro-fecha').value = hoy;
}

// ─── Tabs ─────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ─── Chips tipo ───────────────────────────────────────
function initChips() {
  document.querySelectorAll('#tipo-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#tipo-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      tipoSeleccionado = chip.dataset.tipo;
    });
  });
}

// ─── Modal config ─────────────────────────────────────
function initModal() {
  document.getElementById('btn-config').addEventListener('click', () => {
    document.getElementById('modal-meta-input').value = metaAhorro || '';
    document.getElementById('modal-overlay').classList.add('open');
  });
  document.getElementById('modal-cancel').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.remove('open');
  });
  document.getElementById('modal-save').addEventListener('click', () => {
    const val = parseFloat(document.getElementById('modal-meta-input').value);
    if (!isNaN(val) && val >= 0) {
      metaAhorro = val;
      localStorage.setItem('metaAhorro', metaAhorro);
      cargarMeta();
      renderizar();
      mostrarToast('✅ Meta guardada');
    }
    document.getElementById('modal-overlay').classList.remove('open');
  });
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay'))
      document.getElementById('modal-overlay').classList.remove('open');
  });
}

// ─── Cargar meta en tab ahorros ───────────────────────
function cargarMeta() {
  if (document.getElementById('meta-ahorro-input'))
    document.getElementById('meta-ahorro-input').value = metaAhorro || '';
}

// ─── Guardar meta desde tab ahorros ──────────────────
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

  if (!descripcion)           { mostrarToast('⚠️ Escribí una descripción'); return; }
  if (isNaN(monto) || monto <= 0) { mostrarToast('⚠️ Ingresá un monto válido'); return; }
  if (!fechaInput)            { mostrarToast('⚠️ Seleccioná una fecha'); return; }

  const fecha = new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-CR');
  transacciones.push({ id: Date.now(), descripcion, monto, tipo: tipoSeleccionado, fecha });
  guardar();
  renderizar();

  document.getElementById('descripcion').value = '';
  document.getElementById('monto').value = '';

  const labels = { ingreso: '💰 Ingreso', gasto: '🛒 Gasto', 'gasto-fijo': '📋 Gasto fijo', gasolina: '⛽ Gasolina' };
  mostrarToast(labels[tipoSeleccionado] + ' agregado');
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

// ─── Guardar transacciones ────────────────────────────
function guardar() {
  localStorage.setItem('transacciones', JSON.stringify(transacciones));
}

// ─── Calcular totales ─────────────────────────────────
function calcularTotales() {
  const ingresos = transacciones
    .filter(t => t.tipo === 'ingreso')
    .reduce((s, t) => s + t.monto, 0);

  const gastos = transacciones
    .filter(t => t.tipo === 'gasto' || t.tipo === 'gasto-fijo' || t.tipo === 'gasolina')
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
  heroEl.textContent = formatearNumero(disponible);
  heroEl.classList.toggle('negativo', disponible < 0);

  const hintEl = document.getElementById('balance-hint');
  if (ingresos === 0) {
    hintEl.textContent = 'Agregá tus ingresos para comenzar';
  } else if (disponible < 0) {
    hintEl.textContent = `Déficit de ${formatear(Math.abs(disponible))} este mes`;
  } else {
    const pct = Math.round((gastos / ingresos) * 100);
    hintEl.textContent = `Gastaste el ${pct}% de tus ingresos`;
  }

  // Mini stats
  document.getElementById('stat-ingresos').textContent  = formatear(ingresos);
  document.getElementById('stat-gastos').textContent    = formatear(gastos);
  document.getElementById('stat-gasolina').textContent  = formatear(gasolina);
  document.getElementById('stat-ahorros').textContent   = formatear(totalAhorros);

  // Contadores
  document.getElementById('contador-tx').textContent      = transacciones.length;
  document.getElementById('contador-ahorros').textContent = ahorros.length;

  // Ahorro progress
  const pctAhorro = metaAhorro > 0 ? Math.min((totalAhorros / metaAhorro) * 100, 100) : 0;
  const fillEl = document.getElementById('progress-fill');
  fillEl.style.width = pctAhorro + '%';
  fillEl.classList.toggle('completo', pctAhorro >= 100);
  document.getElementById('ahorro-pct').textContent       = Math.round(pctAhorro) + '%';
  document.getElementById('ahorro-actual-label').textContent = formatear(totalAhorros) + ' ahorrado';
  document.getElementById('ahorro-meta-label').textContent   = 'Meta: ' + (metaAhorro > 0 ? formatear(metaAhorro) : 'sin definir');

  renderizarLista();
  renderizarListaAhorros();
  renderizarGrafico(ingresos, gastos - gasolina, gasolina, totalAhorros, Math.max(disponible, 0));
}

// ─── Formato colones ──────────────────────────────────
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
    ingreso:    { emoji: '💰', bg: 'var(--green-dim)',  color: 'color-green',  signo: '+' },
    gasto:      { emoji: '🛒', bg: 'var(--red-dim)',    color: 'color-red',    signo: '-' },
    'gasto-fijo':{ emoji: '📋', bg: 'var(--blue-dim)', color: 'color-red',    signo: '-' },
    gasolina:   { emoji: '⛽', bg: 'var(--yellow-dim)', color: 'color-yellow', signo: '-' },
  };

  [...transacciones].reverse().forEach(t => {
    const c = cfg[t.tipo];
    const badge = t.tipo === 'gasto-fijo'
      ? `<span class="item-badge-small badge-fijo">Fijo</span>`
      : t.tipo === 'gasolina'
        ? `<span class="item-badge-small badge-gasolina">⛽</span>`
        : '';

    const li = document.createElement('li');
    li.className = 'item-tx';
    li.innerHTML = `
      <div class="item-emoji" style="background:${c.bg}">${c.emoji}</div>
      <div class="item-info">
        <div class="item-desc">${t.descripcion}${badge}</div>
        <div class="item-fecha">${t.fecha}</div>
      </div>
      <div class="item-amount ${c.color}">${c.signo}${formatear(t.monto)}</div>
    `;
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
        <div class="item-fecha">${a.fecha}</div>
      </div>
      <div class="item-amount color-blue">+${formatear(a.monto)}</div>
    `;
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
          'rgba(0,200,83,0.85)',
          'rgba(232,0,30,0.85)',
          'rgba(255,171,0,0.85)',
          'rgba(41,121,255,0.85)',
          'rgba(255,255,255,0.15)',
        ],
        borderRadius: 10,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ₡' + ctx.raw.toLocaleString('es-CR')
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#666', font: { family: 'Outfit', size: 11 } },
          grid:  { color: '#222' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#666',
            font: { family: 'Outfit', size: 10 },
            callback: val => '₡' + val.toLocaleString('es-CR')
          },
          grid: { color: '#222' }
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

// ─── Cerrar mes ───────────────────────────────────────
function cerrarMes() {
  if (transacciones.length === 0 && ahorros.length === 0) {
    mostrarToast('📭 No hay datos para exportar');
    return;
  }

  const ok = confirm('¿Cerrar el mes?\n\nSe exportará un Excel con todos los datos y se borrarán las transacciones y ahorros del mes.');
  if (!ok) return;

  exportarExcel();

  setTimeout(() => {
    transacciones = [];
    ahorros = [];
    guardar();
    localStorage.setItem('ahorros', JSON.stringify(ahorros));
    renderizar();
    mostrarToast('✅ Mes cerrado — Excel generado');
  }, 400);
}

// ─── Exportar Excel ───────────────────────────────────
function exportarExcel() {
  const { ingresos, gastos, gasolina, totalAhorros, disponible } = calcularTotales();
  const mes = new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

  const tipos = { ingreso: 'Ingreso', gasto: 'Gasto', 'gasto-fijo': 'Gasto Fijo', gasolina: 'Gasolina' };

  // Hoja 1: Transacciones
  const datosT = transacciones.map(t => ({
    'Fecha':       t.fecha,
    'Descripción': t.descripcion,
    'Tipo':        tipos[t.tipo],
    'Monto (₡)':  t.tipo === 'ingreso' ? t.monto : -t.monto
  }));

  datosT.push({});
  datosT.push({ 'Descripción': '── RESUMEN ──' });
  datosT.push({ 'Descripción': 'TOTAL INGRESOS',   'Monto (₡)': ingresos });
  datosT.push({ 'Descripción': 'TOTAL GASTOS',     'Monto (₡)': -(gastos - gasolina) });
  datosT.push({ 'Descripción': 'TOTAL GASOLINA',   'Monto (₡)': -gasolina });
  datosT.push({ 'Descripción': 'TOTAL AHORROS',    'Monto (₡)': -totalAhorros });
  datosT.push({ 'Descripción': 'DISPONIBLE',       'Monto (₡)': disponible });

  // Hoja 2: Ahorros
  const datosA = ahorros.map(a => ({
    'Fecha':       a.fecha,
    'Descripción': a.descripcion,
    'Monto (₡)':  a.monto
  }));
  datosA.push({});
  datosA.push({ 'Descripción': 'TOTAL AHORRADO', 'Monto (₡)': totalAhorros });
  datosA.push({ 'Descripción': 'META',           'Monto (₡)': metaAhorro });
  datosA.push({ 'Descripción': 'DIFERENCIA',     'Monto (₡)': totalAhorros - metaAhorro });

  const libro = XLSX.utils.book_new();

  const hojaT = XLSX.utils.json_to_sheet(datosT);
  hojaT['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(libro, hojaT, 'Transacciones');

  const hojaA = XLSX.utils.json_to_sheet(datosA);
  hojaA['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(libro, hojaA, 'Ahorros');

  XLSX.writeFile(libro, `Finanzas_${mes}.xlsx`);
}