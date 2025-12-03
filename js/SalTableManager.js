// js/SalTableManager.js
class SalTableManager {
  constructor(
    salCopiesContainerId,
    summaryTableGenerator,
    checkboxesContainer,
    selectionSectionDiv
  ) {
    this.container = document.getElementById(salCopiesContainerId);
    this.summaryTableGenerator = summaryTableGenerator;
    this.salTableCounter = 0;
    this.generatedSalTables = [];
    this.checkboxesContainer = checkboxesContainer;
    this.selectionSection = selectionSectionDiv;
    this._addInputListeners();
  }

  createSalCopyTable() {
    this.salTableCounter++;
    const newTableTitle = `SAL ${this.salTableCounter}`;
    const salTableId = `sal-copy-table-${this.salTableCounter}`;

    const salTableWrapper = document.createElement("div");
    salTableWrapper.className = "table-wrapper sal-copy-table-wrapper";
    salTableWrapper.id = salTableId;

    const title = document.createElement("h4");
    title.textContent = newTableTitle;
    salTableWrapper.appendChild(title);

    const newSalTable = document.createElement("table");
    newSalTable.className = "table table-bordered table-sm mb-1 sal-copy-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    ["SAL %", "Importo SAL"].forEach((name) => {
      const th = document.createElement("th");
      th.textContent = name;
      th.classList.add("text-center");
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    newSalTable.appendChild(thead);

    const tbody = document.createElement("tbody");
    newSalTable.appendChild(tbody);
    salTableWrapper.appendChild(newSalTable);
    this.container.appendChild(salTableWrapper);

    this.generatedSalTables.push({
      id: salTableId,
      title: newTableTitle,
      element: salTableWrapper,
    });

    this._populateSalTable(tbody);
    this._addSalTableCheckbox(salTableId, newTableTitle);
    this._validateSalRowsBetweenTables();
    this._updateSummaryTable();
    
    // Synchronize row heights with Excel tables
    setTimeout(() => this._synchronizeRowHeights(), 100);
  }

  deleteLastSalTable() {
    if (this.salTableCounter > 0) {
      const lastTableInfo = this.generatedSalTables.pop();
      if (lastTableInfo) {
        const tableElement = lastTableInfo.element;
        const checkboxElement = document.getElementById(
          `checkbox-${lastTableInfo.id}`
        );

        if (tableElement && tableElement.parentNode) {
          tableElement.parentNode.removeChild(tableElement);
        }

        if (checkboxElement && checkboxElement.parentNode) {
          checkboxElement.parentNode.removeChild(checkboxElement);
        }

        this.salTableCounter--;

        if (this.salTableCounter === 0) {
          this.selectionSection.style.display = "none";
        }
      }

      this._validateSalRowsBetweenTables();
      this._updateSummaryTable();
    } else {
      alert("Nussuna tabella SAL da eliminare.");
    }
  }

  _populateSalTable(tbody) {
    tbody.innerHTML = "";

    const originalTableWrappers = document.querySelectorAll(
      "#tableContainer .table-wrapper.original-table-wrapper"
    );
    const totalOriginalTables = originalTableWrappers.length;

    let grandTotalImportoSal = 0;

    originalTableWrappers.forEach((originalTableWrapper, sectionIndex) => {
      const originalTable = originalTableWrapper.querySelector("table");
      const originalTbody = originalTable.querySelector("tbody");
      const originalTitleElement = originalTableWrapper.querySelector("h4");

      const originalHeadersLength =
        originalTable.querySelector("thead tr").children.length - 4;

      let currentSectionSalPercentTotal = 0;
      let currentSectionImportoSalTotal = 0;

      originalTbody
        .querySelectorAll("tr:not(.total-row)")
        .forEach((originalRow) => {
          const originalCells = originalRow.querySelectorAll("td");
          const originalSalInput =
            originalCells[originalHeadersLength]?.querySelector(
              "input.sal-input"
            );
          const salPercentValue = parseFloat(
            originalSalInput ? originalSalInput.value : "0"
          );
          currentSectionSalPercentTotal += salPercentValue;

          const salImportoText =
            originalCells[originalHeadersLength + 1]?.textContent;
          currentSectionImportoSalTotal += this._parseNumber(salImportoText);
        });

      const isSalPercentError =
        currentSectionSalPercentTotal > 100.0001 ||
        currentSectionSalPercentTotal < -0.0001;

      if (
        originalTitleElement &&
        (sectionIndex > 0 || totalOriginalTables > 1)
      ) {
        const emptySectionSpacerRow = document.createElement("tr");
        const emptySectionSpacerCell = document.createElement("td");
        emptySectionSpacerCell.colSpan = 2;
        emptySectionSpacerRow.appendChild(emptySectionSpacerCell);
        tbody.appendChild(emptySectionSpacerRow);

        const sectionHeaderRow = document.createElement("tr");
        sectionHeaderRow.classList.add("table-section-header");
        sectionHeaderRow.id = `sal-section-${sectionIndex}`;
        const sectionHeaderCell = document.createElement("td");
        sectionHeaderCell.colSpan = 2;
        sectionHeaderCell.textContent = originalTitleElement.textContent;
        sectionHeaderCell.classList.add("total-row");
        sectionHeaderCell.style.backgroundColor = "#e9ecef";
        sectionHeaderRow.appendChild(sectionHeaderCell);
        tbody.appendChild(sectionHeaderRow);
      }

      originalTbody
        .querySelectorAll("tr:not(.total-row)")
        .forEach((originalRow) => {
          const newRow = document.createElement("tr");
          const originalCells = originalRow.querySelectorAll("td");

          const originalSalInput =
            originalCells[originalHeadersLength]?.querySelector(
              "input.sal-input"
            );
          const salPercentValue = parseFloat(
            originalSalInput ? originalSalInput.value : "0"
          );

          const salPercentTd = document.createElement("td");
          salPercentTd.textContent = `${salPercentValue.toFixed(2)}%`;
          salPercentTd.classList.add("text-center");

          newRow.appendChild(salPercentTd);

          const salImportoValue =
            originalCells[originalHeadersLength + 1]?.textContent;
          const salImportoTd = document.createElement("td");
          salImportoTd.textContent = salImportoValue || "0,00";
          salImportoTd.classList.add("text-center");
          newRow.appendChild(salImportoTd);

          tbody.appendChild(newRow);
        });

      const totalOriginalRow = originalTbody.querySelector(".total-row");
      if (totalOriginalRow) {
        const newTotalRow = document.createElement("tr");
        newTotalRow.classList.add(
          "table-info",
          "fw-bold",
          "sal-copy-total-row"
        );

        const totalSalPercentTd = document.createElement("td");
        totalSalPercentTd.textContent = "";

        if (isSalPercentError) {
          newTotalRow.classList.add("table-danger");
        } else {
          newTotalRow.classList.remove("table-danger");
        }

        newTotalRow.appendChild(totalSalPercentTd);

        const totalImportoSalTd = document.createElement("td");
        totalImportoSalTd.textContent = this._formatNumber(
          currentSectionImportoSalTotal
        );
        totalImportoSalTd.classList.add("text-center");
        newTotalRow.appendChild(totalImportoSalTd);

        tbody.appendChild(newTotalRow);
      }

      grandTotalImportoSal += currentSectionImportoSalTotal;
    });

    const grandTotalSeparatorRow = document.createElement("tr");
    const grandTotalSeparatorCell = document.createElement("td");
    grandTotalSeparatorCell.colSpan = 2;
    grandTotalSeparatorCell.style.height = "20px";
    grandTotalSeparatorCell.style.borderTop = "2px dashed #007bff";
    grandTotalSeparatorCell.style.backgroundColor = "#f0f8ff";
    grandTotalSeparatorRow.appendChild(grandTotalSeparatorCell);
    tbody.appendChild(grandTotalSeparatorRow);

    const finalGrandTotalRow = document.createElement("tr");
    finalGrandTotalRow.classList.add("table-primary", "fw-bold");

    const grandTotalLabelTd = document.createElement("td");
    grandTotalLabelTd.textContent = "";
    grandTotalLabelTd.colSpan = 1;
    finalGrandTotalRow.appendChild(grandTotalLabelTd);

    const grandTotalValueTd = document.createElement("td");
    grandTotalValueTd.textContent = this._formatNumber(grandTotalImportoSal);
    grandTotalValueTd.classList.add("text-center");
    finalGrandTotalRow.appendChild(grandTotalValueTd);

    tbody.appendChild(finalGrandTotalRow);
  }

  _addInputListeners() {
    const originalSalInputs = document.querySelectorAll(
      "#tableContainer input.sal-input"
    );
    originalSalInputs.forEach((input) => {
      input.addEventListener("input", () => {
        this._updateAllTables();
      });
    });
  }

  _updateAllTables() {
    this.generatedSalTables.forEach((tableInfo) => {
      const tbody = tableInfo.element.querySelector("tbody");
      this._populateSalTable(tbody);
    });
    this._validateSalRowsBetweenTables();
    this._updateSummaryTable();
    
    // Synchronize row heights after all tables are updated
    this._synchronizeRowHeights();
  }

  _synchronizeRowHeights() {
    // Get all original table wrappers
    const originalTableWrappers = document.querySelectorAll(
      "#tableContainer .table-wrapper.original-table-wrapper"
    );

    if (originalTableWrappers.length === 0) return;

    // Calculate total header height from first Excel table
    const firstExcelWrapper = originalTableWrappers[0];
    const firstExcelTitle = firstExcelWrapper.querySelector("h4");
    const firstExcelThead = firstExcelWrapper.querySelector("table thead");
    
    const excelTitleHeight = firstExcelTitle ? firstExcelTitle.offsetHeight : 0;
    const excelTheadHeight = firstExcelThead ? firstExcelThead.offsetHeight : 0;
    const totalExcelHeaderHeight = excelTitleHeight + excelTheadHeight;

    // For each SAL table
    this.generatedSalTables.forEach((salTableInfo) => {
      const salWrapper = salTableInfo.element;
      const salTitle = salWrapper.querySelector("h4");
      const salTable = salWrapper.querySelector("table");
      const salThead = salTable.querySelector("thead");
      const salRows = Array.from(salTable.querySelectorAll("tbody tr"));
      
      // Synchronize header heights
      if (salTitle && salThead) {
        const salTitleHeight = salTitle.offsetHeight;
        const salTheadHeight = salThead.offsetHeight;
        const totalSalHeaderHeight = salTitleHeight + salTheadHeight;
        
        // Calculate the difference and adjust
        const heightDifference = totalExcelHeaderHeight - totalSalHeaderHeight;
        
        if (heightDifference > 0) {
          // Add padding to SAL title to match Excel header height
          const currentPadding = parseFloat(window.getComputedStyle(salTitle).paddingBottom) || 0;
          salTitle.style.paddingBottom = `${currentPadding + heightDifference}px`;
        } else if (heightDifference < 0) {
          // Excel header is smaller, add padding to Excel title
          // (This case is less common but handled for completeness)
          const excelTitles = Array.from(document.querySelectorAll("#tableContainer .table-wrapper.original-table-wrapper h4"));
          excelTitles.forEach(title => {
            const currentPadding = parseFloat(window.getComputedStyle(title).paddingBottom) || 0;
            title.style.paddingBottom = `${currentPadding + Math.abs(heightDifference)}px`;
          });
        }
      }
      
      let salRowIndex = 0;

      // Iterate through each original table
      originalTableWrappers.forEach((originalWrapper) => {
        const originalTable = originalWrapper.querySelector("table");
        const originalRows = Array.from(
          originalTable.querySelectorAll("tbody tr:not(.total-row)")
        );

        // Sync each data row
        originalRows.forEach((originalRow) => {
          if (salRowIndex < salRows.length) {
            const salRow = salRows[salRowIndex];
            
            // Skip section headers and total rows in SAL table
            if (
              !salRow.classList.contains("table-section-header") &&
              !salRow.classList.contains("sal-copy-total-row") &&
              salRow.children.length > 0
            ) {
              // Get the height of the original row
              const originalHeight = originalRow.offsetHeight;
              
              // Set the same height to the SAL row
              salRow.style.height = `${originalHeight}px`;
            }
            
            salRowIndex++;
          }
        });

        // Skip section header and total row in SAL table
        salRowIndex += 2; // +1 for section header, +1 for total row
      });
    });
  }

  _validateSalRowsBetweenTables() {
    const tables = this.generatedSalTables;

    if (tables.length < 2) {
      if (tables.length === 1) {
        const currentTableBody = tables[0].element.querySelector("table tbody");
        if (currentTableBody) {
          const dataCells = Array.from(currentTableBody.querySelectorAll("tr"))
            .filter(
              (tr) =>
                !tr.classList.contains("total-row") &&
                !tr.classList.contains("table-section-header") &&
                tr.children.length > 0
            )
            .map((tr) => tr.children[0]);
          dataCells.forEach((cell) => {
            cell.classList.remove("table-warning", "table-danger");
            cell.removeAttribute("title");
            cell.style.cursor = "default";
          });
        }
      }
      return;
    }

    const prevTableInfo = tables[tables.length - 2];
    const currTableInfo = tables[tables.length - 1];

    const prevTable = prevTableInfo.element.querySelector("table");
    const currTable = currTableInfo.element.querySelector("table");

    if (!prevTable || !currTable) return;

    const prevDataRows = Array.from(
      prevTable.querySelectorAll("tbody tr")
    ).filter(
      (tr) =>
        !tr.classList.contains("total-row") &&
        !tr.classList.contains("table-section-header") &&
        tr.children.length >= 2
    );

    const currDataRows = Array.from(
      currTable.querySelectorAll("tbody tr")
    ).filter(
      (tr) =>
        !tr.classList.contains("total-row") &&
        !tr.classList.contains("table-section-header") &&
        tr.children.length >= 2
    );

    const rowCount = Math.min(prevDataRows.length, currDataRows.length);

    currDataRows.forEach((row) => {
      if (row.children.length > 0) {
        const salPercentCell = row.children[0];
        salPercentCell.classList.remove("table-warning", "table-danger");
        salPercentCell.removeAttribute("title");
        salPercentCell.style.cursor = "default";
      }
    });

    for (let i = 0; i < rowCount; i++) {
      const prevCell = prevDataRows[i].children[0];
      const currCell = currDataRows[i].children[0];

      if (!prevCell || !currCell) continue;

      const prevVal = this._parseNumber(prevCell.textContent.replace("%", ""));
      const currVal = this._parseNumber(currCell.textContent.replace("%", ""));

      if (currVal > 100.001) {
        currCell.classList.add("table-danger");
        currCell.title = "Valore SAL% superiore a 100%";
        currCell.style.cursor = "help";
      } else if (currVal < prevVal - 0.001) {
        currCell.classList.add("table-warning");
        currCell.title = "Controllare Valore % inserito";
        currCell.style.cursor = "help";
      } else {
        currCell.classList.remove("table-warning", "table-danger");
        currCell.removeAttribute("title");
        currCell.style.cursor = "default";
      }
    }
  }

  _addSalTableCheckbox(id, title) {
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "form-check form-check-inline";

    const checkboxInput = document.createElement("input");
    checkboxInput.type = "checkbox";
    checkboxInput.className = "form-check-input";
    checkboxInput.id = `checkbox-${id}`;
    checkboxInput.value = id;
    checkboxInput.checked = true;

    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "form-check-label";
    checkboxLabel.htmlFor = `checkbox-${id}`;
    checkboxLabel.textContent = title;

    checkboxDiv.appendChild(checkboxInput);
    checkboxDiv.appendChild(checkboxLabel);
    this.checkboxesContainer.appendChild(checkboxDiv);

    this.selectionSection.style.display = "block";
  }

  reset() {
    this.salTableCounter = 0;
    this.generatedSalTables = [];
    if (this.checkboxesContainer) {
      this.checkboxesContainer.innerHTML = "";
    }
    if (this.selectionSection) {
      this.selectionSection.style.display = "none";
    }

    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  getSelectedSalTableIds() {
    if (!this.checkboxesContainer) {
      console.warn("Contenedor de checkboxes SAL no encontrado.");
      return [];
    }
    return Array.from(
      this.checkboxesContainer.querySelectorAll(
        "input[type='checkbox']:checked"
      )
    ).map((checkbox) => checkbox.value);
  }

  _updateSummaryTable() {
    const lastSalTableInfo =
      this.generatedSalTables[this.generatedSalTables.length - 1];

    if (!lastSalTableInfo) {
      this.summaryTableGenerator.reset();
      return;
    }

    const lastSalTableElement = lastSalTableInfo.element.querySelector("table");
    const sections = [];
    let currentSectionTitle = "N/A";
    let currentSectionId = "";

    const allRows = lastSalTableElement.querySelectorAll("tbody tr");
    allRows.forEach((row) => {
      if (row.classList.contains("table-section-header")) {
        currentSectionTitle = row.textContent;
        currentSectionId = row.id;
      } else if (row.classList.contains("sal-copy-total-row")) {
        const totalCell = row.children[1];
        const salTotal = this._parseNumber(totalCell.textContent);

        if (salTotal > 0) {
          sections.push({
            title: currentSectionTitle,
            salTotal: salTotal,
            sectionId: currentSectionId,
          });
        }
      }
    });

    //--------
    console.log(sections)
    this.summaryTableGenerator.generate(sections);
  }

  getExportableSalData() {
    const lastSalTableInfo =
      this.generatedSalTables[this.generatedSalTables.length - 1];

    if (!lastSalTableInfo) {
      return null;
    }

    const lastSalTableElement = lastSalTableInfo.element.querySelector("table");
    const lastRow = lastSalTableElement.querySelector("tbody tr:last-child");
    const totalGlobalCell = lastRow
      ? lastRow.querySelector("td:last-child")
      : null;

    const salTitle = lastSalTableInfo.title;
    const salNumberMatch = salTitle.match(/\d+/);
    const numeroSAL = salNumberMatch ? parseInt(salNumberMatch[0], 10) : 0;

    const totalGlobalSAL = totalGlobalCell
      ? this._parseNumber(totalGlobalCell.textContent)
      : 0;

    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const fechaModificacion = `${day}.${month}.${year}`;

    return {
      numeroSAL: numeroSAL,
      totalGlobalSAL: totalGlobalSAL,
      fechaModificacion: fechaModificacion,
    };
  }

  _parseNumber(str) {
    if (!str) return 0;
    str = str.trim();
    if (str.includes("€")) {
      str = str.replace("€", "");
    }
    if (str.includes(",")) {
      return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(str) || 0;
  }
  getAllExportableSalData() {
    return this.generatedSalTables
      .map((tableInfo, index) => {
        const table = tableInfo.element.querySelector("table");
        if (!table) return null;

        const totalRow = table.querySelector("tbody tr:last-child");
        const totalCell = totalRow
          ? totalRow.querySelector("td:last-child")
          : null;
        const totalGlobalSAL = totalCell
          ? this._parseNumber(totalCell.textContent)
          : 0;

        const salNumberMatch = tableInfo.title.match(/\d+/);
        const numeroSAL = salNumberMatch
          ? parseInt(salNumberMatch[0], 10)
          : index + 1;

        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        const fechaModificacion = `${day}.${month}.${year}`;

        return {
          numeroSAL,
          totalGlobalSAL,
          fechaModificacion,
        };
      })
      .filter((item) => item !== null);
  }

  _formatNumber(num) {
    return num.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

// === NUEVO CÓDIGO PARA CERTIFICATI ===

// Histórico de SAL
let certificatiPrecedenti = [];

// Guardar en historial cada vez que se genera un nuevo SAL
function saveSalToHistory(salManager) {
  const data = salManager.getExportableSalData();
  if (data) {
    certificatiPrecedenti.push(data);
    updatePrecedentiTable();
  }
}

// // Actualizar tabla de precedenti
// function updatePrecedentiTable() {
//   const tbody = document.querySelector("#precedenti-table tbody");
//   if (!tbody) return;

//   tbody.innerHTML = "";

//   certificatiPrecedenti.forEach((item, index) => {
//     const row = document.createElement("tr");

//     // n.
//     const cellN = document.createElement("td");
//     cellN.textContent = index + 1;
//     cellN.classList.add("text-center");
//     row.appendChild(cellN);

//     // data
//     const cellData = document.createElement("td");
//     cellData.textContent = item.fechaModificacion;
//     cellData.classList.add("text-center");
//     row.appendChild(cellData);

//     // importo
//     const cellImporto = document.createElement("td");
//     cellImporto.textContent = item.totalGlobalSAL.toLocaleString("it-IT", {
//       style: "currency",
//       currency: "EUR",
//     });
//     cellImporto.classList.add("text-end");
//     row.appendChild(cellImporto);

//     tbody.appendChild(row);
//   });
// }

// Actualizar el certificado actual
function updateCertificatoHeader(salManager) {
  const data = salManager.getExportableSalData();
  if (data) {
    document.getElementById("numero-sal").textContent = data.numeroSAL;
    document.getElementById("data-sal").textContent = data.fechaModificacion;
    document.getElementById("importo-sal").textContent =
      data.totalGlobalSAL.toLocaleString("it-IT", {
        style: "currency",
        currency: "EUR",
      });
  }
}
