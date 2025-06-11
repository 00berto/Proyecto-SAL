// js/SummaryTableGenerator.js
class SummaryTableGenerator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  /**
   * Genera y añade la tabla de resumen de totales SAL de todas las secciones.
   * @param {Array<{title: string, salTotal: number}>} allTablesSalTotals - Array de objetos con el título y el total SAL de cada tabla.
   */
  generate(allTablesSalTotals) {
    // Eliminar la tabla de resumen anterior si existe para evitar duplicados
    const existingSummaryTable = document.getElementById("summaryTableWrapper");
    if (existingSummaryTable) {
      existingSummaryTable.remove();
    }

    if (allTablesSalTotals.length === 0) {
      return;
    }

    const summaryTableWrapper = document.createElement("div");
    summaryTableWrapper.id = "summaryTableWrapper";
    summaryTableWrapper.className = "mt-5 mb-5";

    const summaryTitle = document.createElement("h3");
    summaryTitle.textContent = "Resumen de Importes SAL por Sección";
    summaryTableWrapper.appendChild(summaryTitle);

    const summaryTable = document.createElement("table");
    summaryTable.className = "table table-bordered table-sm summary-table";
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const headerRow = document.createElement("tr");
    const thTitle = document.createElement("th");
    thTitle.textContent = "Sección del Proyecto";
    const thSalTotal = document.createElement("th");
    thSalTotal.textContent = "Importo SAL Total";
    thSalTotal.className = "text-end";
    headerRow.appendChild(thTitle);
    headerRow.appendChild(thSalTotal);
    thead.appendChild(headerRow);
    summaryTable.appendChild(thead);

    let grandTotalSal = 0;

    allTablesSalTotals.forEach((item) => {
      const row = document.createElement("tr");
      const tdTitle = document.createElement("td");
      tdTitle.textContent = item.title;
      const tdSalTotal = document.createElement("td");
      tdSalTotal.textContent = item.salTotal.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      tdSalTotal.className = "text-end";
      row.appendChild(tdTitle);
      row.appendChild(tdSalTotal);
      tbody.appendChild(row);
      grandTotalSal += item.salTotal;
    });

    const grandTotalRow = document.createElement("tr");
    grandTotalRow.classList.add("table-primary", "fw-bold");
    const grandTotalLabelCell = document.createElement("td");
    grandTotalLabelCell.textContent = "TOTAL GLOBAL SAL:";
    grandTotalLabelCell.colSpan = 1;
    const grandTotalValueCell = document.createElement("td");
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
    this.container.appendChild(summaryTableWrapper);
  }

  /**
   * Limpia la tabla de resumen.
   */
  reset() {
    const existingSummaryTable = document.getElementById("summaryTableWrapper");
    if (existingSummaryTable) {
      existingSummaryTable.remove();
    }
  }
}
