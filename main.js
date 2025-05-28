// main.js

// Columna fija para el cálculo SAL: "IMPORTO totale CONTRATTO" (índice 7)
const BASE_CALC_COL_INDEX = 7;

// Array para almacenar los totales de "Importo SAL" de cada tabla para el resumen global
let allTablesSalTotals = [];

/**
 * Función auxiliar para limpiar un string formateado con separadores de miles y decimales
 * (ej. '1'234,56') y convertirlo a un número válido para cálculos (ej. 1234.56).
 * Asume el formato 'de-CH' (apóstrofo para miles, coma para decimales).
 * @param {string} str - La cadena de texto numérica formateada.
 * @returns {number} El número parseado o 0 si no es válido.
 */
// const parseFormattedNumber = (str) => {
//   if (typeof str !== "string" || !str) {
//     return 0;
//   }
//   // Eliminar el separador de miles (apóstrofo) y reemplazar el separador decimal (coma) por punto
//   const cleanedStr = str.replace(/'/g, "").replace(",", ".");
//   return parseFloat(cleanedStr) || 0; // Si parseFloat falla, devuelve 0
// };

//CAMBIO PARA EL FORMATO ITALIANO
const parseFormattedNumber = (str) => {
  if (typeof str !== "string" || !str) {
    return 0;
  }
  // Eliminar el separador de miles (punto) y reemplazar el separador decimal (coma) por punto
  const cleanedStr = str.replace(/\./g, "").replace(",", "."); // <-- Cambiar aquí: eliminar punto y reemplazar coma
  return parseFloat(cleanedStr) || 0;
};

document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById("fileNameTitle").textContent = "";
    document.getElementById("tableContainer").innerHTML = "";
    document.getElementById("printPdfBtn").style.display = "none";
    allTablesSalTotals = []; // Limpiar totales si no hay archivo
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
    allTablesSalTotals = []; // Resetear los totales para un nuevo archivo

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
      return;
    }

    // Definir los índices de las columnas que SIEMPRE se totalizarán automáticamente en cada tabla
    const autoTotalColumnIndexes = [
      4, // QUANTITA'
      5, // IMPORTO unitario (SENZA COSTO)
      6, // IMPORTO unitario
      7, // IMPORTO totale CONTRATTO (nuestra base SAL)
      9, // Importo SAL (calculada)
      11, // Importo A FINIRE (calculada)
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
  dataRows.forEach((row) => {
    const tr = document.createElement("tr");

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
    // Es importante parsear correctamente si el valor de la celda de origen también está formateado
    const baseCalcValue =
      baseCalcColIndex !== -1 &&
      !isNaN(parseFormattedNumber(row[baseCalcColIndex]))
        ? parseFormattedNumber(row[baseCalcColIndex])
        : 0;

    const salTd = document.createElement("td");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control text-end col-sal";
    input.value = "0"; // Valor inicial del porcentaje SAL
    salTd.appendChild(input);

    const salImportoTd = document.createElement("td");
    salImportoTd.className = "text-end";
    salImportoTd.textContent = "0,00"; // Valor inicial del importe SAL (formato de-CH)

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
        "de-CH",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      );
      finirePercentTd.textContent = ((1 - percent) * 100).toFixed(2) + "%";
      finireImportoTd.textContent = (
        baseCalcValue *
        (1 - percent)
      ).toLocaleString("de-CH", {
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
  // `tableHeaders.length + 4` cubre las columnas originales + SAL%, Importo SAL, A FINIRE %, Importo A FINIRE
  for (let i = 0; i < tableHeaders.length + 4; i++) {
    totalRow.appendChild(document.createElement("td"));
  }
  tbody.appendChild(totalRow);

  updateTableTotals(); // Calcular y mostrar los totales iniciales de la tabla
};

// PDF GENERATOR

document.getElementById("printPdfBtn").addEventListener("click", function () {
  const pdfGen = new PdfGenerator(); // Instancia de tu clase PdfGenerator

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

  // Definir las columnas a incluir en el PDF (índices de las cabeceras HTML)
  // Se incluyen las columnas originales hasta la 7, más las SAL
  const columnsToInclude = [0, 1, 2, 3, 4, 5, 6, 7];

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
  summaryTableWrapper.className = "mt-5 mb-5"; // Clases para añadir margen

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
    tdSalTotal.textContent = item.salTotal.toLocaleString("de-CH", {
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
  grandTotalValueCell.textContent = grandTotalSal.toLocaleString("de-CH", {
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
