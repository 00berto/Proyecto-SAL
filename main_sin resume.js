// main.js

// Ya no necesitamos globalBaseCalcColIndex como variable de selección,
// la fijamos a 7 directamente para "IMPORTO totale CONTRATTO".
const BASE_CALC_COL_INDEX = 7; // Columna "IMPORTO totale CONTRATTO" (índice 7)

document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById("fileNameTitle").textContent = "";
    document.getElementById("tableContainer").innerHTML = "";
    document.getElementById("printPdfBtn").style.display = "none";
    // El selector global ya no existe, eliminamos las referencias a él.
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    document.getElementById(
      "fileNameTitle"
    ).textContent = `Archivo cargado: ${file.name}`;
    const container = document.getElementById("tableContainer");
    container.innerHTML = ""; // Limpiar tablas anteriores
    document.getElementById("printPdfBtn").style.display = "none";

    let globalHeaders = []; // Cabeceras de la primera fila del Excel
    // globalTotalableColumns se definirá más tarde para las columnas específicas a totalizar

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
      return;
    }

    // Obtener las cabeceras de la primera fila filtrada (index 0 de filteredJson)
    globalHeaders = filteredJson[0].map((header) =>
      header === undefined ? "" : String(header).trim()
    );

    // Validar si la columna BASE_CALC_COL_INDEX existe
    if (globalHeaders.length <= BASE_CALC_COL_INDEX) {
      alert(
        `Error: La columna base para cálculo (índice ${BASE_CALC_COL_INDEX} - "${
          globalHeaders[BASE_CALC_COL_INDEX] || "N/A"
        }") no existe en el archivo Excel.`
      );
      document.getElementById("printPdfBtn").style.display = "none";
      return;
    }

    // Definir las columnas que SIEMPRE se totalizarán automáticamente
    // Los índices deben ser los índices absolutos de las columnas en el Excel/tabla
    const autoTotalColumnIndexes = [4, 5, 6, 7, 9, 11]; // QUANTITA', IMPORTO unitario (SENZA COSTO), IMPORTO unitario, IMPORTO totale CONTRATTO, Importo SAL, Importo A FINIRE
    const autoTotalColumnNames = autoTotalColumnIndexes.map(
      (idx) => globalHeaders[idx] || `Columna ${idx}`
    ); // Obtener nombres para referencia

    // LLAMADA INICIAL A renderTables aquí
    renderTables(
      filteredJson.slice(1),
      globalHeaders,
      BASE_CALC_COL_INDEX,
      autoTotalColumnIndexes,
      autoTotalColumnNames
    );
    document.getElementById("printPdfBtn").style.display = "block";
  };

  reader.readAsArrayBuffer(file);
});

/**
 * Función para renderizar todas las tablas basadas en los datos procesados.
 * Esto se separa para poder ser llamado cuando el selector global cambia.
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
};

/**
 * Crea y añade una tabla HTML al contenedor.
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
  tableWrapper.className = "table-wrapper";

  if (titleText) {
    const title = document.createElement("h4");
    title.textContent = titleText;
    tableWrapper.appendChild(title);
  }

  const table = document.createElement("table");
  table.className = "table table-bordered table-sm mb-4";

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

  // --- ELIMINAMOS EL SELECTOR DE TOTALES POR TABLA ---
  // Ya no es necesario un selector para elegir qué columna totalizar,
  // ya que los totales serán automáticos para las columnas predefinidas.
  // --- FIN ELIMINAMOS SELECTOR ---

  // Función para actualizar los totales de la fila de totales de esta tabla
  const updateTableTotals = () => {
    let tempTotals = {}; // Objeto para almacenar todos los totales

    // Inicializar los totales para las columnas predefinidas
    autoTotalColIndexes.forEach((idx) => {
      // Usamos el nombre de la cabecera real como clave
      tempTotals[tableHeaders[idx]] = 0;
    });
    tempTotals["Importo SAL"] = 0; // Siempre inicializado
    tempTotals["Importo A FINIRE"] = 0; // Siempre inicializado

    // Iterar sobre todas las filas de datos en el tbody (excluyendo la fila de totales)
    tbody.querySelectorAll("tr:not(.total-row)").forEach((rowElement) => {
      const cells = rowElement.querySelectorAll("td");

      // Sumar los valores de las columnas predefinidas
      autoTotalColIndexes.forEach((idx) => {
        if (cells[idx]) {
          tempTotals[tableHeaders[idx]] +=
            parseFloat(cells[idx]?.textContent) || 0;
        }
      });

      // Sumar los valores de Importo SAL y Importo A FINIRE (siempre)
      tempTotals["Importo SAL"] +=
        parseFloat(cells[tableHeaders.length + 1]?.textContent) || 0;
      tempTotals["Importo A FINIRE"] +=
        parseFloat(cells[tableHeaders.length + 3]?.textContent) || 0;
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

      // Mostrar los totales de las columnas predefinidas
      autoTotalColIndexes.forEach((idx) => {
        if (totalCells[idx]) {
          totalCells[idx].textContent =
            tempTotals[tableHeaders[idx]]?.toFixed(2) || "0.00";
        }
      });

      // Mostrar los totales de Importo SAL y Importo A FINIRE
      if (totalCells[tableHeaders.length + 1])
        totalCells[tableHeaders.length + 1].textContent =
          tempTotals["Importo SAL"].toFixed(2);
      if (totalCells[tableHeaders.length + 3])
        totalCells[tableHeaders.length + 3].textContent =
          tempTotals["Importo A FINIRE"].toFixed(2);
    }
  };

  // Ya no hay un listener para totalColSelect, ya que fue eliminado.
  // La actualización se realizará solo cuando cambien los inputs de SAL %.

  // Llenar el tbody con los datos de las filas
  dataRows.forEach((row) => {
    const tr = document.createElement("tr");

    tableHeaders.forEach((_, i) => {
      const td = document.createElement("td");
      const value = row[i];
      td.textContent =
        typeof value === "number" ? value.toFixed(2) : value || "";
      tr.appendChild(td);
    });

    // Obtener el valor de la columna base de cálculo (ahora siempre índice 7)
    const baseCalcValue =
      baseCalcColIndex !== -1 && !isNaN(parseFloat(row[baseCalcColIndex]))
        ? parseFloat(row[baseCalcColIndex])
        : 0;

    const salTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control text-end col-sal";
    input.value = "0";
    salTd.appendChild(input);

    const salImportoTd = document.createElement("td");
    salImportoTd.className = "text-end";
    salImportoTd.textContent = "0.00";

    const finirePercentTd = document.createElement("td");
    finirePercentTd.className = "text-end";
    finirePercentTd.textContent = "100.00%";

    const finireImportoTd = document.createElement("td");
    finireImportoTd.className = "text-end";
    finireImportoTd.textContent = baseCalcValue.toFixed(2);

    input.addEventListener("input", () => {
      let val = parseFloat(input.value.replace(",", "."));
      val = isNaN(val) ? 0 : Math.min(Math.max(val, 0), 100);
      input.value = val;

      if (val > 100 || val < 0) {
        input.classList.add("is-invalid");
      } else {
        input.classList.remove("is-invalid");
      }

      const percent = val / 100;
      salImportoTd.textContent = (baseCalcValue * percent).toFixed(2);
      finirePercentTd.textContent = ((1 - percent) * 100).toFixed(2) + "%";
      finireImportoTd.textContent = (baseCalcValue * (1 - percent)).toFixed(2);

      updateTableTotals(); // Actualizar los totales de la tabla después de cada cambio en SAL %
    });

    tr.appendChild(salTd);
    tr.appendChild(salImportoTd);
    tr.appendChild(finirePercentTd);
    tr.appendChild(finireImportoTd);

    tbody.appendChild(tr);
  });

  const totalRow = document.createElement("tr");
  totalRow.classList.add("total-row", "table-info");

  for (let i = 0; i < tableHeaders.length + 4; i++) {
    totalRow.appendChild(document.createElement("td"));
  }
  tbody.appendChild(totalRow);

  updateTableTotals(); // Calcular y mostrar los totales iniciales
};

document.getElementById("printPdfBtn").addEventListener("click", function () {
  const pdfGen = new PdfGenerator();

  const firstTableElement = document.querySelector(
    "#tableContainer .table-wrapper table"
  );
  if (!firstTableElement) {
    alert(
      "No hay tablas generadas para imprimir. Carga un archivo Excel primero."
    );
    return;
  }
  const firstTableHtmlHeaders = Array.from(
    firstTableElement.querySelectorAll("thead th")
  ).map((th) => th.textContent.trim());

  // Definir las columnas a incluir en el PDF, ajustando según los nuevos totales
  const columnsToInclude = [0, 1, 2, 3, 4, 5, 6, 7]; // Columna 7 ahora es "IMPORTO totale CONTRATTO"
  // Las columnas SAL se añaden después de las originales.
  const salPercentIndex = firstTableHtmlHeaders.indexOf("SAL %");
  const importoSalIndex = firstTableHtmlHeaders.indexOf("Importo SAL");
  const finirePercentIndex = firstTableHtmlHeaders.indexOf("A FINIRE %");
  const finireImportoIndex = firstTableHtmlHeaders.indexOf("Importo A FINIRE");

  if (salPercentIndex !== -1) columnsToInclude.push(salPercentIndex);
  if (importoSalIndex !== -1) columnsToInclude.push(importoSalIndex);
  if (finirePercentIndex !== -1) columnsToInclude.push(finirePercentIndex);
  if (finireImportoIndex !== -1) columnsToInclude.push(finireImportoIndex);

  pdfGen.generatePdf(
    "tableContainer",
    columnsToInclude,
    "Reporte_Proyecto_SAL.pdf"
  );
});
