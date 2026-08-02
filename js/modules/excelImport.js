/* ==========================================================================
   CONTA-SMART SENA - Módulo de Importación Masiva Excel
   ========================================================================== */

const ExcelImportModule = {

  /**
   * Genera y descarga la plantilla de Excel (.xlsx) adaptada al tipo de negocio activo
   */
  downloadTemplate() {
    try {
      const typeKey = BusinessConfigModule.getBusinessType();
      const fields = BusinessConfigModule.getActiveFields();
      const templateConfig = CONFIG.BUSINESS_TEMPLATES[typeKey] || CONFIG.BUSINESS_TEMPLATES.ropa_calzado;

      // Construir la fila de encabezados usando los labels legibles
      const headers = fields.map(f => f.label);

      // Obtener filas de datos de ejemplo
      const sampleRows = templateConfig.sampleRows || [
        { nombre: 'Producto Ejemplo', precio_compra: 10000, precio_venta: 18000, stock: 20, stock_minimo: 5 }
      ];

      // Mapear filas de muestra para coincidir con las columnas de los labels
      const data = sampleRows.map(sample => {
        const rowObj = {};
        fields.forEach(f => {
          rowObj[f.label] = sample[f.nombre] !== undefined ? sample[f.nombre] : '';
        });
        return rowObj;
      });

      // Intentar usar SheetJS (XLSX) si está disponible
      if (window.XLSX) {
        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Inventario');
        
        const fileName = `Plantilla_Inventario_${typeKey.toUpperCase()}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        UI.toast(`Plantilla Excel para "${templateConfig.label}" descargada con éxito.`, 'success');
      } else {
        // FALLBACK: Si SheetJS no cargó, generar un archivo CSV de forma nativa
        console.warn('SheetJS no disponible. Usando fallback CSV nativo.');
        this._downloadCSVFallback(headers, data, typeKey);
        UI.toast(`Plantilla CSV (Excel) descargada (Modo de respaldo).`, 'success');
      }
    } catch (err) {
      console.error('Error al descargar la plantilla:', err);
      UI.toast('Error al intentar descargar. Revisa la consola.', 'danger');
    }
  },

  /**
   * Genera un archivo CSV de forma nativa como respaldo si XLSX falla
   */
  _downloadCSVFallback(headers, data, typeKey) {
    let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
    
    data.forEach(row => {
      const rowStr = headers.map(h => {
        const val = row[h] !== undefined ? row[h] : '';
        return `"${val}"`;
      }).join(',');
      csvContent += rowStr + '\n';
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for BOM UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Plantilla_Inventario_${typeKey.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Procesa la lectura e importación del archivo Excel subido
   */
  async processExcelFile(file) {
    if (!window.XLSX) {
      UI.toast('La librería SheetJS no está cargada.', 'danger');
      return;
    }

    if (!file) {
      UI.toast('Por favor selecciona un archivo Excel (.xlsx o .xls).', 'warning');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          UI.toast('El archivo Excel está vacío o no tiene datos.', 'danger');
          return;
        }

        await this.validateAndImportRows(rawRows);
      } catch (err) {
        console.error('Error procesando archivo Excel:', err);
        UI.toast('Error al leer el archivo Excel. Verifica el formato.', 'danger');
      }
    };

    reader.readAsArrayBuffer(file);
  },

  /**
   * Valida cada fila del Excel e inserta las filas válidas en IndexedDB
   */
  async validateAndImportRows(rawRows) {
    const fields = BusinessConfigModule.getActiveFields();
    
    // Crear un mapa de coincidencia entre Labels o Nombres y las llaves internas de campos
    const fieldMap = {};
    fields.forEach(f => {
      fieldMap[f.label.toLowerCase()] = f.nombre;
      fieldMap[f.nombre.toLowerCase()] = f.nombre;
    });

    let importedCount = 0;
    const errors = [];

    for (let index = 0; index < rawRows.length; index++) {
      const rawRow = rawRows[index];
      const rowNum = index + 2; // Fila 1 es encabezado
      const rowErrors = [];

      // Mapear los datos de la fila a las claves internas
      const productData = {
        id: Formatters.generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending'
      };

      // Recorrer las propiedades encontradas en la fila del Excel
      Object.keys(rawRow).forEach(key => {
        const cleanKey = key.trim().toLowerCase();
        const internalFieldKey = fieldMap[cleanKey];

        if (internalFieldKey) {
          productData[internalFieldKey] = rawRow[key];
        }
      });

      // Validaciones obligatorias SENA (sección 4.2)
      // 1. Nombre obligatorio
      if (!productData.nombre || String(productData.nombre).trim() === '') {
        rowErrors.push('Falta el campo obligatorio "Nombre"');
      }

      // 2. Precio Compra válido
      const pCompra = Number(productData.precio_compra);
      if (productData.precio_compra === undefined || productData.precio_compra === '' || isNaN(pCompra) || pCompra < 0) {
        rowErrors.push('Precio de Compra inválido o vacío');
      } else {
        productData.precio_compra = pCompra;
      }

      // 3. Precio Venta válido
      const pVenta = Number(productData.precio_venta);
      if (productData.precio_venta === undefined || productData.precio_venta === '' || isNaN(pVenta) || pVenta < 0) {
        rowErrors.push('Precio de Venta inválido o vacío');
      } else {
        productData.precio_venta = pVenta;
      }

      // 4. Stock válido
      const stockVal = Number(productData.stock);
      if (productData.stock === undefined || productData.stock === '' || isNaN(stockVal) || stockVal < 0) {
        rowErrors.push('Cantidad de Stock inválida o vacía');
      } else {
        productData.stock = stockVal;
      }

      // Stock Mínimo por defecto
      if (!productData.stock_minimo || isNaN(Number(productData.stock_minimo))) {
        productData.stock_minimo = 5;
      } else {
        productData.stock_minimo = Number(productData.stock_minimo);
      }

      // Si hubo errores en la fila, agregar al reporte
      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          nombre: productData.nombre || '(Sin Nombre)',
          reason: rowErrors.join(', ')
        });
      } else {
        // Fila válida: Guardar en IndexedDB y Cola Sync
        await IDB.put('productos', productData);
        await SyncManager.queueSyncOperation('productos', 'INSERT', productData);
        importedCount++;
      }
    }

    // Cerrar modal de importación
    UI.closeModal('excel-import-modal');

    // Mostrar el reporte final de importación
    this.renderImportReport(importedCount, errors);
    
    // Recargar tabla de inventario
    await InventoryModule.loadProducts();
  },

  /**
   * Muestra el resumen y la lista de errores en el modal de reporte de importación
   */
  renderImportReport(importedCount, errors) {
    document.getElementById('excel-report-success-count').textContent = importedCount;
    document.getElementById('excel-report-error-count').textContent = errors.length;

    const errorContainer = document.getElementById('excel-report-errors-container');
    const tableBody = document.getElementById('excel-report-errors-body');

    if (!errorContainer || !tableBody) return;

    if (errors.length === 0) {
      errorContainer.style.display = 'none';
      UI.toast(`¡Éxito! Se importaron ${importedCount} productos sin ningún error.`, 'success');
    } else {
      errorContainer.style.display = 'block';
      tableBody.innerHTML = errors.map(err => `
        <tr>
          <td style="font-weight: 700;">Fila ${err.row}</td>
          <td>${err.nombre}</td>
          <td style="color: var(--danger); font-size: 0.85rem;">${err.reason}</td>
        </tr>
      `).join('');
    }

    UI.openModal('excel-result-modal');
  }
};

window.ExcelImportModule = ExcelImportModule;
