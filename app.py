import os
from flask import Flask, render_template, request, jsonify
from typing import Tuple, Dict, Optional


app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False



def calcular_frequencia(num_faltas: float, carga_horaria: float = 60) -> Tuple[bool, float]:

    if carga_horaria <= 0:
        return True, 100.0
    
    frequencia = ((carga_horaria - num_faltas) / carga_horaria) * 100
    return frequencia >= 75, max(0, min(100, frequencia))

def calcular_media_semestral(np1: float, np2: float, pim: float) -> float:

    return (4 * np1 + 4 * np2 + 2 * pim) / 10

def calcular_nota_exame(ms: float) -> float:

    return max(0, 10 - ms)

def validar_nota(valor: Optional[str]) -> Optional[float]:

    if not valor or valor.strip() == '':
        return None
    
    try:
        nota = float(valor)
        if nota < 0 or nota > 10:
            raise ValueError("Nota deve estar entre 0 e 10")
        return nota
    except ValueError:
        raise ValueError(f"Valor inválido: {valor}")


@app.route('/')
def index():

    return render_template('index.html')

@app.route('/calcular', methods=['POST'])
def calcular():

    try:
        data = request.get_json()
        
        num_faltas = float(data.get('num_faltas', 0))
        carga_horaria = float(data.get('carga_horaria', 60))
        np1 = validar_nota(data.get('np1'))
        np2 = validar_nota(data.get('np2'))
        pim = validar_nota(data.get('pim'))
        
        resultado = {}
        

        aprovado_freq, frequencia = calcular_frequencia(num_faltas, carga_horaria)
        
        resultado['frequencia'] = round(frequencia, 2)
        resultado['aprovado_frequencia'] = aprovado_freq
        
        if not aprovado_freq:
            resultado['status'] = 'reprovado_falta'
            resultado['mensagem'] = 'Reprovado por Faltas'
            return jsonify(resultado)
        

        notas_preenchidas = [n for n in [np1, np2, pim] if n is not None]
        campos_vazios = 3 - len(notas_preenchidas)
        

        if campos_vazios == 0:
            ms = calcular_media_semestral(np1, np2, pim)
            resultado['ms'] = round(ms, 2)
            
            if ms >= 7:
                resultado['status'] = 'aprovado'
                resultado['mensagem'] = 'Aprovado Direto!'
            else:
                nota_exame = calcular_nota_exame(ms)
                resultado['status'] = 'exame'
                resultado['mensagem'] = 'Em Exame'
                resultado['nota_exame'] = round(nota_exame, 2)
        

        elif campos_vazios == 1:
            target_ms = 7.0
            
            if np1 is None:
                nota_necessaria = (target_ms * 10 - 4 * np2 - 2 * pim) / 4
                campo = 'NP1'
                ms_com_10 = calcular_media_semestral(10, np2, pim)
            elif np2 is None:
                nota_necessaria = (target_ms * 10 - 4 * np1 - 2 * pim) / 4
                campo = 'NP2'
                ms_com_10 = calcular_media_semestral(np1, 10, pim)
            else:
                nota_necessaria = (target_ms * 10 - 4 * np1 - 4 * np2) / 2
                campo = 'PIM'
                ms_com_10 = calcular_media_semestral(np1, np2, 10)
            
            resultado['campo_calculado'] = campo
            resultado['nota_necessaria'] = round(nota_necessaria, 2)
            resultado['status'] = 'calculo_necessario'
            
            if nota_necessaria > 10:
                resultado['aviso'] = 'maior_que_10'
                resultado['ms_com_10'] = round(ms_com_10, 2)
                
                if ms_com_10 < 7:
                    nota_exame = calcular_nota_exame(ms_com_10)
                    resultado['nota_exame_prevista'] = round(nota_exame, 2)
            elif nota_necessaria < 0:
                resultado['aviso'] = 'ja_aprovado'
                resultado['mensagem'] = f'Você já está aprovado! Qualquer nota em {campo} será suficiente.'
        

        else:
            resultado['status'] = 'dados_insuficientes'
            resultado['mensagem'] = 'Preencha pelo menos duas notas para calcular.'
        
        return jsonify(resultado)
    
    except ValueError as e:
        return jsonify({'erro': str(e)}), 400
    except Exception as e:
        return jsonify({'erro': f'Erro no processamento: {str(e)}'}), 500

@app.route('/health')
def health():

    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    os.makedirs('templates', exist_ok=True)
    
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        use_reloader=True
    )