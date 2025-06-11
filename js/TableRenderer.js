// js/TableRenderer.js
class TableRenderer {
  constructor(containerId, summaryTableGenerator, baseCalcColIndex) {
    this.container = document.getElementById(containerId);
    this.summaryTableGenerator = summaryTableGenerator;
    this.baseCalcColIndex = baseCalcColIndex;
    // Índices de columnas que siempre se totalizarán (basado en el original)
    this.autoTotalColumnIndexes = [4, 5, 6, 7];
    this.allTablesSalTotals = []; // Se mantiene aquí para cada instancia o si es un singleton, en la clase App
  }

  /**
   * Renderiza todas las tablas detalladas a partir de los datos del Excel.
   * @param {Array<Array<any>>} jsonDataRows - Las filas de datos del Excel.
   * @param {Array<string>} headers - Las cabeceras globales del Excel.
   */
  renderTables(jsonDataRows, headers) {
    this.container.innerHTML = ""; // Limpiar tablas existentes
    this.allTablesSalTotals = []; // Resetear los totales

    let currentTableData = [];
    let currentSectionTitle = "";

    const isCellEmpty = (cell) =>
      cell === undefined || cell === null || String(cell).trim() === "";

    jsonDataRows.forEach((row) => {
      const isNewSectionHeader = !isCellEmpty(row[0]) && !isCellEmpty(row[1]);
      const isCompletelyEmptyRow = row.every((cell) => isCellEmpty(cell));

      if (
        (isNewSectionHeader || isCompletelyEmptyRow) &&
        currentTableData.length > 0
      ) {
        this._createAndAppendTable(
          currentSectionTitle,
          currentTableData,
          headers
        );
        currentTableData = [];
      }

      if (isNewSectionHeader) {
        currentSectionTitle = `${row[0] || ""} ${row[1] || ""}`.trim();
      } else if (isCompletelyEmptyRow) {
        currentSectionTitle = "";
      } else {
        currentTableData.push(row);
        // Si es la primera tabla y no hay título de sección inicial, se mantiene vacío
        if (currentTableData.length === 1 && currentSectionTitle === "") {
          currentSectionTitle = ""; // Asegura que no tome el título de la siguiente sección si la primera no lo tiene
        }
      }
    });

    // Renderizar la última tabla si hay datos pendientes
    if (currentTableData.length > 0) {
      this._createAndAppendTable(
        currentSectionTitle,
        currentTableData,
        headers
      );
    }
    this.summaryTableGenerator.generate(this.allTablesSalTotals);
  }

  /**
   * Crea y añade una tabla HTML detallada al contenedor.
   * @param {string} titleText - Título de la tabla.
   * @param {Array<Array<any>>} dataRows - Filas de datos para la tabla.
   * @param {Array<string>} tableHeaders - Cabeceras de la tabla (originales + SAL).
   * @private
   */
  _createAndAppendTable(titleText, dataRows, tableHeaders) {
    if (dataRows.length === 0) {
      return;
    }

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "table-wrapper original-table-wrapper";
    // Generar un ID único para cada tabla original para su referencia en el PDF
    tableWrapper.id = `original-table-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    if (titleText) {
      const title = document.createElement("h4");
      title.textContent = titleText;
      tableWrapper.appendChild(title);
    }

    const table = document.createElement("table");
    table.className = "table table-bordered table-sm mb-1";
    table.setAttribute("data-section-title", titleText);

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
    this.container.appendChild(tableWrapper);

    // Función para actualizar los totales de la fila de totales de esta tabla
    const updateTableTotals = () => {
      let tempTotals = {};
      let totalSalPercent = 0;

      this.autoTotalColumnIndexes.forEach((idx) => {
        tempTotals[tableHeaders[idx]] = 0;
      });
      tempTotals["Importo SAL"] = 0;
      tempTotals["Importo A FINIRE"] = 0;

      tbody.querySelectorAll("tr:not(.total-row)").forEach((rowElement) => {
        const cells = rowElement.querySelectorAll("td");

        this.autoTotalColumnIndexes.forEach((idx) => {
          if (cells[idx]) {
            tempTotals[tableHeaders[idx]] +=
              ExcelProcessor.parseFormattedNumber(cells[idx]?.textContent);
          }
        });

        tempTotals["Importo SAL"] += ExcelProcessor.parseFormattedNumber(
          cells[tableHeaders.length + 1]?.textContent
        );
        tempTotals["Importo A FINIRE"] += ExcelProcessor.parseFormattedNumber(
          cells[tableHeaders.length + 3]?.textContent
        );

        const salInput = cells[tableHeaders.length].querySelector("input");
        if (salInput) {
          totalSalPercent += parseFloat(salInput.value) || 0;
        }
      });

      const totalRowElement = tbody.querySelector(".total-row");
      if (totalRowElement) {
        const totalCells = totalRowElement.querySelectorAll("td");

        totalCells.forEach((cell) => (cell.textContent = ""));
        if (totalCells.length > 0) {
          totalCells[0].textContent = "Total:";
        }

        this.autoTotalColumnIndexes.forEach((idx) => {
          if (totalCells[idx]) {
            totalCells[idx].textContent =
              tempTotals[tableHeaders[idx]]?.toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0,00";
          }
        });

        if (totalCells[tableHeaders.length]) {
          totalCells[
            tableHeaders.length
          ].textContent = `${totalSalPercent.toFixed(2)}%`;
          if (totalSalPercent > 100) {
            totalCells[tableHeaders.length].classList.add("table-danger");
          } else {
            totalCells[tableHeaders.length].classList.remove("table-danger");
          }
        }

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
        const existingEntryIndex = this.allTablesSalTotals.findIndex(
          (entry) => entry.title === titleText
        );
        if (existingEntryIndex !== -1) {
          this.allTablesSalTotals[existingEntryIndex].salTotal =
            tempTotals["Importo SAL"];
        } else {
          this.allTablesSalTotals.push({
            title: titleText || "Sin Título de Sección",
            salTotal: tempTotals["Importo SAL"],
          });
        }
        this.summaryTableGenerator.generate(this.allTablesSalTotals); // Regenerar tabla resumen
      }
    };

    dataRows.forEach((row) => {
      const tr = document.createElement("tr");

      tableHeaders.forEach((_, i) => {
        const td = document.createElement("td");
        const value = row[i];
        td.textContent =
          typeof value === "number" && !isNaN(value)
            ? value.toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : value || "";
        tr.appendChild(td);
      });

      const baseCalcValue =
        this.baseCalcColIndex !== -1 &&
        !isNaN(parseFloat(row[this.baseCalcColIndex]))
          ? parseFloat(row[this.baseCalcColIndex])
          : 0;

      const salTd = document.createElement("td");
      const input = document.createElement("input");
      input.type = "text";
      input.className = "form-control text-end col-sal sal-input";
      input.value = "0";
      input.setAttribute("data-base-value", baseCalcValue);
      salTd.appendChild(input);

      const salImportoTd = document.createElement("td");
      salImportoTd.className = "text-end sal-importo";
      salImportoTd.textContent = "0,00";

      const finirePercentTd = document.createElement("td");
      finirePercentTd.className = "text-end";
      finirePercentTd.textContent = "100,00%";

      const finireImportoTd = document.createElement("td");
      finireImportoTd.className = "text-end";
      finireImportoTd.textContent = baseCalcValue.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      input.addEventListener("input", () => {
        let val = parseFloat(input.value.replace(",", "."));
        val = isNaN(val) ? 0 : val;

        input.value = val;

        if (val > 100 || val < 0) {
          input.classList.add("is-invalid");
          salTd.classList.add("table-danger");
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
  }
}
