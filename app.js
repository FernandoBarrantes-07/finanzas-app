// ─── Estado ───────────────────────────────────────────
let transacciones = JSON.parse(localStorage.getItem('transacciones')) || [];
let grafico = null;
let tipoSeleccionado = 'ingreso';

// ─── Inicializar ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  mostrarMes();
  inicializarFecha();
  inicializarTipoSelector();
  renderizar();

  document.getElementById('btn-agregar').addEventListener('click', agregarTransaccion);
  document.getElementById('btn-cerrar-mes').addEventListener('click', cerrarMes);
});

// ─── Mes actual ───────────────────────────────────────
function mostrarMes() {
  const ahora = new Date();
  const texto = ahora.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
  document.getElementById('mes-actual').textContent = texto;
}

// ─── Fecha por defecto = hoy ──────────────────────────
function inicializarFecha() {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = hoy;
}

// ─── Selector de tipo ─────────────────────────────────
function inicializarTipoSelector() {
  const botones = document.querySelectorAll('.tipo-btn');
  botones.forEach(btn => {
    btn.addEventListener('click', () => {
      botones.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tipoSeleccionado = btn.dataset.tipo;
    });
  });
}

// ─── Agregar transacción ──────────────────────────────
function agregarTransaccion() {
  const descripcion = document.getElementById('descripcion').value.trim();
  const monto       = parseFloat(document.getElementById('monto').value);
  const fechaInput  = document.getElementById('fecha').value;

  if (!descripcion) {
    mostrarToast('⚠️ Ingresá una descripción');
    return;
  }
  if (isNaN(monto) || monto <= 0) {
    mostrarToast('⚠️ Ingresá un monto válido');
    return;
  }
  if (!fechaInput) {
    mostrarToast('⚠️ Seleccioná una fecha');
    return;
  }

  const fecha = new Date(fechaInput + 'T12:00:00').toLocaleDateString('es-CR');

  const nueva = {
    id: Date.now(),
    descripcion,
    monto,
    tipo: tipoSeleccionado,
    fecha
  };

  transacciones.push(nueva);
  guardar();
  renderizar();
  limpiarFormulario();

  const iconos = { ingreso: '💰', gasto: '🛒', 'gasto-fijo': '📋', gasolina: '⛽' };
  mostrarToast(`${iconos[tipoSeleccionado]} Transacción agregada`);
}

// ─── Guardar en LocalStorage ──────────────────────────
function guardar() {
  localStorage.setItem('transacciones', JSON.stringify(transacciones));
}

// ─── Limpiar formulario ───────────────────────────────
function limpiarFormulario() {
  document.getElementById('descripcion').value = '';
  document.getElementById('monto').value = '';
  inicializarFecha();
}

// ─── Calcular totales ─────────────────────────────────
function calcularTotales() {
  const ingresos = transacciones
    .filter(t => t.tipo === 'ingreso')
    .reduce((sum, t) => sum + t.monto, 0);

  const gastos = transacciones
    .filter(t => t.tipo === 'gasto' || t.tipo === 'gasto-fijo' || t.tipo === 'gasolina')
    .reduce((sum, t) => sum + t.monto, 0);

  const gasolina = transacciones
    .filter(t => t.tipo === 'gasolina')
    .reduce((sum, t) => sum + t.monto, 0);

  const disponible = ingresos - gastos;

  return { ingresos, gastos, disponible, gasolina };
}

// ─── Renderizar todo ──────────────────────────────────
function renderizar() {
  const { ingresos, gastos, disponible, gasolina } = calcularTotales();

  // Balance principal
  const balanceEl = document.getElementById('total-disponible');
  const barEl     = document.getElementById('balance-bar');
  const hintEl    = document.getElementById('balance-hint');

  balanceEl.textContent = formatear(disponible);
  balanceEl.classList.toggle('negativo', disponible < 0);
  barEl.classList.toggle('negativo', disponible < 0);

  const pct = ingresos > 0 ? Math.min((disponible / ingresos) * 100, 100) : 0;
  barEl.style.width = Math.max(pct, 0) + '%';

  if (ingresos === 0) {
    hintEl.textContent = 'Agregá tus ingresos para comenzar';
  } else if (disponible < 0) {
    hintEl.textContent = `Gastaste ${formatear(Math.abs(disponible))} más de lo que ingresaste`;
  } else {
    const pctGastado = Math.round((gastos / ingresos) * 100);
    hintEl.textContent = `Gastaste el ${pctGastado}% de tus ingresos`;
  }

  // Tarjetas
  document.getElementById('total-ingresos').textContent  = formatear(ingresos);
  document.getElementById('total-gastos').textContent    = formatear(gastos);
  document.getElementById('total-gasolina').textContent  = formatear(gasolina);

  // Contador
  document.getElementById('contador-transacciones').textContent = transacciones.length;

  renderizarLista();
  renderizarGrafico(ingresos, gastos, gasolina, disponible);
}

// ─── Formatear colones ────────────────────────────────
function formatear(monto) {
  return '₡' + Math.abs(monto).toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Renderizar lista ─────────────────────────────────
function renderizarLista() {
  const ul = document.getElementById('lista-transacciones');
  ul.innerHTML = '';

  if (transacciones.length === 0) {
    ul.innerHTML = `
      <div class="empty-state">
        <span>📭</span>
        Sin transacciones este mes
      </div>`;
    return;
  }

  const config = {
    'ingreso':    { emoji: '💰', bg: 'var(--green-dim)',   monto: 'ingreso-color',  signo: '+' },
    'gasto':      { emoji: '🛒', bg: 'var(--red-dim)',     monto: 'gasto-color',    signo: '-' },
    'gasto-fijo': { emoji: '📋', bg: 'var(--blue-dim)',    monto: 'gasto-color',    signo: '-' },
    'gasolina':   { emoji: '⛽', bg: 'var(--orange-dim)', monto: 'gasolina-color', signo: '-' },
  };

  [...transacciones].reverse().forEach(t => {
    const c   = config[t.tipo];
    const esFijo     = t.tipo === 'gasto-fijo';
    const esGasolina = t.tipo === 'gasolina';

    const badge = esFijo
      ? `<span class="item-badge badge-fijo">Fijo</span>`
      : esGasolina
        ? `<span class="item-badge badge-gasolina">Gasolina</span>`
        : '';

    const li = document.createElement('li');
    li.className = 'item-tx';
    li.innerHTML = `
      <div class="item-dot" style="background:${c.bg}">${c.emoji}</div>
      <div class="item-info">
        <div class="item-desc">${t.descripcion}</div>
        <div class="item-meta">
          <span class="item-fecha">${t.fecha}</span>
          ${badge}
        </div>
      </div>
      <div class="item-monto ${c.monto}">${c.signo}${formatear(t.monto)}</div>
    `;
    ul.appendChild(li);
  });
}

// ─── Gráfico de barras ────────────────────────────────
function renderizarGrafico(ingresos, gastos, gasolina, disponible) {
  const ctx = document.getElementById('miGrafico').getContext('2d');
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos', 'Gasolina', 'Disponible'],
      datasets: [{
        data: [ingresos, gastos - gasolina, gasolina, Math.max(disponible, 0)],
        backgroundColor: [
          'rgba(0, 232, 122, 0.85)',
          'rgba(255, 77, 106, 0.85)',
          'rgba(255, 170, 0, 0.85)',
          'rgba(77, 142, 255, 0.85)',
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
          callbacks: {
            label: ctx => ' ₡' + ctx.raw.toLocaleString('es-CR')
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b7394', font: { family: 'DM Sans', size: 11 } },
          grid:  { color: '#2a2f42' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#6b7394',
            font: { family: 'DM Mono', size: 10 },
            callback: val => '₡' + val.toLocaleString('es-CR')
          },
          grid: { color: '#2a2f42' }
        }
      }
    }
  });
}

// ─── Toast ────────────────────────────────────────────
function mostrarToast(mensaje) {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Cerrar mes ───────────────────────────────────────
function cerrarMes() {
  if (transacciones.length === 0) {
    mostrarToast('📭 No hay transacciones para exportar');
    return;
  }

  const confirmar = confirm('¿Cerrar el mes?\n\nSe exportará un archivo Excel con todos los datos y luego se borrarán las transacciones.');
  if (!confirmar) return;

  exportarExcel();

  setTimeout(() => {
    transacciones = [];
    guardar();
    renderizar();
    mostrarToast('✅ Mes cerrado correctamente');
  }, 500);
}

// ─── Exportar Excel ───────────────────────────────────
function exportarExcel() {
  const { ingresos, gastos, disponible, gasolina } = calcularTotales();
  const mes = new Date().toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });

  const tipoNombre = {
    'ingreso':    'Ingreso',
    'gasto':      'Gasto',
    'gasto-fijo': 'Gasto Fijo',
    'gasolina':   'Gasolina'
  };

  const datos = transacciones.map(t => ({
    'Fecha':       t.fecha,
    'Descripción': t.descripcion,
    'Tipo':        tipoNombre[t.tipo],
    'Monto (₡)':  t.tipo === 'ingreso' ? t.monto : -t.monto
  }));

  // Fila vacía de separación
  datos.push({ 'Fecha': '', 'Descripción': '', 'Tipo': '', 'Monto (₡)': '' });

  // Resumen
  datos.push({ 'Descripción': '── RESUMEN DEL MES ──', 'Monto (₡)': '' });
  datos.push({ 'Descripción': 'TOTAL INGRESOS',   'Monto (₡)': ingresos        });
  datos.push({ 'Descripción': 'TOTAL GASTOS',     'Monto (₡)': -(gastos - gasolina) });
  datos.push({ 'Descripción': 'TOTAL GASOLINA',   'Monto (₡)': -gasolina       });
  datos.push({ 'Descripción': 'DISPONIBLE',       'Monto (₡)': disponible      });

  const hoja  = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();

  // Ancho de columnas
  hoja['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 14 },
    { wch: 16 }
  ];

  XLSX.utils.book_append_sheet(libro, hoja, mes);
  XLSX.writeFile(libro, `Finanzas_${mes}.xlsx`);
}