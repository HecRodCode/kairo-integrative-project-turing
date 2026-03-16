const PYTHON_API_URL = 'https://kairo-integrative-project-turing-production-b3f6.up.railway.app';

// ════════════════════════════════════════
// REPORTE INDIVIDUAL - CODER
// ════════════════════════════════════════
async function generateReportCoder(coderId) {
    const btn = event.target;
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Generando informe...';

    try {
        // 1. Generar análisis IA
        btn.textContent = 'Analizando datos con IA...';
        const reportResponse = await fetch(`${PYTHON_API_URL}/generate-report-coder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coder_id: parseInt(coderId) })
        });
        if (!reportResponse.ok) throw new Error(`Error generando reporte: ${reportResponse.status}`);

        // 2. Descargar PDF
        btn.textContent = 'Generando PDF...';
        const pdfResponse = await fetch(`${PYTHON_API_URL}/generate-pdf-coder/${coderId}`);
        if (!pdfResponse.ok) throw new Error(`Error generando PDF: ${pdfResponse.status}`);

        const blob = await pdfResponse.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `informe_coder_${coderId}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// ════════════════════════════════════════
// REPORTE GRUPAL - CLAN
// ════════════════════════════════════════
async function generateReportClan(clan) {
    const btn = event.target;
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Generando informe clan...';

    try {
        clan = clan.toLowerCase();

        // 1. Generar análisis IA del clan
        btn.textContent = 'Analizando datos con IA...';
        const reportResponse = await fetch(`${PYTHON_API_URL}/generate-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clan: clan,
                total_coders: 0,
                average_score: 0.0,
                high_risk_count: 0,
                top_struggling_topics: [],
                soft_skills_summary: {}
            })
        });
        if (!reportResponse.ok) throw new Error(`Error generando reporte: ${reportResponse.status}`);

        // 2. Descargar PDF
        btn.textContent = 'Generando PDF...';
        const pdfResponse = await fetch(`${PYTHON_API_URL}/generate-pdf/${clan}`);
        if (!pdfResponse.ok) throw new Error(`Error generando PDF: ${pdfResponse.status}`);

        const blob = await pdfResponse.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Informe_Clan_${clan}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}