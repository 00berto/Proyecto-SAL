// main.js

let globalBaseCalcColIndex = -1; // Almacenará el índice de la columna seleccionada globalmente

document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById("fileNameTitle").textContent = "";
    document.getElementById("tableContainer").innerHTML = "";
    document.getElementById("printPdfBtn").style.display = "none";
    // globalCalculationColumnSelector ya es visible, solo lo limpiamos/deshabilitamos si no hay archivo
    document.getElementById("baseCalcColSelect").innerHTML = "";
    document.getElementById("baseCalcColSelect").disabled = true;
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
    let globalTotalableColumns = []; // Nombres de columnas que se pueden totalizar (para el select de cada tabla)

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
      document.getElementById("baseCalcColSelect").innerHTML = "";
      document.getElementById("baseCalcColSelect").disabled = true;
      document.getElementById("printPdfBtn").style.display = "none";
      return;
    }

    // Obtener las cabeceras de la primera fila filtrada (index 0 de filteredJson)
    globalHeaders = filteredJson[0].map((header) =>
      header === undefined ? "" : String(header).trim()
    );

    // Llenar el selector global de columna base de cálculo
    const baseCalcColSelect = document.getElementById("baseCalcColSelect");
    baseCalcColSelect.innerHTML = ""; // Limpiar opciones anteriores
    baseCalcColSelect.disabled = false; // Habilitar por si estaba deshabilitado

    // Rellenar el selector global con TODAS las cabeceras no vacías para que el usuario elija
    const eligibleBaseCols = globalHeaders.filter((header) => header !== "");

    if (eligibleBaseCols.length === 0) {
      baseCalcColSelect.disabled = true;
      document.getElementById("printPdfBtn").style.display = "none";
      alert(
        "Advertencia: No se encontraron columnas en las cabeceras del archivo Excel."
      );
      return;
    }

    eligibleBaseCols.forEach((colName) => {
      const option = document.createElement("option");
      option.value = globalHeaders.indexOf(colName); // Usar el índice real de la columna en globalHeaders
      option.textContent = colName;
      baseCalcColSelect.appendChild(option);
    });

    // Seleccionar por defecto la columna "H" si existe, o la primera opción disponible
    const defaultBaseColIndex = globalHeaders.indexOf("H");
    if (
      defaultBaseColIndex !== -1 &&
      eligibleBaseCols.includes(globalHeaders[defaultBaseColIndex])
    ) {
      baseCalcColSelect.value = defaultBaseColIndex;
      globalBaseCalcColIndex = defaultBaseColIndex;
    } else {
      // Si no se encuentra "H", selecciona la primera opción disponible y actualiza el global
      globalBaseCalcColIndex = parseInt(baseCalcColSelect.value);
    }

    // Identificar qué columnas se pueden totalizar para los selectores por tabla
    // (Este es para el selector de 'Totalizar columna original' en cada tabla)
    globalTotalableColumns = globalHeaders.filter((header) => {
      // Criterio: nombres que sugieren importes o cantidades, o columnas específicas
      return (
        header.includes("Importe") ||
        header.includes("Cantidad") ||
        header === "G" ||
        header === "H"
      );
    });
    // Si no se encuentran columnas "totalizables" específicas, tomar todas las cabeceras no vacías
    if (globalTotalableColumns.length === 0) {
      globalTotalableColumns = globalHeaders.filter((header) => header !== "");
    }

    // Listener para el selector global de columna base de cálculo
    baseCalcColSelect.addEventListener("change", function () {
      globalBaseCalcColIndex = parseInt(this.value);
      // Redibujar todas las tablas con el nuevo índice base
      renderTables(
        filteredJson.slice(1),
        globalHeaders,
        globalBaseCalcColIndex,
        globalTotalableColumns
      );
      document.getElementById("printPdfBtn").style.display = "block";
    });

    // LLAMADA INICIAL A renderTables aquí, después de la inicialización del selector
    renderTables(
      filteredJson.slice(1),
      globalHeaders,
      globalBaseCalcColIndex,
      globalTotalableColumns
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
 * @param {number} baseCalcColIdx - El índice de la columna base para los cálculos SAL.
 * @param {Array<string>} totalableCols - Nombres de las columnas que pueden ser totalizadas (para el selector por tabla).
 */
const renderTables = (jsonDataRows, headers, baseCalcColIdx, totalableCols) => {
  const container = document.getElementById("tableContainer");
  container.innerHTML = ""; // Limpiar tablas existentes antes de redibujar

  let currentTableData = [];
  let currentSectionTitle = "";
  let isFirstTable = true; // Para la primera tabla, no tendrá título si el Excel no empieza con un corte claro

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
        totalableCols
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
      totalableCols
    );
  }
};

/**
 * Crea y añade una tabla HTML al contenedor.
 * @param {string} titleText - Título de la tabla.
 * @param {Array<Array<any>>} dataRows - Filas de datos para la tabla.
 * @param {Array<string>} tableHeaders - Cabeceras de la tabla (originales + SAL).
 * @param {number} baseCalcColIndex - El índice de la columna base para los cálculos SAL.
 * @param {Array<string>} totalableCols - Nombres de las columnas que pueden ser totalizadas (para el selector por tabla).
 */
const createAndAppendTable = (
  titleText,
  dataRows,
  tableHeaders,
  baseCalcColIndex,
  totalableCols
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

  // --- Selector de columna a totalizar por tabla (para columnas originales) ---
  // Este selector sigue controlando solo la columna original que el usuario quiere totalizar
  const totalSelectorDiv = document.createElement("div");
  totalSelectorDiv.className = "d-flex align-items-center mb-3";
  const totalLabel = document.createElement("label");
  totalLabel.htmlFor = `totalColSelect-${Date.now()}`;
  totalLabel.textContent = "Totalizar columna original: ";
  totalLabel.className = "form-label me-2 mb-0";

  const totalColSelect = document.createElement("select");
  totalColSelect.className = "form-select total-col-select";
  totalColSelect.id = totalLabel.htmlFor;

  totalableCols.forEach((colName) => {
    const option = document.createElement("option");
    option.value = tableHeaders.indexOf(colName);
    option.textContent = colName;
    totalColSelect.appendChild(option);
  });

  // Seleccionar por defecto la columna base de cálculo (si es totalizable) o la primera opción
  if (totalableCols.includes(tableHeaders[baseCalcColIndex])) {
    totalColSelect.value = baseCalcColIndex;
  } else if (totalableCols.length > 0) {
    totalColSelect.value = tableHeaders.indexOf(totalableCols[0]);
  } else {
    totalColSelect.disabled = true;
  }

  totalSelectorDiv.appendChild(totalLabel);
  totalSelectorDiv.appendChild(totalColSelect);
  tableWrapper.appendChild(totalSelectorDiv);
  // --- Fin Selector de columna a totalizar por tabla ---

  // Función para actualizar los totales de la fila de totales de esta tabla
  const updateTableTotals = () => {
    let tempTotals = {
      "Importo SAL": 0, // Siempre inicializado a 0
      "Importo A FINIRE": 0, // Siempre inicializado a 0
    };
    const selectedColIndex = parseInt(totalColSelect.value); // Columna original seleccionada para totalizar

    // Inicializar tempTotals para la columna original seleccionada
    if (
      !isNaN(selectedColIndex) &&
      selectedColIndex !== -1 &&
      selectedColIndex < tableHeaders.length
    ) {
      tempTotals[tableHeaders[selectedColIndex]] = 0;
    }

    // Iterar sobre todas las filas de datos en el tbody (excluyendo la fila de totales)
    tbody.querySelectorAll("tr:not(.total-row)").forEach((rowElement) => {
      const cells = rowElement.querySelectorAll("td");

      // Sumar el valor de la columna original seleccionada dinámicamente
      if (
        !isNaN(selectedColIndex) &&
        selectedColIndex !== -1 &&
        cells[selectedColIndex]
      ) {
        tempTotals[tableHeaders[selectedColIndex]] +=
          parseFloat(cells[selectedColIndex]?.textContent) || 0;
      }

      // ESTOS TOTALES SIEMPRE SE SUMAN, INDEPENDIENTEMENTE DEL SELECTOR
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

      // Actualizar la columna original seleccionada para totalizar
      if (
        !isNaN(selectedColIndex) &&
        selectedColIndex !== -1 &&
        totalCells[selectedColIndex]
      ) {
        totalCells[selectedColIndex].textContent =
          tempTotals[tableHeaders[selectedColIndex]]?.toFixed(2) || "0.00";
      }

      // ESTOS TOTALES SIEMPRE SE MUESTRAN EN LA FILA DE TOTALES
      if (totalCells[tableHeaders.length + 1])
        totalCells[tableHeaders.length + 1].textContent =
          tempTotals["Importo SAL"].toFixed(2);
      if (totalCells[tableHeaders.length + 3])
        totalCells[tableHeaders.length + 3].textContent =
          tempTotals["Importo A FINIRE"].toFixed(2);
    }
  };

  totalColSelect.addEventListener("change", updateTableTotals);

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

    // Obtener el valor de la columna base de cálculo (seleccionada globalmente por el usuario)
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

      updateTableTotals();
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

  updateTableTotals();
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

  const columnsToInclude = [0, 1, 2, 3, 4, 5];

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
