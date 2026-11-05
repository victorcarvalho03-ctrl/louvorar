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
