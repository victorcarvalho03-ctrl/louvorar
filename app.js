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

function carregarEstrutura() {
    const idEvento = document.getElementById('select-evento-estrutura').value;
    if (!idEvento) return;

    // Limpa a tela
    estruturaAtual = {};
    pessoasAlocadas = [];
    disponiveisEvento = [];
    
    const campos = ['Soprano', 'Contralto', 'Tenor', 'Baixo', 'Teclado', 'Bateria', 'Baixo Elétrico', 'Violão', 'Guitarra', 'Sax', 'Flauta', 'Violino', 'Regência'];
    campos.forEach(c => {
        const el = document.getElementById('lista-' + c.toLowerCase().replace(' ', '-').replace('á', 'a').replace('ê', 'e'));
        if(el) {
            el.innerHTML = (c === 'Teclado' || c === 'Bateria' || c === 'Baixo Elétrico' || c === 'Violão' || c === 'Guitarra' || c === 'Sax' || c === 'Flauta' || c === 'Violino') ? c + ' (Clique)' : 'Clique para adicionar';
        }
    });
    document.getElementById('lista-disponiveis').innerHTML = "Buscando disponíveis...";

    // 1. Busca as respostas
    db.collection('disponibilidades').where('idEvento', '==', idEvento).where('status', '==', 'Disponível').get()
    .then(snapshot => {
        // 2. Busca os dados completos (funções) de cada pessoa
        let promises = [];
        snapshot.forEach(docResp => {
            const resp = docResp.data();
            promises.push(db.collection('membros').doc(resp.idMembro).get().then(docMembro => {
                if (docMembro.exists) {
                    const m = docMembro.data();
                    disponiveisEvento.push({
                        id: docMembro.id,
                        nome: m.nome,
                        funcoes: m.funcoes || [],
                        obs: resp.observacao
                    });
                }
            }));
        });
        return Promise.all(promises);
    }).then(() => {
        // 3. Tenta buscar uma estrutura já salva para este evento
        return db.collection('estruturas').doc(idEvento).get();
    }).then(docEstrutura => {
        if (docEstrutura.exists) {
            estruturaAtual = docEstrutura.data();
            // Recria a lista de alocados
            for (let func in estruturaAtual) {
                if (estruturaAtual[func]) {
                    estruturaAtual[func].forEach(p => {
                        pessoasAlocadas.push(p.id);
                    });
                }
            }
        }
        renderizarTela();
    }).catch(err => {
        console.error(err);
        document.getElementById('lista-disponiveis').innerHTML = "Erro ao carregar.";
    });
}

function renderizarTela() {
    const campos = ['Soprano', 'Contralto', 'Tenor', 'Baixo', 'Teclado', 'Bateria', 'Baixo Elétrico', 'Violão', 'Guitarra', 'Sax', 'Flauta', 'Violino', 'Regência'];
    
    // Desenha a tabela
    campos.forEach(func => {
        const el = document.getElementById('lista-' + func.toLowerCase().replace(' ', '-').replace('á', 'a').replace('ê', 'e'));
        if(!el) return;
        
        const alocados = estruturaAtual[func] || [];
        
        if (alocados.length === 0) {
            el.innerHTML = (['Teclado','Bateria','Baixo Elétrico','Violão','Guitarra','Sax','Flauta','Violino'].includes(func)) ? func + ' (Clique)' : 'Clique para adicionar';
        } else {
            el.innerHTML = "";
            alocados.forEach(p => {
                el.innerHTML += `<span class="nome-alocado">${p.nome} <button onclick="removerAlocado('${func}', '${p.id}'); event.stopPropagation();">x</button></span>`;
            });
        }
    });

    // Desenha o Pool de Disponíveis (Filtrado)
    const pool = document.getElementById('lista-disponiveis');
    const restantes = disponiveisEvento.filter(p => !pessoasAlocadas.includes(p.id));
    
    pool.innerHTML = "";
    if (restantes.length === 0) {
        pool.innerHTML = "Todos os disponíveis já foram alocados!";
    } else {
        restantes.forEach(p => {
            const obsIcon = p.obs ? ` ⚠️ (${p.obs})` : '';
            pool.innerHTML += `<div class="item-disponivel" onclick="abrirSeletorManual('${p.id}')"><strong>${p.nome}</strong><br><small>${p.funcoes.join(', ')}</small>${obsIcon}</div>`;
        });
    }
}

function abrirSeletor(funcao) {
    // Pega quem ainda não foi alocado E tem essa função
    const filtrados = disponiveisEvento.filter(p => 
        !pessoasAlocadas.includes(p.id) && p.funcoes.includes(funcao)
    );

    if (filtrados.length === 0) {
        alert(`Não há ninguém disponível para ${funcao} que ainda não tenha sido alocado.`);
        return;
    }
    
    // Como o prompt nativo é feio, vamos usar um simples prompt para selecionar
    let msg = `Selecione o número para alocar em ${funcao}:\n\n`;
    filtrados.forEach((p, index) => {
        msg += `${index + 1}. ${p.nome}\n`;
    });

    const escolha = prompt(msg);
    if (escolha) {
        const idx = parseInt(escolha) - 1;
        if (filtrados[idx]) {
            alocarPessoa(funcao, filtrados[idx]);
        }
    }
}

function abrirSeletorManual(idMembro) {
    const pessoa = disponiveisEvento.find(p => p.id === idMembro);
    if(!pessoa) return;
    
    let msg = `Em qual função você quer alocar ${pessoa.nome}?\n\n`;
    pessoa.funcoes.forEach((f, i) => { msg += `${i+1}. ${f}\n`; });
    
    const escolha = prompt(msg);
    if(escolha) {
        const func = pessoa.funcoes[parseInt(escolha)-1];
        if(func) alocarPessoa(func, pessoa);
    }
}

function alocarPessoa(funcao, pessoa) {
    if (!estruturaAtual[funcao]) estruturaAtual[funcao] = [];
    
    // Verifica se não é a Regência (que só aceita 1)
    if (funcao === 'Regência' && estruturaAtual[funcao].length > 0) {
        alert("Já existe um regente alocado.");
        return;
    }

    estruturaAtual[funcao].push({ id: pessoa.id, nome: pessoa.nome });
    pessoasAlocadas.push(pessoa.id);
    renderizarTela();
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

