// 1. COLOQUE SUAS CHAVES DO FIREBASE AQUI
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Variável global para saber se estamos criando ou editando
let idMembroEditando = null;

// 2. LÓGICA DE LOGIN
function fazerLogin() {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const msgErro = document.getElementById('mensagem-erro');

    auth.signInWithEmailAndPassword(email, senha)
        .then((userCredential) => {
            msgErro.innerText = "";
            document.getElementById('tela-login').classList.add('escondido');
            document.getElementById('painel-principal').classList.remove('escondido');
            carregarMembros(); 
        })
        .catch((error) => {
            msgErro.innerText = "Erro: " + error.message;
        });
}

function fazerLogout() {
    auth.signOut().then(() => {
        document.getElementById('painel-principal').classList.add('escondido');
        document.getElementById('tela-login').classList.remove('escondido');
        document.getElementById('email').value = "";
        document.getElementById('senha').value = "";
    });
}

// Monitora o estado de autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('tela-login').classList.add('escondido');
        document.getElementById('painel-principal').classList.remove('escondido');
        carregarMembros();
    } else {
        document.getElementById('tela-login').classList.remove('escondido');
        document.getElementById('painel-principal').classList.add('escondido');
    }
});

// 3. LÓGICA DE BUSCAR E MOSTRAR MEMBROS
function carregarMembros() {
    const tabela = document.getElementById('corpo-tabela-membros');
    
    db.collection('membros').get().then((querySnapshot) => {
        tabela.innerHTML = ""; 

        if (querySnapshot.empty) {
            tabela.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Nenhum membro cadastrado ainda.</td></tr>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const membro = doc.data();
            const tr = document.createElement('tr');
            
            const funcoes = membro.funcoes ? membro.funcoes.join(', ') : '';
            const isArea = membro.ehGrupoArea ? "Sim" : "Não";

            // Adicionamos os botões com as funções de editar e excluir passando o ID do documento
            tr.innerHTML = `
                <td>${membro.nome}</td>
                <td>${membro.grupoLocal}</td>
                <td>${funcoes}</td>
                <td>${isArea}</td>
                <td style="white-space: nowrap;">
                    <button onclick="prepararEdicao('${doc.id}')" style="cursor:pointer; border:none; background:none; font-size:16px;">✏️</button>
                    <button onclick="excluirMembro('${doc.id}', '${membro.nome}')" style="cursor:pointer; border:none; background:none; font-size:16px;">🗑️</button>
                </td>
            `;
            tabela.appendChild(tr);
        });
    }).catch((error) => {
        console.error("Erro ao buscar membros: ", error);
        tabela.innerHTML = "<tr><td colspan='5' style='color:red;'>Erro ao carregar os dados do banco.</td></tr>";
    });
}

// 4. LÓGICA DO MODAL (CRIAR E EDITAR)
function abrirModal() {
    idMembroEditando = null; // Reseta a variável (modo criação)
    document.getElementById('titulo-modal-membro').innerText = "Cadastrar Novo Membro";
    
    // Limpa os campos
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

    if (!nome || !funcoesTexto) {
        alert("Por favor, preencha o nome e as funções.");
        return;
    }

    const funcoesArray = funcoesTexto.split(',').map(f => f.trim());

    const dadosMembro = {
        nome: nome,
        grupoLocal: grupoLocal,
        funcoes: funcoesArray,
        ehGrupoArea: ehGrupoArea
    };

    if (idMembroEditando) {
        // Se tem ID, estamos EDITANDO
        db.collection('membros').doc(idMembroEditando).update(dadosMembro)
        .then(() => {
            alert("Membro atualizado com sucesso!");
            fecharModal();
            carregarMembros();
        }).catch((error) => {
            console.error("Erro ao atualizar: ", error);
        });
    } else {
        // Se não tem ID, estamos CRIANDO
        db.collection('membros').add(dadosMembro)
        .then(() => {
            alert("Membro cadastrado com sucesso!");
            fecharModal();
            carregarMembros();
        }).catch((error) => {
            console.error("Erro ao cadastrar: ", error);
        });
    }
}

// 5. LÓGICA DE EDITAR E EXCLUIR
function prepararEdicao(id) {
    idMembroEditando = id; // Guarda o ID
    
    // Busca os dados no banco para preencher o modal
    db.collection('membros').doc(id).get().then((doc) => {
        if (doc.exists) {
            const membro = doc.data();
            
            // Muda o título do modal
            document.getElementById('titulo-modal-membro').innerText = "Editar Membro";
            
            // Preenche os campos
            document.getElementById('membro-nome').value = membro.nome;
            document.getElementById('membro-grupo').value = membro.grupoLocal;
            document.getElementById('membro-funcoes').value = membro.funcoes ? membro.funcoes.join(', ') : '';
            document.getElementById('membro-area').checked = membro.ehGrupoArea;
            
            // Abre o modal
            document.getElementById('modal-membro').classList.remove('escondido');
        }
    });
}

function excluirMembro(id, nome) {
    // Confirmação de segurança
    if (confirm(`Tem certeza que deseja excluir ${nome}? Essa ação não pode ser desfeita.`)) {
        db.collection('membros').doc(id).delete().then(() => {
            alert("Membro excluído com sucesso.");
            carregarMembros(); // Atualiza a tabela
        }).catch((error) => {
            console.error("Erro ao excluir: ", error);
        });
    }
}
