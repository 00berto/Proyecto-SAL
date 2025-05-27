document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    document.getElementById("fileNameTitle").textContent = "";
    document.getElementById("tableContainer").innerHTML = "";
    document.getElementById("printPdfBtn").style.display = "none";
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
    container.innerHTML = "";
    document.getElementById("printPdfBtn").style.display = "block";

    let currentTableData = [];
    let globalHeaders = [];
    let colMap = {};
    let currentSectionTitle = "";
    let globalTotalableColumns = [];

    // Función mejorada para detectar filas de título/sección
    const isSectionRow = (row) => {
      // Caso 1: Las primeras dos celdas tienen contenido y el resto están vacías
      const case1 =
        row[0] &&
        row[1] &&
        row
          .slice(2)
          .every(
            (cell) =>
              cell === undefined ||
              cell === null ||
              cell === "" ||
              String(cell).trim() === ""
          );

      // Caso 2: Fila con estilo de título (podrías añadir más condiciones)
      // Esta parte sería útil si SheetJS permitiera leer estilos directamente

      return case1;
    };

    const createAndAppendTable = (
      titleText,
      dataRows,
      tableHeaders,
      columnMap
    ) => {
      const tableWrapper = document.createElement("div");
      tableWrapper.className = "table-wrapper";

      if (titleText) {
        const title = document.createElement("h4");
        title.textContent = titleText;
        tableWrapper.appendChild(title);
      }

      const table = document.createElement("table");
      table.className = "table table-bordered table-sm mb-4";

      // Cabeceras de tabla
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      tableHeaders.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col;
        headerRow.appendChild(th);
      });

      ["SAL %", "Importo SAL", "A FINIRE %", "Importo A FINIRE"].forEach(
        (name) => {
          const th = document.createElement("th");
          th.textContent = name;
          if (name === "SAL %") th.classList.add("col-sal");
          headerRow.appendChild(th);
        }
      );

      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      container.appendChild(tableWrapper);

      // Selector de columna para totalizar
      if (globalTotalableColumns.length > 0) {
        const selectorDiv = document.createElement("div");
        selectorDiv.className = "mb-2";
        const label = document.createElement("label");
        label.textContent = "Totalizar columna: ";
        label.className = "me-2";

        const select = document.createElement("select");
        select.className = "form-select form-select-sm d-inline-block w-auto";
        globalTotalableColumns.forEach((col, index) => {
          const option = document.createElement("option");
          option.value = index;
          option.textContent = col;
          select.appendChild(option);
        });

        selectorDiv.appendChild(label);
        selectorDiv.appendChild(select);
        tableWrapper.insertBefore(selectorDiv, table);
      }

      // Procesar filas de datos
      dataRows.forEach((row) => {
        const tr = document.createElement("tr");

        // Celdas de datos originales
        tableHeaders.forEach((_, i) => {
          const td = document.createElement("td");
          const value = row[i];
          td.textContent =
            typeof value === "number" ? value.toFixed(2) : value || "";
          if (typeof value === "number") td.classList.add("text-end");
          tr.appendChild(td);
        });

        const importoUnitario = parseFloat(row[colMap.ImportoUnitario]) || 0;

        // Control SAL %
        const salTd = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-control text-end col-sal";
        input.value = "0";
        salTd.appendChild(input);

        // Celdas calculadas
        const salImportoTd = document.createElement("td");
        salImportoTd.className = "text-end";
        salImportoTd.textContent = "0.00";

        const finirePercentTd = document.createElement("td");
        finirePercentTd.className = "text-end";
        finirePercentTd.textContent = "100.00%";

        const finireImportoTd = document.createElement("td");
        finireImportoTd.className = "text-end";
        finireImportoTd.textContent = importoUnitario.toFixed(2);

        // Evento para cálculos
        input.addEventListener("input", () => {
          let val = parseFloat(input.value.replace(",", ".")) || 0;
          val = Math.min(Math.max(val, 0), 100);
          input.value = val;

          const salAmount = (importoUnitario * val) / 100;
          salImportoTd.textContent = salAmount.toFixed(2);
          finirePercentTd.textContent = (100 - val).toFixed(2) + "%";
          finireImportoTd.textContent = (importoUnitario - salAmount).toFixed(
            2
          );
        });

        tr.appendChild(salTd);
        tr.appendChild(salImportoTd);
        tr.appendChild(finirePercentTd);
        tr.appendChild(finireImportoTd);
        tbody.appendChild(tr);
      });

      // Fila de totales
      const totalRow = document.createElement("tr");
      totalRow.className = "total-row table-active";
      for (let i = 0; i < tableHeaders.length + 4; i++) {
        totalRow.appendChild(document.createElement("td"));
      }
      tbody.appendChild(totalRow);
    };

    // Filtrar filas no vacías
    const filteredJson = json.filter((row) =>
      row.some(
        (cell) =>
          cell !== undefined && cell !== null && String(cell).trim() !== ""
      )
    );

    // Procesar filas
    let isFirstTable = true;
    filteredJson.forEach((row, index) => {
      // Primera fila son los headers
      if (index === 0) {
        globalHeaders = row.map((h) => String(h).trim());
        colMap = {
          ImportoUnitario: globalHeaders.indexOf("H"),
          // Añade otros mapeos necesarios
        };

        // Columnas totalizables (excluyendo columnas no numéricas)
        globalTotalableColumns = globalHeaders.filter((h, i) => {
          // Verificar si la columna contiene principalmente números
          const hasNumbers = filteredJson
            .slice(1)
            .some((r) => !isNaN(parseFloat(r[i])));
          return hasNumbers && h && h.trim() !== "";
        });
        return;
      }

      // Detectar filas de sección
      if (isSectionRow(row)) {
        // Si no es la primera tabla y hay datos, crear tabla
        if (!isFirstTable && currentTableData.length > 0) {
          createAndAppendTable(
            currentSectionTitle,
            currentTableData,
            globalHeaders,
            colMap
          );
        }

        currentSectionTitle = `${row[0] || ""} ${row[1] || ""}`.trim();
        currentTableData = [];
        isFirstTable = false;
        return;
      }

      // Añadir fila a los datos actuales
      currentTableData.push(row);
    });

    // Crear última tabla si hay datos
    if (currentTableData.length > 0) {
      createAndAppendTable(
        isFirstTable ? "Datos principales" : currentSectionTitle,
        currentTableData,
        globalHeaders,
        colMap
      );
    }
  };

  reader.readAsArrayBuffer(file);
});

// Listener para el botón de impresión de PDF
document.getElementById("printPdfBtn").addEventListener("click", function () {
  const pdfGen = new PdfGenerator();

  // Obtener las cabeceras de la primera tabla generada en el DOM
  // Esto es necesario para obtener los índices de 'SAL %' e 'Importo SAL'
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

  // Definir las columnas a incluir en el PDF.
  // Columnas 1 a 6 (índices 0 a 5) y luego 'SAL %' e 'Importo SAL'.
  const columnsToInclude = [0, 1, 2, 3, 4, 5]; // Columnas originales (índices en el array de fila)

  const salPercentIndex = firstTableHtmlHeaders.indexOf("SAL %");
  const importoSalIndex = firstTableHtmlHeaders.indexOf("Importo SAL");

  if (salPercentIndex !== -1) columnsToInclude.push(salPercentIndex);
  if (importoSalIndex !== -1) columnsToInclude.push(importoSalIndex);

  pdfGen.generatePdf(
    "tableContainer",
    columnsToInclude,
    "Reporte_Proyecto_SAL.pdf"
  );
});
