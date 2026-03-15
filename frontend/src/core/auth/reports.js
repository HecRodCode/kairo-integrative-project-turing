import { API_BASE } from '../config.js';

async function generateReport(coderId) {
    const btn = event.target;
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = 'Generando...';

    try {
        coderId = parseInt(coderId);
        
        // ✅ QUERY PARAM (tu endpoint actual)
        const response = await fetch(`${API_BASE}/reports/generar-informe-pdf?coder_id=${coderId}`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error(`Error ${response.status}`);
        
        const pdfBlob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = `Informe_${coderId}.pdf`;
        link.click();
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

async function generateReportClan(clan) {
    const btn = event.target;
    const originalText = btn.textContent;
    
    btn.disabled = true;
    btn.textContent = 'Generando informe clan...';

    try {
        clan = (clan).toLowerCase();
        
        const response = await fetch(`${API_BASE}/reports/generar-informe-clan-pdf?clan_name=${clan}`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error(`Error ${response.status}`);
        
        const pdfBlob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = `Informe_Clan_${clan}.pdf`;
        link.click();
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}
