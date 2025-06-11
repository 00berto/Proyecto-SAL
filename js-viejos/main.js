// main.js

// Columna fija para el cálculo SAL: "IMPORTO totale CONTRATTO" (índice 7)
const BASE_CALC_COL_INDEX = 7;

// Array para almacenar los totales de "Importo SAL" de cada tabla para el resumen global
let allTablesSalTotals = [];

// Contador para las tablas SAL adicionales que se generarán con el botón
let salTableCounter = 0;

/**
 * Función auxiliar para limpiar un string formateado con separadores de miles y decimales
 * (ej. '1'234,56') y convertirlo a un número válido para cálculos (ej. 1234.56).
 * Asume el formato 'it-IT' (apóstrofo para miles, coma para decimales).
 * @param {string} str - La cadena de texto numérica formateada.
 * @returns {number} El número parseado o 0 si no es válido.
 */
const parseFormattedNumber = (str) => {
  if (typeof str !== "string" || !str) {
    return 0;
  }
  // Eliminar el separador de miles (punto o apóstrofo, dependiendo del formato real) y reemplazar la coma por punto
  const cleanedStr = str.replace(/\./g, "").replace(/'/g, "").replace(",", ".");
  return parseFloat(cleanedStr) || 0;
};

document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById("fileNameTitle").textContent = "";
    document.getElementById("tableContainer").innerHTML = "";
    document.getElementById("printPdfBtn").style.display = "none";
    document.getElementById("tabla-sal").style.display = "none";
    allTablesSalTotals = []; // Limpiar totales si no hay archivo
    salTableCounter = 0; // Resetear contador de tablas SAL adicionales
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });
    const json = worksheet;

    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;
    const container = document.getElementById("tableContainer");
    container.innerHTML = ""; // Limpiar tablas anteriores
    document.getElementById("printPdfBtn").style.display = "none";
    // Asegurarse de que el botón 'tabla-sal' esté oculto al cargar un nuevo archivo inicialmente
    document.getElementById("tabla-sal").style.display = "none";
    allTablesSalTotals = []; // Resetear los totales para un nuevo archivo
    salTableCounter = 0; // Resetear el contador de tablas SAL

    let globalHeaders = [];
    const isCellEmpty = (cell) =>
      cell === undefined || cell === null || String(cell).trim() === "";

    // Filtrar filas completamente vacías al principio del procesamiento
    const filteredJson = json.filter((row) =>
      row.some((cell) => !isCellEmpty(cell))
    );

    if (filteredJson.length === 0) {
      document.getElementById(
        "fileNameTitle"
      ).textContent = `Archivo cargado: ${file.name} (vacío o sin datos)`;
      document.getElementById("printPdfBtn").style.display = "none";
      document.getElementById("tabla-sal").style.display = "none";
      return;
    }

    // Obtener las cabeceras de la primera fila filtrada (índice 0 de filteredJson)
    globalHeaders = filteredJson[0].map((header) =>
      header === undefined ? "" : String(header).trim()
    );

    // Validar si la columna BASE_CALC_COL_INDEX existe
    if (globalHeaders.length <= BASE_CALC_COL_INDEX) {
      alert(
        `Error: La columna base para cálculo (índice ${BASE_CALC_COL_INDEX} - "${
          globalHeaders[BASE_CALC_COL_INDEX] || "N/A"
        }") no existe o está fuera de rango en el archivo Excel.`
      );
      document.getElementById("printPdfBtn").style.display = "none";
      document.getElementById("tabla-sal").style.display = "none";
      return;
    }

    // Definir los índices de las columnas que SIEMPRE se totalizarán automáticamente en cada tabla
    const autoTotalColumnIndexes = [
      4, // QUANTITA'
      5, // IMPORTO unitario (SENZA COSTO)
      6, // IMPORTO unitario
      7, // IMPORTO totale CONTRATTO (nuestra base SAL)
      // Nota: Importo SAL (calculada) y Importo A FINIRE (calculada) se manejan por separado ya que se añaden dinámicamente
    ];
    // Nombres para referencia (aunque no se usan para la UI de selección, son útiles para depuración)
    const autoTotalColumnNames = autoTotalColumnIndexes.map(
      (idx) => globalHeaders[idx] || `Columna ${idx}`
    );

    // Llamada inicial para renderizar todas las tablas
    renderTables(
      filteredJson.slice(1),
      globalHeaders,
      BASE_CALC_COL_INDEX,
      autoTotalColumnIndexes,
      autoTotalColumnNames
    );
    document.getElementById("printPdfBtn").style.display = "block";
    document.getElementById("tabla-sal").style.display = "block"; // Mostrar el botón 'tabla-sal'
  };

  reader.readAsArrayBuffer(file);
});

/**
 * Función para renderizar todas las tablas detalladas basadas en los datos procesados.
 * @param {Array<Array<any>>} jsonDataRows - Las filas de datos del Excel (excluyendo cabeceras).
 * @param {Array<string>} headers - Las cabeceras globales del Excel.
 * @param {number} baseCalcColIdx - El índice de la columna base para los cálculos SAL (siempre 7).
 * @param {Array<number>} autoTotalColIndexes - Índices de las columnas que siempre se totalizarán.
 * @param {Array<string>} autoTotalColNames - Nombres de las columnas que siempre se totalizarán.
 */
const renderTables = (
  jsonDataRows,
  headers,
  baseCalcColIdx,
  autoTotalColIndexes,
  autoTotalColNames
) => {
  const container = document.getElementById("tableContainer");
  container.innerHTML = ""; // Limpiar tablas existentes antes de redibujar
  allTablesSalTotals = []; // Asegurarse de que el array de totales esté limpio antes de empezar a recopilar

  let currentTableData = [];
  let currentSectionTitle = "";
  let isFirstTable = true;

  const isCellEmpty = (cell) =>
    cell === undefined || cell === null || String(cell).trim() === "";

  jsonDataRows.forEach((row) => {
    const isNewSectionHeader = !isCellEmpty(row[0]) && !isCellEmpty(row[1]);
    const isCompletelyEmptyRow = row.every((cell) => isCellEmpty(cell));

    if (
      (isNewSectionHeader || isCompletelyEmptyRow) &&
      currentTableData.length > 0
    ) {
      createAndAppendTable(
        currentSectionTitle,
        currentTableData,
        headers,
        baseCalcColIdx,
        autoTotalColIndexes,
        autoTotalColNames
      );
      currentTableData = [];
      isFirstTable = false;
    }

    if (isNewSectionHeader) {
      currentSectionTitle = `${row[0] || ""} ${row[1] || ""}`.trim();
    } else if (isCompletelyEmptyRow) {
      currentSectionTitle = "";
    } else {
      currentTableData.push(row);
      if (isFirstTable && currentSectionTitle === "") {
        currentSectionTitle = "";
      }
    }
  });

  // Renderizar la última tabla si hay datos pendientes
  if (currentTableData.length > 0) {
    createAndAppendTable(
      currentSectionTitle,
      currentTableData,
      headers,
      baseCalcColIdx,
      autoTotalColIndexes,
      autoTotalColNames
    );
  }

  // Generar la tabla de resumen una vez que todas las tablas detalladas se han creado
  generateSummaryTable();
};

/**
 * Crea y añade una tabla HTML detallada al contenedor.
 * @param {string} titleText - Título de la tabla.
 * @param {Array<Array<any>>} dataRows - Filas de datos para la tabla.
 * @param {Array<string>} tableHeaders - Cabeceras de la tabla (originales + SAL).
 * @param {number} baseCalcColIndex - El índice de la columna base para los cálculos SAL (siempre 7).
 * @param {Array<number>} autoTotalColIndexes - Índices de las columnas que siempre se totalizarán.
 * @param {Array<string>} autoTotalColNames - Nombres de las columnas que siempre se totalizarán.
 */
const createAndAppendTable = (
  titleText,
  dataRows,
  tableHeaders,
  baseCalcColIndex,
  autoTotalColIndexes,
  autoTotalColNames
) => {
  if (dataRows.length === 0) {
    return;
  }

  const tableWrapper = document.createElement("div");
  tableWrapper.className = "table-wrapper"; // Clase para el escalado (definiendo en CSS)

  if (titleText) {
    const title = document.createElement("h4");
    title.textContent = titleText;
    tableWrapper.appendChild(title);
  }

  const table = document.createElement("table");
  table.className = "table table-bordered table-sm mb-1";
  // Añadir un atributo de datos para identificar el título de la sección original
  table.setAttribute("data-section-title", titleText);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  // Añadir cabeceras originales
  tableHeaders.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });

  // Añadir las nuevas columnas SAL a la cabecera
  ["SAL %", "Importo SAL", "A FINIRE %", "Importo A FINIRE"].forEach((name) => {
    const th = document.createElement("th");
    th.textContent = name;
    if (name === "SAL %") th.classList.add("col-sal");
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  document.getElementById("tableContainer").appendChild(tableWrapper);

  // Función para actualizar los totales de la fila de totales de esta tabla
  const updateTableTotals = () => {
    let tempTotals = {};
    let totalSalPercent = 0; // Nuevo acumulador para el total de SAL%

    // Inicializar totales para todas las columnas que deben ser auto-totalizadas
    autoTotalColIndexes.forEach((idx) => {
      tempTotals[tableHeaders[idx]] = 0;
    });
    tempTotals["Importo SAL"] = 0;
    tempTotals["Importo A FINIRE"] = 0;

    // Iterar sobre todas las filas de datos en el tbody (excluyendo la fila de totales)
    tbody.querySelectorAll("tr:not(.total-row)").forEach((rowElement) => {
      const cells = rowElement.querySelectorAll("td");

      // Sumar los valores de las columnas predefinidas
      autoTotalColIndexes.forEach((idx) => {
        if (cells[idx]) {
          tempTotals[tableHeaders[idx]] += parseFormattedNumber(
            cells[idx]?.textContent
          );
        }
      });

      // Sumar los valores de Importo SAL y Importo A FINIRE
      // Nota: Estos están en posiciones de columna añadidas dinámicamente
      tempTotals["Importo SAL"] += parseFormattedNumber(
        cells[tableHeaders.length + 1]?.textContent
      );
      tempTotals["Importo A FINIRE"] += parseFormattedNumber(
        cells[tableHeaders.length + 3]?.textContent
      );

      // Sumar el porcentaje SAL de cada fila
      const salInput = cells[tableHeaders.length].querySelector("input");
      if (salInput) {
        totalSalPercent += parseFloat(salInput.value) || 0;
      }
    });

    // Actualizar los textos en la fila de totales visible
    const totalRowElement = tbody.querySelector(".total-row");
    if (totalRowElement) {
      const totalCells = totalRowElement.querySelectorAll("td");

      // Limpiar todos los totales antes de actualizar para evitar residuos
      totalCells.forEach((cell) => (cell.textContent = ""));

      // Poner el texto "Total" en la primera celda
      if (totalCells.length > 0) {
        totalCells[0].textContent = "Total:";
      }

      // Mostrar los totales de las columnas predefinidas con formato de millares
      autoTotalColIndexes.forEach((idx) => {
        if (totalCells[idx]) {
          totalCells[idx].textContent =
            tempTotals[tableHeaders[idx]]?.toLocaleString("it-IT", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0,00";
        }
      });

      // Mostrar el TOTAL DEL SAL%
      if (totalCells[tableHeaders.length]) {
        // Celda de "SAL %" en la fila de totales
        totalCells[
          tableHeaders.length
        ].textContent = `${totalSalPercent.toFixed(2)}%`;
        // Validar y aplicar estilo rojo si el total SAL% > 100
        if (totalSalPercent > 100) {
          totalCells[tableHeaders.length].classList.add("table-danger"); // Clase de Bootstrap para rojo
        } else {
          totalCells[tableHeaders.length].classList.remove("table-danger");
        }
      }

      // Mostrar los totales de Importo SAL y Importo A FINIRE con formato de millares
      if (totalCells[tableHeaders.length + 1])
        totalCells[tableHeaders.length + 1].textContent = tempTotals[
          "Importo SAL"
        ].toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      if (totalCells[tableHeaders.length + 3])
        totalCells[tableHeaders.length + 3].textContent = tempTotals[
          "Importo A FINIRE"
        ].toLocaleString("it-IT", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      // Actualizar el array global de totales SAL de la tabla actual
      const existingEntryIndex = allTablesSalTotals.findIndex(
        (entry) => entry.title === titleText
      );
      if (existingEntryIndex !== -1) {
        allTablesSalTotals[existingEntryIndex].salTotal =
          tempTotals["Importo SAL"];
      } else {
        allTablesSalTotals.push({
          title: titleText || "Sin Título de Sección", // Asegurarse de tener un título
          salTotal: tempTotals["Importo SAL"],
        });
      }
      generateSummaryTable(); // Volver a generar la tabla de resumen cada vez que un SAL% cambie
    }
  };

  // Llenar el tbody con los datos de las filas y configurar los inputs SAL %
  dataRows.forEach((row, rowIndex) => {
    // Se añadió rowIndex para identificar cada fila
    const tr = document.createElement("tr");
    tr.setAttribute("data-row-index", rowIndex); // Añadir un atributo de datos para el índice de fila

    tableHeaders.forEach((_, i) => {
      const td = document.createElement("td");
      const value = row[i];
      // Formatear valores numéricos de las columnas originales
      td.textContent =
        typeof value === "number" && !isNaN(value)
          ? value.toLocaleString("it-IT", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : value || "";
      tr.appendChild(td);
    });

    // Obtener el valor de la columna base de cálculo (siempre el índice 7)
    const baseCalcValue =
      baseCalcColIndex !== -1 && !isNaN(parseFloat(row[baseCalcColIndex]))
        ? parseFloat(row[baseCalcColIndex])
        : 0;

    const salTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control text-end col-sal sal-input"; // Se añadió la clase 'sal-input'
    input.value = "0"; // Valor inicial del porcentaje SAL
    input.setAttribute("data-base-value", baseCalcValue); // Almacenar el valor base para fácil acceso
    salTd.appendChild(input);

    const salImportoTd = document.createElement("td");
    salImportoTd.className = "text-end sal-importo"; // Se añadió la clase 'sal-importo'
    salImportoTd.textContent = "0,00"; // Valor inicial del importe SAL (formato it-IT)

    const finirePercentTd = document.createElement("td");
    finirePercentTd.className = "text-end";
    finirePercentTd.textContent = "100,00%"; // Valor inicial del porcentaje A FINIRE (usando coma para decimales)

    const finireImportoTd = document.createElement("td");
    finireImportoTd.className = "text-end";
    // Valor inicial de Importo A FINIRE con formato de millares
    finireImportoTd.textContent = baseCalcValue.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    input.addEventListener("input", () => {
      let val = parseFloat(input.value.replace(",", ".")); // Permitir comas para decimales al ingresar
      val = isNaN(val) ? 0 : val; // No limitar a 100 aquí, la validación visual lo hará

      input.value = val; // Actualiza el valor del input con el número parseado

      // **Validación visual para el SAL% individual**
      if (val > 100 || val < 0) {
        input.classList.add("is-invalid"); // Bootstrap para resaltar el input
        salTd.classList.add("table-danger"); // Resaltar la celda contenedora también
      } else {
        input.classList.remove("is-invalid");
        salTd.classList.remove("table-danger");
      }

      const percent = val / 100;
      salImportoTd.textContent = (baseCalcValue * percent).toLocaleString(
        "it-IT",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      );
      finirePercentTd.textContent = ((1 - percent) * 100).toFixed(2) + "%";
      finireImportoTd.textContent = (
        baseCalcValue *
        (1 - percent)
      ).toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      updateTableTotals(); // Recalcular los totales de la tabla después de cada cambio en SAL %
    });

    tr.appendChild(salTd);
    tr.appendChild(salImportoTd);
    tr.appendChild(finirePercentTd);
    tr.appendChild(finireImportoTd);

    tbody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.classList.add("total-row", "table-info");

  // Crear celdas para la fila de totales (ahora una más para el SAL% total)
  // tableHeaders.length + 4 cubre las columnas originales + SAL%, Importo SAL, A FINIRE %, Importo A FINIRE
  for (let i = 0; i < tableHeaders.length + 4; i++) {
    totalRow.appendChild(document.createElement("td"));
  }
  tbody.appendChild(totalRow);

  updateTableTotals(); // Calcular y mostrar los totales iniciales de la tabla
};

// Generador de Tabla Resumen

/**
 * Genera y añade la tabla de resumen de totales SAL de todas las secciones.
 */
const generateSummaryTable = () => {
  const container = document.getElementById("tableContainer");
  // Eliminar la tabla de resumen anterior si existe para evitar duplicados
  const existingSummaryTable = document.getElementById("summaryTableWrapper");
  if (existingSummaryTable) {
    existingSummaryTable.remove();
  }

  if (allTablesSalTotals.length === 0) {
    return; // No hay datos para el resumen si el array está vacío
  }

  const summaryTableWrapper = document.createElement("div");
  summaryTableWrapper.id = "summaryTableWrapper"; // ID para facilitar su eliminación y actualización
  summaryTableWrapper.className = "mt-2 mb-2"; // Clases para añadir margen

  const summaryTitle = document.createElement("h3");
  summaryTitle.textContent = "Resumen de Importes SAL por Sección";
  summaryTableWrapper.appendChild(summaryTitle);

  const summaryTable = document.createElement("table");
  summaryTable.className = "table table-bordered table-sm summary-table"; // Clase CSS para posibles estilos
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  // Cabeceras de la tabla de resumen
  const headerRow = document.createElement("tr");
  const thTitle = document.createElement("th");
  thTitle.textContent = "Sección del Proyecto";
  const thSalTotal = document.createElement("th");
  thSalTotal.textContent = "Importo SAL Total";
  thSalTotal.className = "text-end"; // Alinear a la derecha
  headerRow.appendChild(thTitle);
  headerRow.appendChild(thSalTotal);
  thead.appendChild(headerRow);
  summaryTable.appendChild(thead);

  let grandTotalSal = 0;

  // Rellenar las filas de la tabla de resumen con los datos recopilados
  allTablesSalTotals.forEach((item) => {
    const row = document.createElement("tr");
    const tdTitle = document.createElement("td");
    tdTitle.textContent = item.title;
    const tdSalTotal = document.createElement("td");
    // Formatear el total SAL con separador de millares
    tdSalTotal.textContent = item.salTotal.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    tdSalTotal.className = "text-end";
    row.appendChild(tdTitle);
    row.appendChild(tdSalTotal);
    tbody.appendChild(row);
    grandTotalSal += item.salTotal; // Sumar para el total global
  });

  // Fila del Gran Total Global
  const grandTotalRow = document.createElement("tr");
  grandTotalRow.classList.add("table-primary", "fw-bold"); // Estilo para destacar
  const grandTotalLabelCell = document.createElement("td");
  grandTotalLabelCell.textContent = "TOTAL GLOBAL SAL:";
  grandTotalLabelCell.colSpan = 1; // Ocupa una columna
  const grandTotalValueCell = document.createElement("td");
  // Formatear el gran total con separador de millares
  grandTotalValueCell.textContent = grandTotalSal.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  grandTotalValueCell.className = "text-end";
  grandTotalRow.appendChild(grandTotalLabelCell);
  grandTotalRow.appendChild(grandTotalValueCell);
  tbody.appendChild(grandTotalRow);

  summaryTable.appendChild(tbody);
  summaryTableWrapper.appendChild(summaryTable);
  container.appendChild(summaryTableWrapper); // Añadir la tabla de resumen al contenedor principal
};

// Nueva Funcionalidad: Crear Tablas SAL Copia

/**
 * Crea y añade una nueva tabla que contiene solo las columnas 'SAL %' e 'Importo SAL',
 * conservando la estructura original y los valores de las tablas principales.
 * Cada nueva tabla tendrá un título como "SAL 1", "SAL 2", etc.
 */
document.getElementById("tabla-sal").addEventListener("click", function () {
  salTableCounter++; // Incrementar el contador para la nueva tabla SAL
  const newTableTitle = `SAL ${salTableCounter}`;
  const container = document.getElementById("tableContainer");

  const salTableWrapper = document.createElement("div");
  salTableWrapper.className = "table-wrapper sal-copy-table-wrapper"; // Añadir una clase específica para estilos
  salTableWrapper.id = `sal-copy-table-${salTableCounter}`; // ID único para cada tabla SAL copia

  const title = document.createElement("h4");
  title.textContent = newTableTitle;
  salTableWrapper.appendChild(title);

  const newSalTable = document.createElement("table");
  newSalTable.className = "table table-bordered table-sm mb-1 sal-copy-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  // Cabeceras para la nueva tabla de copia SAL
  ["Sección", "SAL %", "Importo SAL"].forEach((name) => {
    const th = document.createElement("th");
    th.textContent = name;
    if (name === "Importo SAL") th.classList.add("text-end");
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  newSalTable.appendChild(thead);

  const tbody = document.createElement("tbody");
  newSalTable.appendChild(tbody);
  salTableWrapper.appendChild(newSalTable);
  // Añadir la nueva tabla al contenedor principal. Puedes ajustar el orden si quieres.
  container.appendChild(salTableWrapper);

  // Poblar la nueva tabla SAL
  // Iterar sobre cada 'table-wrapper' existente (que contiene las tablas detalladas originales)
  document
    .querySelectorAll(
      "#tableContainer .table-wrapper:not(.sal-copy-table-wrapper)"
    )
    .forEach((originalTableWrapper) => {
      const originalTable = originalTableWrapper.querySelector("table");
      const originalTbody = originalTable.querySelector("tbody");
      // Obtener el título de la sección original desde el atributo de datos
      const originalSectionTitle =
        originalTable.getAttribute("data-section-title") || "Sin Título";

      originalTbody
        .querySelectorAll("tr:not(.total-row)")
        .forEach((originalRow) => {
          const newRow = document.createElement("tr");

          // Obtener celdas de la fila original
          const originalCells = originalRow.querySelectorAll("td");
          // Calcular la longitud de las cabeceras originales para encontrar las columnas SAL
          const originalHeadersLength =
            originalTable.querySelector("thead tr").children.length - 4; // Menos las 4 columnas SAL añadidas

          // 1. Añadir celda de Título de Sección
          const sectionTitleTd = document.createElement("td");
          sectionTitleTd.textContent = originalSectionTitle;
          newRow.appendChild(sectionTitleTd);

          // 2. Obtener el valor de SAL % del input en la tabla original
          const originalSalInput =
            originalCells[originalHeadersLength]?.querySelector(
              "input.sal-input"
            );
          const salPercentValue = originalSalInput
            ? originalSalInput.value
            : "0";
          const salPercentTd = document.createElement("td");
          salPercentTd.textContent = `${parseFloat(salPercentValue).toFixed(
            2
          )}%`;
          salPercentTd.classList.add("text-end");
          newRow.appendChild(salPercentTd);

          // 3. Obtener el valor de Importo SAL de la tabla original
          const salImportoValue =
            originalCells[originalHeadersLength + 1]?.textContent;
          const salImportoTd = document.createElement("td");
          salImportoTd.textContent = salImportoValue || "0,00";
          salImportoTd.classList.add("text-end");
          newRow.appendChild(salImportoTd);

          tbody.appendChild(newRow);
        });

      // Añadir una fila de total para esta sección en la nueva tabla SAL copia
      const totalOriginalRow = originalTbody.querySelector(".total-row");
      if (totalOriginalRow) {
        const newTotalRow = document.createElement("tr");
        newTotalRow.classList.add(
          "table-info",
          "fw-bold",
          "sal-copy-total-row"
        );

        const originalHeadersLength =
          originalTable.querySelector("thead tr").children.length - 4;

        const totalLabelTd = document.createElement("td");
        totalLabelTd.textContent = `${originalSectionTitle} Total:`;
        newTotalRow.appendChild(totalLabelTd);

        const totalSalPercentTd = document.createElement("td");
        const originalTotalSalPercentText =
          totalOriginalRow.children[originalHeadersLength]?.textContent;
        totalSalPercentTd.textContent = originalTotalSalPercentText || "0,00%";
        totalSalPercentTd.classList.add("text-end");
        newTotalRow.appendChild(totalSalPercentTd);

        const totalImportoSalTd = document.createElement("td");
        const originalTotalImportoSalText =
          totalOriginalRow.children[originalHeadersLength + 1]?.textContent;
        totalImportoSalTd.textContent = originalTotalImportoSalText || "0,00";
        totalImportoSalTd.classList.add("text-end");
        newTotalRow.appendChild(totalImportoSalTd);

        tbody.appendChild(newTotalRow);
      }
    });

  // Añadir una fila de gran total final para esta nueva tabla SAL copia
  const finalGrandTotalRow = document.createElement("tr");
  finalGrandTotalRow.classList.add("table-primary", "fw-bold");

  const grandTotalLabelTd = document.createElement("td");
  grandTotalLabelTd.textContent = "TOTAL GLOBAL SAL:";
  grandTotalLabelTd.colSpan = 1;
  finalGrandTotalRow.appendChild(grandTotalLabelTd);

  const grandTotalPercentTd = document.createElement("td");
  // Aquí, la suma de porcentajes SAL de todas las secciones puede no ser significativa
  // a menos que sea una media ponderada o similar. Por ahora, se deja vacío.
  grandTotalPercentTd.textContent = "";
  finalGrandTotalRow.appendChild(grandTotalPercentTd);

  const grandTotalValueTd = document.createElement("td");
  const totalSummaryTable = document.getElementById("summaryTableWrapper");
  if (totalSummaryTable) {
    const lastRow = totalSummaryTable.querySelector("tbody tr:last-child");
    if (lastRow && lastRow.children.length > 1) {
      // Obtener el gran total del "Resumen de Importes SAL por Sección"
      grandTotalValueTd.textContent = lastRow.children[1].textContent;
    }
  } else {
    grandTotalValueTd.textContent = "0,00";
  }
  grandTotalValueTd.classList.add("text-end");
  finalGrandTotalRow.appendChild(grandTotalValueTd);

  tbody.appendChild(finalGrandTotalRow);
});
