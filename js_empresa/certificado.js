// NOTA: Asegúrate de que esta clave coincide con la que usas en la primera página
const DATOS_CERTIFICADO_KEY = "certificatoDati";
const HISTORIAL_SAL_KEY = "historialSAL";

// Array que contendrá el historial de SAL.
// Al cargar la página, se inicializa con los datos guardados en localStorage.
let certificatiPrecedenti = JSON.parse(localStorage.getItem(HISTORIAL_SAL_KEY)) || [];

// Función para guardar un nuevo SAL en el historial
function saveSalToHistory(salData) {
  if (salData) {
    certificatiPrecedenti.push(salData);
    // Guardar el historial actualizado en localStorage
    localStorage.setItem(HISTORIAL_SAL_KEY, JSON.stringify(certificatiPrecedenti));
    updatePrecedentiTable();
    updateCertificatoHeader(salData);
  }
}

// Función para actualizar la tabla con los SAL anteriores
function updatePrecedentiTable() {
  const tbody = document.querySelector("#precedenti-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  certificatiPrecedenti.forEach((item, index) => {
    const row = document.createElement("tr");
    const totalFormatted = parseFloat(item.totalGlobalSAL).toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR"
    });
    row.innerHTML = `
      <td class="text-center">${index + 1}</td>
      <td class="text-center">${item.fechaModificacion}</td>
      <td class="text-end">${totalFormatted}</td>
    `;
    tbody.appendChild(row);
  });
}

// Función para actualizar el encabezado con el último SAL
function updateCertificatoHeader(salData) {
  if (salData) {
    document.getElementById("numero-sal").textContent = salData.numeroSAL;
    document.getElementById("data-sal").textContent = salData.fechaModificacion;
    const importoFormatted = parseFloat(salData.totalGlobalSAL).toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR"
    });
    document.getElementById("importo-sal").textContent = importoFormatted;
  }
}

// Lógica para cargar y mostrar los datos al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  // 1. Cargar los datos principales del formulario
  const dati = JSON.parse(localStorage.getItem(DATOS_CERTIFICADO_KEY)) || {};
  document.getElementById("committenteRagione").textContent = dati.committenteRagione || "";
  document.getElementById("committenteIndirizzo").textContent = dati.committenteIndirizzo || "";
  document.getElementById("committenteReferente").textContent = dati.committenteReferente || "";
  document.getElementById("committenteRL").textContent = dati.committenteRL || "";
  document.getElementById("committenteDL").textContent = dati.committenteDL || "";
  document.getElementById("committentePM").textContent = dati.committentePM || "";
  document.getElementById("impresaRagione").textContent = dati.impresaRagione || "";
  document.getElementById("impresaIndirizzo").textContent = dati.impresaIndirizzo || "";
  document.getElementById("impresaDL").textContent = dati.impresaDL || "";
  document.getElementById("progettoDescrizione").textContent = dati.progettoDescrizione || "";
  document.getElementById("progettoIndirizzo").textContent = dati.progettoIndirizzo || "";
  document.getElementById("dataInizio").textContent = dati.dataInizio || "";
  document.getElementById("dataFine").textContent = dati.dataFine || "";

  // 2. Cargar los datos de la tabla SAL y calcular el total
  const salData = JSON.parse(localStorage.getItem("salData")) || [];
  let total = 0;
  const tbody = document.getElementById("salTableBody");
  tbody.innerHTML = "";
  salData.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.voce}</td>
      <td>${row.quantita}</td>
      <td>${row.prezzo}</td>
      <td>${row.totale}</td>
    `;
    tbody.appendChild(tr);
    total += parseFloat(row.totale || 0);
  });
  document.getElementById("salTotal").textContent = total.toFixed(2);
  
  // 3. Generar y guardar el SAL actual en el historial
  const nuevoSal = {
    numeroSAL: certificatiPrecedenti.length + 1,
    fechaModificacion: new Date().toLocaleDateString("it-IT"),
    totalGlobalSAL: total
  };
  saveSalToHistory(nuevoSal);

  // 4. Actualizar la tabla de historial y el encabezado del SAL
  updatePrecedentiTable();
  updateCertificatoHeader(certificatiPrecedenti[certificatiPrecedenti.length - 1]);
  
  // 5. Configurar el botón de descarga de PDF
  document.getElementById("download").addEventListener("click", () => {
    const element = document.getElementById("certificato");
    html2pdf().set({
      margin: 0.5,
      filename: "certificato_pagamento.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "cm", format: "a4", orientation: "portrait" },
    }).from(element).save();
  });
});