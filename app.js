// 1. COLOQUE SUAS CHAVES REAIS DO FIREBASE AQUI
const firebaseConfig = {
  apiKey: "AIzaSyBctoENUqGBMTBVIuAEOr-zyMCK4-fLi5U",
  authDomain: "louvor-angra-dos-reis.firebaseapp.com",
  projectId: "louvor-angra-dos-reis",
  storageBucket: "louvor-angra-dos-reis.firebasestorage.app",
  messagingSenderId: "613690121412",
  appId: "1:613690121412:web:be62972614043421723d91"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Variáveis de Controle
let idMembroEditando = null;
let meuNivelAcesso = "visitante";
let meuGrupoLocal = "nenhum";
let abaMembrosAtual = "locais"; // Pode ser 'locais' ou 'area'
let estruturaAtual = {}; // Guarda o que está sendo montado
let pessoasAlocadas = []; // Guarda os IDs de quem já foi chamado
let disponiveisEvento = []; // Todos que responderam "Sim"

// 2. LÓGICA DE LOGIN E PERMISSÕES
function fazerLogin() {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const msgErro = document.getElementById('mensagem-erro');

    auth.signInWithEmailAndPassword(email, senha)
        .then((userCredential) => {
            msgErro.innerText = "";
            verificarPermissoes(userCredential.user.email);
        })
        .catch((error) => {
            msgErro.innerText = "Erro: " + error.message;
        });
}

function verificarPermissoes(emailLogado) {
    // Busca o e-mail na coleção 'usuarios' para ver quem é
    db.collection('usuarios').doc(emailLogado).get().then((doc) => {
        if (doc.exists) {
            const dados = doc.data();
            meuNivelAcesso = dados.nivel; // 'admin' ou 'lider'
            meuGrupoLocal = dados.grupoLocal; 
            
            // Mostra o botão de adicionar membro se for admin ou lider
            document.getElementById('btn-add-membro').style.display = "block";
        } else {
            // Se não achar o usuário no banco, é visitante (só leitura)
            meuNivelAcesso = "visitante";
        }

        // Libera a tela
        document.getElementById('tela-login').classList.add('escondido');
        document.getElementById('painel-principal').classList.remove('escondido');
        carregarMembros();
    });
}

function fazerLogout() {
    auth.signOut().then(() => {
        document.getElementById('painel-principal').classList.add('escondido');
        document.getElementById('tela-login').classList.remove('escondido');
        document.getElementById('email').value = "";
        document.getElementById('senha').value = "";
        meuNivelAcesso = "visitante";
    });
}

auth.onAuthStateChanged((user) => {
    if (user) {
        verificarPermissoes(user.email);
    } else {
        document.getElementById('tela-login').classList.remove('escondido');
        document.getElementById('painel-principal').classList.add('escondido');
    }
});

// 3. LÓGICA DAS SUB-ABAS (Locais vs Área)
function mudarSubAba(aba) {
    abaMembrosAtual = aba;
    
    // Atualiza visual dos botões
    document.getElementById('sub-aba-locais').classList.remove('ativa');
    document.getElementById('sub-aba-area').classList.remove('ativa');
    
    if (aba === 'locais') {
        document.getElementById('sub-aba-locais').classList.add('ativa');
    } else {
        document.getElementById('sub-aba-area').classList.add('ativa');
    }
    
    carregarMembros(); // Recarrega a tabela filtrada
}

// 4. BUSCAR E RENDERIZAR MEMBROS
function carregarMembros() {
    const tabela = document.getElementById('corpo-tabela-membros');
    tabela.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Buscando dados...</td></tr>";
    
    db.collection('membros').get().then((querySnapshot) => {
        tabela.innerHTML = ""; 
        let contador = 0;

        querySnapshot.forEach((doc) => {
            const membro = doc.data();
            
            // Filtro das Abas: Se for 'area' e o membro não for da área, pula.
            if (abaMembrosAtual === 'area' && !membro.ehGrupoArea) return;

            contador++;
            const tr = document.createElement('tr');
            const funcoes = membro.funcoes ? membro.funcoes.join(', ') : '';
            const isArea = membro.ehGrupoArea ? "Sim" : "Não";

            // LÓGICA DE PERMISSÃO: Quem pode editar esse membro?
            let botoesAcao = "";
            if (meuNivelAcesso === 'admin' || (meuNivelAcesso === 'lider' && meuGrupoLocal === membro.grupoLocal)) {
                botoesAcao = `
                    <button onclick="prepararEdicao('${doc.id}')" style="cursor:pointer; border:none; background:none; font-size:16px;">✏️</button>
                    <button onclick="excluirMembro('${doc.id}', '${membro.nome}')" style="cursor:pointer; border:none; background:none; font-size:16px;">🗑️</button>
                `;
            } else {
                botoesAcao = `<span style="font-size:12px; color:#888;">Sem permissão</span>`;
            }

            tr.innerHTML = `
                <td>${membro.nome}</td>
                <td>${membro.grupoLocal}</td>
                <td>${funcoes}</td>
                <td>${isArea}</td>
                <td style="white-space: nowrap;">${botoesAcao}</td>
            `;
            tabela.appendChild(tr);
        });

        if (contador === 0) {
            tabela.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Nenhum membro encontrado nesta aba.</td></tr>";
        }

    }).catch((error) => {
        console.error("Erro ao buscar membros: ", error);
        tabela.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Erro ao carregar os dados.</td></tr>";
    });
}

// 5. LÓGICA DO MODAL (CRIAR E EDITAR)
function abrirModal() {
    idMembroEditando = null;
    document.getElementById('titulo-modal-membro').innerText = "Cadastrar Novo Membro";
    document.getElementById('membro-nome').value = "";
    document.getElementById('membro-funcoes').value = "";
    document.getElementById('membro-area').checked = false;
    document.getElementById('modal-membro').classList.remove('escondido');
}

function fecharModal() {
    document.getElementById('modal-membro').classList.add('escondido');
}

function salvarMembro() {
    const nome = document.getElementById('membro-nome').value;
    const grupoLocal = document.getElementById('membro-grupo').value;
    const funcoesTexto = document.getElementById('membro-funcoes').value;
    const ehGrupoArea = document.getElementById('membro-area').checked;

    if (!nome || !funcoesTexto) { alert("Preencha nome e funções."); return; }

    const funcoesArray = funcoesTexto.split(',').map(f => f.trim());
    const dadosMembro = { nome, grupoLocal, funcoes: funcoesArray, ehGrupoArea };

    if (idMembroEditando) {
        db.collection('membros').doc(idMembroEditando).update(dadosMembro).then(() => {
            alert("Membro atualizado!"); fecharModal(); carregarMembros();
        }).catch((error) => console.error("Erro ao atualizar: ", error));
    } else {
        db.collection('membros').add(dadosMembro).then(() => {
            alert("Membro cadastrado!"); fecharModal(); carregarMembros();
        }).catch((error) => console.error("Erro ao cadastrar: ", error));
    }
}

function prepararEdicao(id) {
    idMembroEditando = id;
    db.collection('membros').doc(id).get().then((doc) => {
        if (doc.exists) {
            const membro = doc.data();
            document.getElementById('titulo-modal-membro').innerText = "Editar Membro";
            document.getElementById('membro-nome').value = membro.nome;
            document.getElementById('membro-grupo').value = membro.grupoLocal;
            document.getElementById('membro-funcoes').value = membro.funcoes ? membro.funcoes.join(', ') : '';
            document.getElementById('membro-area').checked = membro.ehGrupoArea;
            document.getElementById('modal-membro').classList.remove('escondido');
        }
    });
}

function excluirMembro(id, nome) {
    if (confirm(`Excluir ${nome}? Essa ação não pode ser desfeita.`)) {
        db.collection('membros').doc(id).delete().then(() => {
            alert("Excluído!"); carregarMembros();
        }).catch((error) => console.error("Erro ao excluir: ", error));
    }
}
// 6. CONTROLE DE ABAS DO MENU PRINCIPAL
function mostrarAba(aba) {
    document.getElementById('conteudo-membros').classList.add('escondido');
    document.getElementById('conteudo-eventos').classList.add('escondido');
    document.getElementById('conteudo-estrutura').classList.add('escondido');
    
    document.getElementById('aba-btn-membros').classList.remove('aba-ativa');
    document.getElementById('aba-btn-eventos').classList.remove('aba-ativa');
    document.getElementById('aba-btn-estrutura').classList.remove('aba-ativa');

    if (aba === 'membros') {
        document.getElementById('conteudo-membros').classList.remove('escondido');
        document.getElementById('aba-btn-membros').classList.add('aba-ativa');
        carregarMembros();
    } else if (aba === 'eventos') {
        document.getElementById('conteudo-eventos').classList.remove('escondido');
        document.getElementById('aba-btn-eventos').classList.add('aba-ativa');
        carregarEventos();
    } else if (aba === 'estrutura') {
        document.getElementById('conteudo-estrutura').classList.remove('escondido');
        document.getElementById('aba-btn-estrutura').classList.add('aba-ativa');
        carregarSelectEventos();
    }
}

// 7. LÓGICA DE EVENTOS
function abrirModalEvento() {
    document.getElementById('evento-titulo').value = "";
    document.getElementById('evento-data').value = "";
    document.getElementById('evento-prazo').value = "";
    document.getElementById('modal-evento').classList.remove('escondido');
}

function fecharModalEvento() {
    document.getElementById('modal-evento').classList.add('escondido');
}

function salvarEvento() {
    const titulo = document.getElementById('evento-titulo').value;
    const data = document.getElementById('evento-data').value;
    const prazo = document.getElementById('evento-prazo').value;

    if (!titulo || !data || !prazo) {
        alert("Preencha todos os campos do evento.");
        return;
    }

    db.collection('eventos').add({
        titulo: titulo,
        data: data,
        prazo: prazo
    }).then(() => {
        alert("Evento criado com sucesso!");
        fecharModalEvento();
        carregarEventos();
    }).catch((error) => {
        console.error("Erro ao criar evento: ", error);
        alert("Erro ao criar evento.");
    });
}

function carregarEventos() {
    const tabela = document.getElementById('corpo-tabela-eventos');
    tabela.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Buscando eventos...</td></tr>";

    // Ordena pela data do evento (mais recentes primeiro)
    db.collection('eventos').orderBy('data', 'desc').get().then((querySnapshot) => {
        tabela.innerHTML = "";

        if (querySnapshot.empty) {
            tabela.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Nenhum evento criado ainda.</td></tr>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const evento = doc.data();
            
            // Formata as datas para o padrão brasileiro (DD/MM/AAAA)
            const dataFormatada = evento.data.split('-').reverse().join('/');
            let prazoFormatado = evento.prazo.replace('T', ' '); // Tira o 'T' da data
            if (prazoFormatado) {
                const partes = prazoFormatado.split(' ')[0].split('-');
                prazoFormatado = `${partes[2]}/${partes[1]}/${partes[0]} às ${prazoFormatado.split(' ')[1]}`;
            }

            // Gera o link público para este evento específico
            const linkPublico = window.location.origin + window.location.pathname.replace('index.html', '') + 'disponibilidade.html?evento=' + doc.id;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${evento.titulo}</td>
                <td>${dataFormatada}</td>
                <td>${prazoFormatado}</td>
                <td>
                    <button onclick="copiarLink('${linkPublico}')" style="background:#4CAF50; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Copiar Link</button>
                </td>
            `;
            tabela.appendChild(tr);
        });
    }).catch((error) => {
        console.error("Erro ao buscar eventos: ", error);
        tabela.innerHTML = "<tr><td colspan='4' style='color:red; text-align:center;'>Erro ao carregar eventos.</td></tr>";
    });
}

// Função para copiar o link facilmente no celular
function copiarLink(texto) {
    // Truque para funcionar em navegadores de celular que bloqueiam clipboard API
    const textArea = document.createElement("textarea");
    textArea.value = texto;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert("Link copiado! Agora é só colar no grupo do WhatsApp.");
    } catch (err) {
        prompt("Não foi possível copiar automaticamente. Copie o link abaixo:", texto);
    }
    document.body.removeChild(textArea);
}

// --- LÓGICA DA ESTRUTURA ---
function carregarSelectEventos() {
    const select = document.getElementById('select-evento-estrutura');
    select.innerHTML = "<option value=''>Selecione...</option>";
    
    db.collection('eventos').orderBy('data', 'desc').get().then(snapshot => {
        snapshot.forEach(doc => {
            const ev = doc.data();
            select.innerHTML += `<option value="${doc.id}">${ev.titulo} (${ev.data.split('-').reverse().join('/')})</option>`;
        });
    });
}

// --- LÓGICA DA ESTRUTURA (V2 - Tabela Excel e Múltipla Seleção) ---
let funcaoSelecionando = ""; 

function carregarEstrutura() {
    const idEvento = document.getElementById('select-evento-estrutura').value;
    if (!idEvento) return;

    estruturaAtual = {};
    pessoasAlocadas = [];
    disponiveisEvento = [];
    
    document.getElementById('lista-disponiveis').innerHTML = "Buscando disponíveis...";

    db.collection('disponibilidades').where('idEvento', '==', idEvento).where('status', '==', 'Disponível').get()
    .then(snapshot => {
        let promises = [];
        snapshot.forEach(docResp => {
            const resp = docResp.data();
            promises.push(db.collection('membros').doc(resp.idMembro).get().then(docMembro => {
                if (docMembro.exists) {
                    const m = docMembro.data();
                    disponiveisEvento.push({ id: docMembro.id, nome: m.nome, funcoes: m.funcoes || [], obs: resp.observacao });
                }
            }));
        });
        return Promise.all(promises);
    }).then(() => {
        return db.collection('estruturas').doc(idEvento).get();
    }).then(docEstrutura => {
        if (docEstrutura.exists) {
            estruturaAtual = docEstrutura.data();
            for (let func in estruturaAtual) {
                if (estruturaAtual[func]) {
                    estruturaAtual[func].forEach(p => pessoasAlocadas.push(p.id));
                }
            }
        }
        desenharTabelaExcel();
        desenharPoolDisponiveis();
    }).catch(err => {
        console.error(err);
        document.getElementById('lista-disponiveis').innerHTML = "Erro ao carregar.";
    });
}

function desenharTabelaExcel() {
    const tbody = document.getElementById('corpo-tabela-excel');
    tbody.innerHTML = "";

    const configLinhas = [
        { sop: 0, ten: 0, base: 'Teclado', sopro: 'Clarinete' },
        { sop: 1, ten: 1, base: 'Bateria', sopro: 'Flauta' },
        { sop: 2, ten: 2, base: 'Baixo Elétrico', sopro: 'Sax' },
        { sop: 3, ten: 3, base: 'Violão', sopro: 'Trompete' },
        { sop: 4, ten: 4, base: 'Guitarra', sopro: null },
        { sop: 5, ten: 5, base: null, sopro: 'CORDAS: Violino' },
        { sop: 6, ten: 6, base: null, sopro: null },
        { sop: 7, ten: 7, base: null, sopro: null }
    ];

    // MUDANÇA AQUI: O botão de X agora usa "this" e "onclick"
    const renderNome = (func, index) => {
        if (!estruturaAtual[func] || !estruturaAtual[func][index]) return "";
        const p = estruturaAtual[func][index];
        return `<span style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
                    <span>${p.nome}</span>
                    <button type="button" onclick="removerAlocado('${func}', '${p.id}')" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold; padding:0 5px; font-size: 16px;" title="Remover">x</button>
                </span>`;
    };

    const getMic = (func, index) => {
         return estruturaAtual['Mic_' + func] && estruturaAtual['Mic_' + func][index] ? estruturaAtual['Mic_' + func][index].nome : "";
    };

    configLinhas.forEach((linha, i) => {
        const tr = document.createElement('tr');
        
        // -- BLOCO SOPRANO / CONTRALTO --
        if (i < 4) {
            tr.innerHTML += `<td class="cab-verde" style="font-size:10px;">${i===0 ? 'SOPRANO' : (i===1 ? 'CONTRALTO' : '')}</td>`;
            // MUDANÇA AQUI: Tiramos o onclick da célula TD e colocamos no conteúdo interno para não conflitar
            tr.innerHTML += `<td class="celula-nome"><div onclick="abrirModalSelecao('${i < 2 ? 'Soprano' : 'Contralto'}')" style="min-height:20px; width:100%;">${renderNome(i < 2 ? 'Soprano' : 'Contralto', i % 2)}</div></td>`;
            tr.innerHTML += `<td class="celula-mic" contenteditable="true" onblur="salvarMic(this.innerText, '${i < 2 ? 'Soprano' : 'Contralto'}', ${i%2})">${getMic(i < 2 ? 'Soprano' : 'Contralto', i % 2)}</td>`;
        } else {
            tr.innerHTML += `<td></td><td></td><td></td>`;
        }

        // -- BLOCO TENOR / BAIXO --
        if (i < 4) {
            tr.innerHTML += `<td class="cab-verde" style="font-size:10px;">${i===0 ? 'TENOR' : (i===1 ? 'BAIXO' : '')}</td>`;
            tr.innerHTML += `<td class="celula-nome"><div onclick="abrirModalSelecao('${i < 2 ? 'Tenor' : 'Baixo'}')" style="min-height:20px; width:100%;">${renderNome(i < 2 ? 'Tenor' : 'Baixo', i % 2)}</div></td>`;
            tr.innerHTML += `<td class="celula-mic" contenteditable="true" onblur="salvarMic(this.innerText, '${i < 2 ? 'Tenor' : 'Baixo'}', ${i%2})">${getMic(i < 2 ? 'Tenor' : 'Baixo', i % 2)}</td>`;
        } else {
            tr.innerHTML += `<td></td><td></td><td></td>`;
        }

        // -- BLOCO BASE / SOPRO --
        tr.innerHTML += `<td class="cab-azul" style="font-size:10px;">${linha.base || ''}</td>`;
        tr.innerHTML += `<td class="celula-nome"><div onclick="${linha.base ? `abrirModalSelecao('${linha.base}')` : ''}" style="min-height:20px; width:100%;">${linha.base ? renderNome(linha.base, 0) : ''}</div></td>`;
        
        tr.innerHTML += `<td class="cab-azul" style="font-size:10px;">${linha.sopro || ''}</td>`;
        tr.innerHTML += `<td class="celula-nome"><div onclick="${linha.sopro ? `abrirModalSelecao('${linha.sopro.replace('CORDAS: ', '')}')` : ''}" style="min-height:20px; width:100%;">${linha.sopro ? renderNome(linha.sopro.replace('CORDAS: ', ''), 0) : ''}</div></td>`;

        tbody.appendChild(tr);
    });

    // Linha Regência
    const trReg = document.createElement('tr');
    trReg.innerHTML = `
        <td colspan="9" class="cab-vermelho" style="text-align:right;">REGÊNCIA:</td>
        <td class="celula-nome" style="background:#ffcccc;"><div onclick="abrirModalSelecao('Regência')" style="min-height:20px; width:100%;">${renderNome('Regência', 0)}</div></td>
    `;
    tbody.appendChild(trReg);
}

function desenharPoolDisponiveis() {
    const pool = document.getElementById('lista-disponiveis');
    const restantes = disponiveisEvento.filter(p => !pessoasAlocadas.includes(p.id));
    
    pool.innerHTML = "";
    if (restantes.length === 0) {
        pool.innerHTML = "Todos os disponíveis já foram alocados!";
    } else {
        restantes.forEach(p => {
            const obsIcon = p.obs ? `<br><small style="color:#d9534f;">⚠️ ${p.obs}</small>` : '';
            // Adicionamos o clique para abrir as opções de alocação direto no pool
            pool.innerHTML += `
                <div class="item-disponivel" onclick="alocarPeloPool('${p.id}')">
                    <strong>${p.nome}</strong><br>
                    <small>${p.funcoes.join(', ')}</small>
                    ${obsIcon}
                </div>`;
        });
    }
}

// Nova função para alocar clicando direto na lista de disponíveis
function alocarPeloPool(id) {
    const pessoa = disponiveisEvento.find(p => p.id === id);
    if(!pessoa) return;
    
    if (pessoa.funcoes.length === 1) {
        // Se a pessoa só tem 1 função, aloca direto
        alocarPessoa(pessoa.funcoes[0], pessoa);
    } else {
        // Se tem mais de uma função, pergunta qual usar
        let msg = `Em qual função você quer alocar ${pessoa.nome}?\n\n`;
        pessoa.funcoes.forEach((f, i) => { msg += `${i+1}. ${f}\n`; });
        
        const escolha = prompt(msg);
        if(escolha) {
            const func = pessoa.funcoes[parseInt(escolha)-1];
            if(func) alocarPessoa(func, pessoa);
        }
    }
}

// Função auxiliar para alocar (já que o modal agora é múltiplo)
function alocarPessoa(funcao, pessoa) {
    if (!estruturaAtual[funcao]) estruturaAtual[funcao] = [];
    if (funcao === 'Regência' && estruturaAtual[funcao].length > 0) {
        alert("Já existe um regente alocado.");
        return;
    }
    estruturaAtual[funcao].push({ id: pessoa.id, nome: pessoa.nome });
    pessoasAlocadas.push(pessoa.id);
    desenharTabelaExcel();
    desenharPoolDisponiveis();
}

// --- SISTEMA DE MÚLTIPLA SELEÇÃO ---
function abrirModalSelecao(funcao) {
    funcaoSelecionando = funcao;
    const filtrados = disponiveisEvento.filter(p => !pessoasAlocadas.includes(p.id) && p.funcoes.includes(funcao));

    if (filtrados.length === 0) {
        alert(`Não há ninguém mais disponível para ${funcao}.`);
        return;
    }

    document.getElementById('titulo-selecao').innerText = `Adicionar em ${funcao}`;
    const container = document.getElementById('lista-checkbox-selecao');
    container.innerHTML = "";

    filtrados.forEach((p, index) => {
        const obs = p.obs ? ` ⚠️ (${p.obs})` : '';
        container.innerHTML += `
            <label style="display:flex; align-items:center; padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
                <input type="checkbox" value="${p.id}" style="width:20px; height:20px; margin-right:10px;">
                <span><strong>${p.nome}</strong> <small>${obs}</small></span>
            </label>
        `;
    });

    document.getElementById('modal-selecao').classList.remove('escondido');
}

function fecharModalSelecao() {
    document.getElementById('modal-selecao').classList.add('escondido');
}

function confirmarSelecaoMultipla() {
    const checkboxes = document.querySelectorAll('#lista-checkbox-selecao input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert("Selecione pelo menos uma pessoa.");
        return;
    }

    if (funcaoSelecionando === 'Regência' && checkboxes.length > 1) {
        alert("Você só pode escalar 1 regente.");
        return;
    }

    if (!estruturaAtual[funcaoSelecionando]) estruturaAtual[funcaoSelecionando] = [];

    checkboxes.forEach(cb => {
        const id = cb.value;
        const pessoa = disponiveisEvento.find(p => p.id === id);
        if (pessoa) {
            estruturaAtual[funcaoSelecionando].push({ id: pessoa.id, nome: pessoa.nome });
            pessoasAlocadas.push(pessoa.id);
        }
    });

    fecharModalSelecao();
    desenharTabelaExcel();
    desenharPoolDisponiveis();
}

// --- SALVAR MIC ---
function salvarMic(valor, funcao, index) {
    if(!estruturaAtual['Mic_' + funcao]) estruturaAtual['Mic_' + funcao] = [];
    estruturaAtual['Mic_' + funcao][index] = { nome: valor };
}

function removerAlocado(funcao, idPessoa) {
    estruturaAtual[funcao] = estruturaAtual[funcao].filter(p => p.id !== idPessoa);
    pessoasAlocadas = pessoasAlocadas.filter(id => id !== idPessoa);
    desenharTabelaExcel();
    desenharPoolDisponiveis();
}

function salvarEstrutura() {
    const idEvento = document.getElementById('select-evento-estrutura').value;
    if (!idEvento) return;

    db.collection('estruturas').doc(idEvento).set(estruturaAtual).then(() => {
        alert("Estrutura salva com sucesso!");
    }).catch(err => {
        console.error(err);
        alert("Erro ao salvar.");
    });
}

function removerAlocado(funcao, idPessoa) {
    estruturaAtual[funcao] = estruturaAtual[funcao].filter(p => p.id !== idPessoa);
    pessoasAlocadas = pessoasAlocadas.filter(id => id !== idPessoa);
    renderizarTela();
}

function salvarEstrutura() {
    const idEvento = document.getElementById('select-evento-estrutura').value;
    if (!idEvento) return;

    db.collection('estruturas').doc(idEvento).set(estruturaAtual).then(() => {
        alert("Estrutura salva com sucesso!");
    }).catch(err => console.error(err));
}

