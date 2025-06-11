// main.js
// Importar bibliotecas externas si las usas (ej: XLSX)
// <script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
// O si usas jspdf:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://unpkg.com/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.js"></script>

// Importar tus clases
// (En un entorno de módulo real, usarías 'import { App } from "./App.js";'
// Pero para un script simple en el HTML, asumimos que están disponibles globalmente
// si los cargas con <script src="..."> en el orden correcto)

// Asegúrate de cargar estos scripts en tu index.html en el orden correcto:
// <script src="js/ExcelProcessor.js"></script>
// <script src="js/SummaryTableGenerator.js"></script>
// <script src="js/TableRenderer.js"></script>
// <script src="js/SalTableManager.js"></script>
// <script src="js/PdfGenerator.js"></script>
// <script src="js/App.js"></script>
// <script src="js/main.js"></script>

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar la aplicación cuando el DOM esté completamente cargado
  const app = new App();
});
