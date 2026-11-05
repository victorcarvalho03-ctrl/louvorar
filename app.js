// 1. COLOQUE SUAS CHAVES DO FIREBASE AQUI
const firebaseConfig = {
  apiKey: "AIzaSyBctoENUqGBMTBVIuAEOr-zyMCK4-fLi5U",
  authDomain: "louvor-angra-dos-reis.firebaseapp.com",
  projectId: "louvor-angra-dos-reis",
  storageBucket: "louvor-angra-dos-reis.firebasestorage.app",
  messagingSenderId: "613690121412",
  appId: "1:613690121412:web:be62972614043421723d91"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. LÓGICA DE LOGIN
function fazerLogin() {
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const msgErro = document.getElementById('mensagem-erro');

    auth.signInWithEmailAndPassword(email, senha)
        .then((userCredential) => {
            // Login bem-sucedido
            msgErro.innerText = "";
            document.getElementById('tela-login').classList.add('escondido');
            document.getElementById('painel-principal').classList.remove('escondido');
            carregarMembros(); // Chama a função para buscar os dados
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

// Monitora o estado de autenticação (se der F5, ele não desloga)
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

// 3. LÓGICA DE BUSCAR MEMBROS NO BANCO (Ainda vamos popular isso)
function carregarMembros() {
    const tabela = document.getElementById('corpo-tabela-membros');
    
    // Vamos buscar na coleção "membros"
    db.collection('membros').get().then((querySnapshot) => {
        tabela.innerHTML = ""; // Limpa a tabela

        if (querySnapshot.empty) {
            tabela.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Nenhum membro cadastrado ainda.</td></tr>";
            return;
        }

        querySnapshot.forEach((doc) => {
            const membro = doc.data();
            const tr = document.createElement('tr');
            
            // Transforma o array de funções em texto (ex: "Soprano, Teclado")
            const funcoes = membro.funcoes ? membro.funcoes.join(', ') : '';
            const isArea = membro.ehGrupoArea ? "Sim" : "Não";

            tr.innerHTML = `
                <td>${membro.nome}</td>
                <td>${membro.grupoLocal}</td>
                <td>${funcoes}</td>
                <td>${isArea}</td>
                <td>
                    <button onclick="alert('Editar em breve')">✏️</button>
                    <button onclick="alert('Excluir em breve')">🗑️</button>
                </td>
            `;
            tabela.appendChild(tr);
        });
    }).catch((error) => {
        console.error("Erro ao buscar membros: ", error);
        tabela.innerHTML = "<tr><td colspan='5' style='color:red;'>Erro ao carregar os dados do banco.</td></tr>";
    });
}
// 4. LÓGICA DO MODAL DE CADASTRO
function abrirModal() {
    document.getElementById('modal-membro').classList.remove('escondido');
}

function fecharModal() {
    document.getElementById('modal-membro').classList.add('escondido');
    // Limpa os campos após fechar
    document.getElementById('membro-nome').value = "";
    document.getElementById('membro-funcoes').value = "";
    document.getElementById('membro-area').checked = false;
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

    // Transforma "Soprano, Teclado" em um array ["Soprano", "Teclado"]
    const funcoesArray = funcoesTexto.split(',').map(f => f.trim());

    // Salva no Firebase
    db.collection('membros').add({
        nome: nome,
        grupoLocal: grupoLocal,
        funcoes: funcoesArray,
        ehGrupoArea: ehGrupoArea
    })
    .then(() => {
        alert("Membro cadastrado com sucesso!");
        fecharModal();
        carregarMembros(); // Atualiza a tabela na tela
    })
    .catch((error) => {
        console.error("Erro ao cadastrar: ", error);
        alert("Erro ao cadastrar. Verifique o console.");
    });
}
