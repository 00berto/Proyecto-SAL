// js/SummaryTableGenerator.js
class SummaryTableGenerator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  generate(allTablesSalTotals) {
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
    summaryTitle.textContent = "Riassunto dei totali SAL por sezione";
    summaryTitle.className = "mx-5";
    summaryTableWrapper.appendChild(summaryTitle);

    const summaryTable = document.createElement("table");
    summaryTable.className = "table table-bordered table-sm summary-table";
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const headerRow = document.createElement("tr");
    const thTitle = document.createElement("th");
    thTitle.textContent = "Sezione del Progetto";
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

      const titleContainer = document.createElement("div");
      titleContainer.style.display = "flex";
      titleContainer.style.alignItems = "center";
      titleContainer.style.justifyContent = "space-between";

      const titleSpan = document.createElement("span");
      titleSpan.textContent = item.title;
      titleContainer.appendChild(titleSpan);

      const jumpButton = document.createElement("button");
      jumpButton.textContent = "↗️";
      jumpButton.title = "Vai alla sezione";
      jumpButton.classList.add("btn", "btn-sm", "btn-outline-secondary", "ms-2");
      jumpButton.onclick = () => {
        const targetElement = document.getElementById(item.sectionId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      titleContainer.appendChild(jumpButton);
      tdTitle.appendChild(titleContainer);

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

  reset() {
    const existingSummaryTable = document.getElementById("summaryTableWrapper");
    if (existingSummaryTable) {
      existingSummaryTable.remove();
    }
  }
}