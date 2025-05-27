// main.js

// Variable global para almacenar el índice de la columna base de cálculo (definida por el usuario)
let globalBaseCalcColIndex = -1;

document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById("fileNameTitle").textContent = "";
    document.getElementById("tableContainer").innerHTML = "";
    document.getElementById("printPdfBtn").style.display = "none";
    document.getElementById("globalCalculationColumnSelector").style.display =
      "none"; // Ocultar selector
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
    document.getElementById("printPdfBtn").style.display = "none"; // Ocultar temporalmente hasta que se seleccione la columna
    document.getElementById("globalCalculationColumnSelector").style.display =
      "block"; // Mostrar selector

    let currentTableData = []; // Filas de datos para la tabla actual
    let globalHeaders = []; // Cabeceras de la primera fila del Excel
    let colMap = {}; // Mapeo de nombres de cabeceras a índices
    let currentSectionTitle = ""; // Título de la sección actual
    let globalTotalableColumns = []; // Nombres de columnas que se pueden totalizar (para el select de cada tabla)

    /**
     * Helper para verificar si una celda está vacía.
     */
    const isCellEmpty = (cell) =>
      cell === undefined || cell === null || String(cell).trim() === "";

    // Filtrar filas completamente vacías al principio del procesamiento
    const filteredJson = json.filter((row) =>
      row.some((cell) => !isCellEmpty(cell))
    );

    // Obtener las cabeceras de la primera fila filtrada (indexInFiltered === 0)
    if (filteredJson.length > 0) {
      globalHeaders = filteredJson[0].map((header) =>
        header === undefined ? "" : String(header).trim()
      );

      // Llenar el selector global de columna base de cálculo
      const baseCalcColSelect = document.getElementById("baseCalcColSelect");
      baseCalcColSelect.innerHTML = ""; // Limpiar opciones anteriores

      // Asegurarse de que solo se añaden columnas que contengan datos numéricos
      // Aquí puedes ajustar el criterio de qué columnas son elegibles para ser "base de cálculo"
      const eligibleBaseCols = globalHeaders.filter((header, idx) => {
        // Un criterio simple: que el nombre contenga "Importe" o "Cantidad", o las columnas "G", "H"
        return (
          header.includes("Importe") ||
          header.includes("Cantidad") ||
          header === "G" ||
          header === "H"
        );
      });

      if (eligibleBaseCols.length === 0) {
        // Si no se encuentran columnas "elegibles" por nombre, tal vez mostrar todas las que no están vacías
        eligibleBaseCols = globalHeaders.filter((header) => header !== "");
      }

      eligibleBaseCols.forEach((colName, index) => {
        const option = document.createElement("option");
        option.value = globalHeaders.indexOf(colName); // Usar el índice real de la columna en globalHeaders
        option.textContent = colName;
        baseCalcColSelect.appendChild(option);
      });

      // Intentar seleccionar por defecto la columna "H" si existe, o la primera elegible
      const defaultBaseColIndex = globalHeaders.indexOf("H"); // O "IMPORTE UNITARIO" si ese es su nombre real
      if (
        defaultBaseColIndex !== -1 &&
        eligibleBaseCols.includes(globalHeaders[defaultBaseColIndex])
      ) {
        baseCalcColSelect.value = defaultBaseColIndex;
        globalBaseCalcColIndex = defaultBaseColIndex;
      } else if (eligibleBaseCols.length > 0) {
        baseCalcColSelect.value = globalHeaders.indexOf(eligibleBaseCols[0]);
        globalBaseCalcColIndex = globalHeaders.indexOf(eligibleBaseCols[0]);
      } else {
        baseCalcColSelect.disabled = true;
        document.getElementById("printPdfBtn").style.display = "none"; // Desactivar si no hay columna base
      }

      // Listener para el selector global de columna base de cálculo
      baseCalcColSelect.addEventListener("change", function () {
        globalBaseCalcColIndex = parseInt(this.value);
        // Recalcular y redibujar todas las tablas para aplicar el nuevo índice base
        // Esto es crucial para que el cambio de selector tenga efecto
        renderTables(
          filteredJson.slice(1),
          globalHeaders,
          globalBaseCalcColIndex
        );
        document.getElementById("printPdfBtn").style.display = "block"; // Mostrar botón de PDF
      });

      // Si ya hay una columna seleccionada (por defecto o si se cargó el archivo de nuevo),
      // proceder a renderizar las tablas.
      if (globalBaseCalcColIndex !== -1) {
        renderTables(
          filteredJson.slice(1),
          globalHeaders,
          globalBaseCalcColIndex
        );
        document.getElementById("printPdfBtn").style.display = "block"; // Mostrar botón de PDF
      }
    } // Fin if filteredJson.length > 0
  };

  reader.readAsArrayBuffer(file);
});

/**
 * Función para renderizar todas las tablas basadas en los datos procesados.
 * Esto se separa para poder ser llamado cuando el selector global cambia.
 * @param {Array<Array<any>>} jsonDataRows - Las filas de datos del Excel (excluyendo cabeceras).
 * @param {Array<string>} headers - Las cabeceras globales del Excel.
 * @param {number} baseCalcColIdx - El índice de la columna base para los cálculos SAL.
 */
const renderTables = (jsonDataRows, headers, baseCalcColIdx) => {
  const container = document.getElementById("tableContainer");
  container.innerHTML = ""; // Limpiar tablas existentes antes de redibujar

  let currentTableData = [];
  let currentSectionTitle = "";
  let isFirstTable = true;

  jsonDataRows.forEach((row, indexInJsonDataRows) => {
    // Lógica de corte de tabla:
    // Una fila es un "corte de tabla" si sus celdas 0 Y 1 no están vacías (es un título de sección).
    const isNewSectionHeader = !isCellEmpty(row[0]) && !isCellEmpty(row[1]);
    // Una fila completamente vacía también es un corte/final de tabla.
    const isCompletelyEmptyRow = row.every((cell) => isCellEmpty(cell));

    if (
      (isNewSectionHeader || isCompletelyEmptyRow) &&
      currentTableData.length > 0
    ) {
      // Si ya tenemos datos acumulados para la tabla anterior, la creamos.
      createAndAppendTable(
        currentSectionTitle,
        currentTableData,
        headers,
        baseCalcColIdx // Pasamos el índice de la columna base para el cálculo
      );
      currentTableData = []; // Reset para la nueva tabla
      isFirstTable = false; // Ya no es la primera tabla
    }

    // Si es un nuevo encabezado de sección, actualizamos el título para la próxima tabla
    if (isNewSectionHeader) {
      currentSectionTitle = `${row[0] || ""} ${row[1] || ""}`.trim();
    } else if (isCompletelyEmptyRow) {
      // Si es una fila completamente vacía, no hay título para la siguiente sección
      currentSectionTitle = "";
    } else {
      // Si no es un corte ni una fila vacía, es una fila de datos.
      currentTableData.push(row);
      // Si es la primera tabla y no hubo título de sección, su título se mantiene vacío.
      if (isFirstTable && currentSectionTitle === "") {
        currentSectionTitle = "";
      }
    }
  });

  // Después de procesar todas las filas, renderizar la última tabla si hay datos pendientes
  if (currentTableData.length > 0) {
    createAndAppendTable(
      currentSectionTitle,
      currentTableData,
      headers,
      baseCalcColIdx
    );
  }
};

/**
 * Crea y añade una tabla HTML al contenedor.
 * @param {string} titleText - Título de la tabla.
 * @param {Array<Array<any>>} dataRows - Filas de datos para la tabla.
 * @param {Array<string>} tableHeaders - Cabeceras de la tabla (originales + SAL).
 * @param {number} baseCalcColIndex - El índice de la columna base para los cálculos SAL.
 */
const createAndAppendTable = (
  titleText,
  dataRows,
  tableHeaders,
  baseCalcColIndex
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
  const totalSelectorDiv = document.createElement("div");
  totalSelectorDiv.className = "d-flex align-items-center mb-3";
  const totalLabel = document.createElement("label");
  totalLabel.htmlFor = `totalColSelect-${Date.now()}`;
  totalLabel.textContent = "Totalizar columna original: ";
  totalLabel.className = "form-label me-2 mb-0";

  const totalColSelect = document.createElement("select");
  totalColSelect.className = "form-select total-col-select";
  totalColSelect.id = totalLabel.htmlFor;

  // Rellenar el selector con las columnas disponibles para totalizar
  globalTotalableColumns.forEach((colName, index) => {
    const option = document.createElement("option");
    // Usar el índice real de la columna en tableHeaders
    option.value = tableHeaders.indexOf(colName);
    option.textContent = colName;
    totalColSelect.appendChild(option);
  });
  // Seleccionar por defecto la columna base de cálculo (si es totalizable) o la primera opción
  if (globalTotalableColumns.includes(tableHeaders[baseCalcColIndex])) {
    totalColSelect.value = baseCalcColIndex;
  } else if (globalTotalableColumns.length > 0) {
    totalColSelect.value = tableHeaders.indexOf(globalTotalableColumns[0]);
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
      "Importo SAL": 0,
      "Importo A FINIRE": 0,
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

      // Sumar los valores calculados de Importo SAL y Importo A FINIRE (siempre)
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

      // Actualizar los totales de Importo SAL y Importo A FINIRE (siempre)
      if (totalCells[tableHeaders.length + 1])
        totalCells[tableHeaders.length + 1].textContent =
          tempTotals["Importo SAL"].toFixed(2);
      if (totalCells[tableHeaders.length + 3])
        totalCells[tableHeaders.length + 3].textContent =
          tempTotals["Importo A FINIRE"].toFixed(2);
    }
  };

  // Listener para el selector de columna de total
  totalColSelect.addEventListener("change", updateTableTotals);

  // Llenar el tbody con los datos de las filas
  dataRows.forEach((row) => {
    const tr = document.createElement("tr");

    // Añadir las celdas con los datos originales
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

    // Celda de entrada SAL %
    const salTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control text-end col-sal";
    input.value = "0"; // Inicializar SAL % a 0, sin decimales por defecto
    salTd.appendChild(input);

    // Celda Importo SAL (calculado)
    const salImportoTd = document.createElement("td");
    salImportoTd.className = "text-end";
    salImportoTd.textContent = "0.00"; // Inicializar a 0.00

    // Celda A FINIRE % (calculado)
    const finirePercentTd = document.createElement("td");
    finirePercentTd.className = "text-end";
    finirePercentTd.textContent = "100.00%"; // Inicializar a 100.00%

    // Celda Importo A FINIRE (calculado)
    const finireImportoTd = document.createElement("td");
    finireImportoTd.className = "text-end";
    finireImportoTd.textContent = baseCalcValue.toFixed(2); // Inicializar con el valor de la columna base de cálculo

    input.addEventListener("input", () => {
      let val = parseFloat(input.value.replace(",", "."));
      val = isNaN(val) ? 0 : Math.min(Math.max(val, 0), 100);
      input.value = val; // Mantener el formato del usuario, sin forzar decimales

      if (val > 100 || val < 0) {
        input.classList.add("is-invalid");
      } else {
        input.classList.remove("is-invalid");
      }

      const percent = val / 100;
      salImportoTd.textContent = (baseCalcValue * percent).toFixed(2);
      finirePercentTd.textContent = ((1 - percent) * 100).toFixed(2) + "%";
      finireImportoTd.textContent = (baseCalcValue * (1 - percent)).toFixed(2);

      updateTableTotals(); // Actualizar los totales de la tabla después de cada cambio
    });

    tr.appendChild(salTd);
    tr.appendChild(salImportoTd);
    tr.appendChild(finirePercentTd);
    tr.appendChild(finireImportoTd);

    tbody.appendChild(tr);
  });

  // Añadir la fila de totales al final de la tabla
  const totalRow = document.createElement("tr");
  totalRow.classList.add("total-row", "table-info"); // Clase Bootstrap para resaltar

  // Crear celdas para los totales. Se rellenarán en updateTableTotals.
  // Serán el número de columnas originales + las 4 nuevas
  for (let i = 0; i < tableHeaders.length + 4; i++) {
    totalRow.appendChild(document.createElement("td"));
  }
  tbody.appendChild(totalRow);

  // Calcular y mostrar los totales iniciales
  updateTableTotals();
};

// Listener para el botón de impresión de PDF
document.getElementById("printPdfBtn").addEventListener("click", function () {
  const pdfGen = new PdfGenerator();

  // Obtener las cabeceras de la primera tabla generada en el DOM
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

  // Definir las columnas a incluir en el PDF: 1 a 6 (índices 0 a 5) y luego 'SAL %' e 'Importo SAL'.
  // Estos índices son los del HTML, que incluyen las columnas originales + las añadidas.
  const columnsToInclude = [0, 1, 2, 3, 4, 5]; // Columnas originales (índices en el array de fila)

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
