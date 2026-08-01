/* ==========================================================================
   CONTA-SMART SENA - Módulo de Reportes PDF & Excel
   ========================================================================== */

const ReportsModule = {

  /**
   * Genera y descarga un comprobante en PDF para un cierre diario específico
   */
  async generateDailyClosePDF(closureId) {
    const closure = CashCloseModule.closures.find(c => c.id === closureId) || await IDB.getById('cierres_diarios', closureId);
    if (!closure) {
      UI.toast('No se encontró el registro de cierre seleccionado.', 'danger');
      return;
    }

    if (!window.jspdf) {
      UI.toast('La librería jsPDF no está disponible offline en este momento.', 'warning');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Encabezado del Comprobante SENA
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE CIERRE DIARIO DE CAJA', 105, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Proyecto SENA - Control de Inventario y Contabilidad Comercial', 105, 26, { align: 'center' });
    doc.text(`Fecha del Cierre: ${closure.fecha} | Generado: ${Formatters.dateTime(new Date())}`, 105, 33, { align: 'center' });

    // Información General
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN GENERAL DEL CIERRE', 14, 52);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`ID Comprobante: ${closure.id}`, 14, 60);
    doc.text(`Hora de Cierre: ${Formatters.dateTime(closure.hora_cierre)}`, 14, 66);
    doc.text(`Estado Contable: CERRADO E INMUTABLE`, 14, 72);

    // Cuadro de Resumen Financiero
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 78, 182, 32, 3, 3, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('(+) Total Ventas del Día:', 20, 88);
    doc.text(Formatters.currency(closure.total_ventas), 170, 88, { align: 'right' });

    doc.text('(-) Total Egresos y Nómina:', 20, 95);
    doc.text(Formatters.currency(closure.total_gastos), 170, 95, { align: 'right' });

    doc.setFontSize(12);
    doc.setTextColor(closure.saldo_neto >= 0 ? 16 : 239, closure.saldo_neto >= 0 ? 185 : 68, closure.saldo_neto >= 0 ? 129 : 68);
    doc.text('(=) SALDO NETO DEL DÍA:', 20, 104);
    doc.text(Formatters.currency(closure.saldo_neto), 170, 104, { align: 'right' });

    // Detalle de Ventas del Día
    const allSales = await IDB.getAll('ventas');
    const daySales = allSales.filter(s => s.fecha_corta === closure.fecha);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE VENTAS REGISTRADAS', 14, 122);

    const salesRows = daySales.map(s => [
      Formatters.dateTime(s.fecha),
      s.nombre_producto,
      `${s.cantidad} unid.`,
      Formatters.currency(s.precio_unitario),
      Formatters.currency(s.valor_total)
    ]);

    if (doc.autoTable) {
      doc.autoTable({
        startY: 126,
        head: [['Hora', 'Producto', 'Cant.', 'Precio Unit.', 'Total']],
        body: salesRows.length > 0 ? salesRows : [['-', 'Sin ventas registradas en esta fecha', '-', '-', '$0']],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] }
      });
    }

    // Firma de Conformidad SENA
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 30 : 200;
    doc.setDrawColor(148, 163, 184);
    doc.line(14, finalY, 90, finalY);
    doc.line(120, finalY, 196, finalY);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Firma Administrador / Propietario', 52, finalY + 6, { align: 'center' });
    doc.text('Verificación / Evaluación SENA', 158, finalY + 6, { align: 'center' });

    // Guardar PDF
    doc.save(`Comprobante_Cierre_${closure.fecha}.pdf`);
    UI.toast(`PDF de Cierre (${closure.fecha}) generado con éxito.`, 'success');
  },

  /**
   * Exporta la información contable completa a un archivo Excel (.xlsx) de múltiples hojas
   */
  async exportFullExcelReport() {
    if (!window.XLSX) {
      UI.toast('La librería SheetJS (XLSX) no está disponible offline en este momento.', 'warning');
      return;
    }

    const cierres = await IDB.getAll('cierres_diarios');
    const ventas = await IDB.getAll('ventas');
    const gastos = await IDB.getAll('gastos');
    const productos = await IDB.getAll('productos');

    const wb = XLSX.utils.book_new();

    // 1. Hoja Cierres Diarios
    const cierresData = cierres.map(c => ({
      'Fecha Cierre': c.fecha,
      'Hora Cierre': Formatters.dateTime(c.hora_cierre),
      'Ventas Totales': c.total_ventas,
      'Gastos Totales': c.total_gastos,
      'Saldo Neto': c.saldo_neto,
      'Estado': c.estado,
      'Observaciones': c.observaciones || ''
    }));
    const wsCierres = XLSX.utils.json_to_sheet(cierresData);
    XLSX.utils.book_append_sheet(wb, wsCierres, 'Cierres Diarios');

    // 2. Hoja Ventas
    const ventasData = ventas.map(v => ({
      'ID Venta': v.id,
      'Fecha y Hora': Formatters.dateTime(v.fecha),
      'Producto': v.nombre_producto,
      'Cantidad': v.cantidad,
      'Precio Unitario': v.precio_unitario,
      'Valor Total': v.valor_total
    }));
    const wsVentas = XLSX.utils.json_to_sheet(ventasData);
    XLSX.utils.book_append_sheet(wb, wsVentas, 'Historial Ventas');

    // 3. Hoja Gastos y Nómina
    const gastosData = gastos.map(g => ({
      'ID Gasto': g.id,
      'Fecha y Hora': Formatters.dateTime(g.fecha),
      'Descripción': g.descripcion,
      'Categoría': g.categoria,
      'Empleado (Nómina)': g.empleado || 'N/A',
      'Valor Pagado': g.valor
    }));
    const wsGastos = XLSX.utils.json_to_sheet(gastosData);
    XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos y Nómina');

    // 4. Hoja Inventario
    const productosData = productos.map(p => ({
      'ID Producto': p.id,
      'Nombre': p.nombre,
      'Categoría': p.categoria,
      'Precio Compra': p.precio_compra,
      'Precio Venta': p.precio_venta,
      'Stock Actual': p.stock,
      'Stock Mínimo': p.stock_minimo,
      'Estado Stock': p.stock === 0 ? 'AGOTADO' : (p.stock <= p.stock_minimo ? 'BAJO' : 'NORMAL')
    }));
    const wsProductos = XLSX.utils.json_to_sheet(productosData);
    XLSX.utils.book_append_sheet(wb, wsProductos, 'Inventario Actual');

    // Descargar archivo Excel
    const today = Formatters.getTodayString();
    XLSX.writeFile(wb, `Reporte_Contable_SENA_${today}.xlsx`);
    UI.toast('Libro Excel exportado con éxito.', 'success');
  }
};

window.ReportsModule = ReportsModule;
