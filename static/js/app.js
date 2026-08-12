function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');

    document.getElementById('resultadoNotas').innerHTML = '';
    document.getElementById('resultadoFreq').innerHTML = '';
}

function toggleInput(field) {
    const input = document.getElementById(field);
    const checkbox = document.getElementById(`check-${field}`);

    if (checkbox.checked) {
        input.disabled = true;
        input.value = '';
    } else {
        input.disabled = false;
    }
}

document.getElementById('formFrequencia').addEventListener('submit', (e) => {
    e.preventDefault();

    const loading = document.getElementById('loadingFreq');
    const resultado = document.getElementById('resultadoFreq');

    loading.classList.add('active');
    resultado.innerHTML = '';
    resultado.classList.remove('active');

    const faltas = parseFloat(document.getElementById('faltas').value);
    const carga = parseFloat(document.getElementById('carga_horaria').value);

    setTimeout(() => {
        const frequencia = ((carga - faltas) / carga) * 100;
        const aprovado = frequencia >= 75;

        loading.classList.remove('active');

        const cssClass = aprovado ? 'result-success' : 'result-danger';
        const badge = aprovado ?
            '<span class="badge badge-success">Aprovado</span>' :
            '<span class="badge badge-danger">Reprovado</span>';

        const html = `
            <div class="result-title">${aprovado ? 'Frequência Aprovada' : 'Reprovado por Faltas'}</div>
            <div class="result-item">
                <span class="result-label">Frequência</span>
                <span class="result-value">${frequencia.toFixed(2)}%</span>
            </div>
            <div class="result-item">
                <span class="result-label">Faltas</span>
                <span class="result-value">${faltas} de ${carga}h</span>
            </div>
            <div class="result-item">
                <span class="result-label">Status</span>
                ${badge}
            </div>
        `;

        resultado.innerHTML = html;
        resultado.className = `result ${cssClass} active`;
    }, 400);
});

document.getElementById('formNotas').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loading = document.getElementById('loadingNotas');
    const resultado = document.getElementById('resultadoNotas');

    const np1Val = document.getElementById('check-np1').checked ? '' : document.getElementById('np1').value;
    const np2Val = document.getElementById('check-np2').checked ? '' : document.getElementById('np2').value;
    const pimVal = document.getElementById('check-pim').checked ? '' : document.getElementById('pim').value;

    if (!np1Val && !np2Val && !pimVal) {
        resultado.innerHTML = `
            <div class="result result-danger active">
                <div class="result-title">Erro</div>
                <p style="color: var(--text-secondary); margin-top: 8px; font-size: 13px;">Preencha pelo menos uma nota para calcular!</p>
            </div>
        `;
        resultado.classList.add('active');
        return;
    }

    loading.classList.add('active');
    resultado.innerHTML = '';
    resultado.classList.remove('active');

    const formData = {
        num_faltas: 0,
        np1: np1Val,
        np2: np2Val,
        pim: pimVal
    };

    try {
        const response = await fetch('/calcular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        loading.classList.remove('active');

        if (data.erro) {
            mostrarErro(resultado, data.erro);
            return;
        }

        mostrarResultado(resultado, data);
    } catch (error) {
        loading.classList.remove('active');
        mostrarErro(resultado, 'Erro ao processar o cálculo.');
    }
});

function mostrarResultado(elemento, data) {
    let html = '';
    let cssClass = '';

    if (data.status === 'aprovado') {
        cssClass = 'result-success';
        html = `
            <div class="result-title">Aprovado Direto</div>
            <div class="result-item">
                <span class="result-label">Média Semestral</span>
                <span class="result-value">${data.ms}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Status</span>
                <span class="badge badge-success">Aprovado</span>
            </div>
        `;
    } else if (data.status === 'exame') {
        cssClass = 'result-warning';
        html = `
            <div class="result-title">Em Exame</div>
            <div class="result-item">
                <span class="result-label">Média Semestral</span>
                <span class="result-value">${data.ms}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Nota Necessária no Exame</span>
                <span class="result-value">${data.nota_exame}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Status</span>
                <span class="badge badge-warning">Exame</span>
            </div>
        `;
    } else if (data.status === 'calculo_necessario') {
        if (data.aviso === 'ja_aprovado') {
            cssClass = 'result-success';
            html = `<div class="result-title">${data.mensagem}</div>`;
        } else if (data.aviso === 'maior_que_10') {
            cssClass = 'result-warning';

            const np1 = parseFloat(document.getElementById('np1').value) || 10;
            const np2 = parseFloat(document.getElementById('np2').value) || 10;
            const pim = parseFloat(document.getElementById('pim').value) || 10;

            const ms_com_10 = ((4 * np1 + 4 * np2 + 2 * pim) / 10).toFixed(1);

            const nota_exame = (10 - parseFloat(ms_com_10)).toFixed(1);

            html = `
                <div class="result-title">Atenção</div>
                <div class="result-item">
                    <span class="result-label">Nota necessária em ${data.campo_calculado}</span>
                    <span class="result-value">${data.nota_necessaria}</span>
                </div>
                <div class="result-item">
                    <span class="result-label" style="font-size: 12.5px;">Impossível aprovar direto! Você irá para exame.</span>
                </div>
                <div class="result-item" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(20, 40, 75, 0.12);">
                    <span class="result-label">MS com 10 em ${data.campo_calculado}</span>
                    <span class="result-value">${ms_com_10}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Nota Necessária no Exame</span>
                    <span class="result-value">${nota_exame}</span>
                </div>
            `;
        } else {
            cssClass = 'result-info';
            html = `
                <div class="result-title">Notas Necessárias</div>
                <div class="result-item">
                    <span class="result-label">Nota necessária em ${data.campo_calculado}</span>
                    <span class="result-value">${data.nota_necessaria}</span>
                </div>
                <div class="result-item">
                    <span class="result-label" style="font-size: 12.5px;">Para aprovação direta (MS ≥ 7,0)</span>
                </div>
            `;
        }
    } else if (data.status === 'dados_insuficientes') {
        const np1 = parseFloat(document.getElementById('np1').value);
        const hasNP1 = !document.getElementById('check-np1').checked && !isNaN(np1);

        if (hasNP1) {
            const necessario = 70 - (4 * np1);
            const notaIgual = necessario / 6;
            const pimNecessario = (necessario - 40) / 2;
            const np2Necessario = (necessario - 20) / 4;

            if (notaIgual <= 10) {
                cssClass = 'result-info';
                html = `
                    <div class="result-title">Notas Necessárias</div>
                    <div class="result-item">
                        <span class="result-label">Com NP1 = ${np1.toFixed(1)}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Opção 1: NP2 e PIM iguais</span>
                        <span class="result-value">${notaIgual.toFixed(1)} cada</span>
                    </div>
                    ${np2Necessario <= 10 ? `
                    <div class="result-item">
                        <span class="result-label">Opção 2: PIM = 10, NP2 precisa</span>
                        <span class="result-value">${np2Necessario.toFixed(1)}</span>
                    </div>
                    ` : ''}
                    ${pimNecessario <= 10 ? `
                    <div class="result-item">
                        <span class="result-label">Opção 3: NP2 = 10, PIM precisa</span>
                        <span class="result-value">${pimNecessario.toFixed(1)}</span>
                    </div>
                    ` : ''}
                    <div class="result-item">
                        <span class="result-label" style="font-size: 12.5px;">Para aprovação direta (MS ≥ 7,0)</span>
                    </div>
                `;
            } else {
                cssClass = 'result-warning';
                html = `
                    <div class="result-title">Atenção</div>
                    <div class="result-item">
                        <span class="result-label">Com NP1 = ${np1.toFixed(1)}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label" style="font-size: 12.5px;">Impossível aprovar direto com essa nota! Você irá para exame mesmo tirando 10 em NP2 e PIM.</span>
                    </div>
                `;
            }
        } else {
            cssClass = 'result-info';
            html = `
                <div class="result-title">Informação</div>
                <p style="margin-top: 8px; color: var(--text-secondary); font-size: 13px;">${data.mensagem}</p>
            `;
        }
    }

    elemento.innerHTML = html;
    elemento.className = `result ${cssClass} active`;
}

function mostrarErro(elemento, mensagem) {
    elemento.innerHTML = `
        <div class="result result-danger active">
            <div class="result-title">Erro</div>
            <p style="color: var(--text-secondary); margin-top: 8px; font-size: 13px;">${mensagem}</p>
        </div>
    `;
    elemento.classList.add('active');
}

function limparForm(formId) {
    const form = document.getElementById(formId);
    form.reset();

    if (formId === 'formNotas') {
        ['np1', 'np2', 'pim'].forEach(field => {
            document.getElementById(field).disabled = false;
            document.getElementById(`check-${field}`).checked = false;
        });
        document.getElementById('resultadoNotas').innerHTML = '';
    } else {
        document.getElementById('faltas').value = '0';
        document.getElementById('carga_horaria').value = '60';
        document.getElementById('resultadoFreq').innerHTML = '';
    }
}