const API_URL = "http://localhost:3000";

// =======================================================
// 📌 FUNÇÃO DECODE TOKEN (DEFINIÇÃO)
// Esta função é essencial para extrair o ID do professor do token
// =======================================================
function decodeToken(token) {
    try {
        if (!token) return null;
        // O token JWT tem 3 partes separadas por ponto: header.payload.signature
        const payload = token.split('.')[1];
        // Adiciona padding e substitui caracteres (Base64 URL Safe para Base64 padrão)
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        // Decodifica o payload de Base64 e converte para JSON
        const decoded = JSON.parse(atob(base64));
        return decoded;
    } catch (e) {
        console.error("Erro ao decodificar o token:", e);
        return null;
    }
}

// =======================================================
// 📌 FUNÇÃO LOGOUT
// Remove o token do localStorage e redireciona
// =======================================================
function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}


// -------- CARREGAR ESPAÇOS (Chamado na tela de agendamento/cadastro) ----------
async function carregarEspacos() {
    const token = localStorage.getItem("token"); // Lemos o token aqui
    
    // Adicionando o header de Authorization
    const res = await fetch(`${API_URL}/espacos`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    
    if (!res.ok) {
        // Se a falha for 401/403 (não autorizado), redireciona
        if (res.status === 401 || res.status === 403) {
            alert("Sua sessão expirou. Faça login novamente.");
            logout();
            return;
        }
        console.error("Falha ao carregar espaços:", res.status, await res.text());
        return;
    }

    const espacos = await res.json();

    const select = document.getElementById("espaco");
    if (!select) return; // Adicionado null check. Sai se o elemento não existir
    select.innerHTML = "";

    espacos.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.id;
        opt.textContent = e.nome;
        select.appendChild(opt);
    });
}

// Chamamos apenas se o elemento 'espaco' existir (para evitar erro em outras telas)
if(document.getElementById("espaco")) {
    carregarEspacos();
}

// -------- CRIAR AGENDAMENTO ----------
async function agendar() {
    // Busca o token no momento do clique para garantir que ele está atualizado
    const token = localStorage.getItem("token"); 

    const data = document.getElementById("data").value;
    const numero_aula = document.getElementById("aula").value;
    const espaco_id = document.getElementById("espaco").value;

    // 1. Obtém o ID do professor a partir do token
    const decoded = decodeToken(token); 
    const professor_id = decoded ? decoded.id : null; 

    if (!data || !numero_aula || !espaco_id || !professor_id) {
        alert("Preencha todos os campos e certifique-se de que o usuário está logado!");
        return;
    }

    const res = await fetch(`${API_URL}/agendamentos`, { 
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        // Inclui o professor_id no corpo da requisição
        body: JSON.stringify({ data, numero_aula, espaco_id, professor_id }) 
    });

    const respostaText = await res.text();
    let resposta = {};
    
    // Trata a resposta do servidor (JSON ou texto)
    try {
        resposta = JSON.parse(respostaText);
    } catch (e) {
        resposta = { erro: respostaText };
    }

    // Verifica o status da requisição
    if (res.ok && res.status === 201) {
        alert(`Agendamento criado com sucesso!`);
    } else {
        const mensagemErro = resposta.erro || "Erro desconhecido. Verifique o console.";
        alert(`Falha no Agendamento: ${mensagemErro}`);
    }
}


// =======================================================
// 📌 FUNÇÃO DELETAR AGENDAMENTO
// =======================================================
async function deletarAgendamento(agendamentoId) {
    // 1. Obter o token do localStorage
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Você precisa estar logado para excluir agendamentos.");
        return;
    }

    // Usamos prompt() em vez de confirm() para evitar o bloqueio no iframe.
    const confirmacao = prompt(`Tem certeza que deseja excluir o agendamento ID ${agendamentoId}? Digite 'SIM' (em maiúsculas) para confirmar.`);
    if (confirmacao !== "SIM") {
        alert("Ação de exclusão cancelada.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/agendamentos/${agendamentoId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                // 2. ENVIAR O TOKEN NO CABEÇALHO AUTHORIZATION
                'Authorization': `Bearer ${token}` 
            }
        });
        
        let erroData = {};
        if (!response.ok) {
            try {
                erroData = await response.json();
            } catch (e) {
                erroData = { erro: await response.text() };
            }
        }

        if (response.status === 401) {
            alert("Acesso negado. Sessão expirada ou token inválido. Faça login novamente.");
            logout();
            return;
        }

        if (response.status === 403) {
            // Este erro é retornado pelo backend se o professor não for o dono
            alert("Ação não permitida. Você só pode excluir seus próprios agendamentos.");
            return;
        }
        
        if (!response.ok) {
            const mensagemErro = erroData.erro || "Erro desconhecido ao deletar.";
            throw new Error(mensagemErro);
        }

        // Se a exclusão for bem-sucedida (status 200 OK)
        alert("Agendamento removido com sucesso!");
        // Recarregar a lista de agendamentos
        listarAgendamentos(); 

    } catch (error) {
        console.error("Erro ao deletar:", error.message);
        alert(error.message);
    }
}

// =======================================================
// 📌 FUNÇÃO LISTAR AGENDAMENTOS (COM NOVO DEBUG DE OBJETO)
// =======================================================
async function listarAgendamentos() {
    const tabela = document.getElementById("lista");
    if (!tabela) return;
    
    tabela.innerHTML = `<tr><td colspan="6" style="text-align: center;">Carregando agendamentos...</td></tr>`;

    // Obtém o token para determinar se o botão de exclusão deve ser exibido.
    const token = localStorage.getItem("token");
    
    // CORREÇÃO: Verifica se o token existe antes de tentar decodificar ou listar.
    // Se não tiver token, força o logout para garantir uma sessão válida.
    if (!token) {
        alert("Sua sessão expirou. Faça login novamente para ver os agendamentos.");
        logout();
        return;
    }

    const decoded = decodeToken(token);
    const currentUserId = decoded ? decoded.id : null; // ID do usuário logado
    
    // Se o token for inválido e não puder ser decodificado, força o logout.
    if (!currentUserId) {
        alert("Seu token é inválido ou expirou. Faça login novamente.");
        logout();
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}` // OBRIGATÓRIO: Envia o token para a API de listagem
    };


    try {
        const response = await fetch(`${API_URL}/agendamentos`, {
            headers: headers
        });
        
        if (!response.ok) {
            tabela.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Erro ao carregar dados: ${response.status} - ${response.statusText}</td></tr>`;
            console.error(`Erro ao carregar agendamentos: ${response.statusText}`);
            return;
        }

        const dados = await response.json();

        tabela.innerHTML = "";

        if (dados.length === 0) {
            tabela.innerHTML = `<tr><td colspan="6" style="text-align: center;">Nenhum agendamento encontrado.</td></tr>`;
            return;
        }

        dados.forEach(a => {
            
            // 🐛 NOVO DEBUG LOG: Imprime o objeto agendamento completo
            console.log("Objeto Agendamento da API:", a);
            
            // Tenta encontrar o ID do professor em diferentes locais do objeto
            const agendamentoProfessorId = a.professor_id || (a.professor && a.professor.id ? a.professor.id : null);

            // COMPARAÇÃO FORÇADA: Converte ambos os IDs para string antes de comparar (String() === String())
            const isOwner = currentUserId !== null && 
                            agendamentoProfessorId !== null &&
                            String(agendamentoProfessorId) === String(currentUserId);
            
            // 🐛 DEBUG LOG FINAL: Verifique esta saída no console do seu navegador!
            console.log(`Agendamento ID ${a.id}: Professor Logado ID: ${currentUserId} | ID do Agendamento: ${agendamentoProfessorId} | É dono: ${isOwner}`);


            // Usa a classe CSS pura 'btn-delete' definida no agendamentos.html
            const actionButton = isOwner
                ? `<button class="btn-delete" onclick="deletarAgendamento(${a.id})">Excluir</button>`
                : `<span>-</span>`;

            
            tabela.innerHTML += `
                <tr>
                    <td>${a.id}</td>
                    <td>${a.professor || 'Desconhecido'}</td>
                    <td>${a.laboratorio || 'N/A'}</td>
                    <td>${a.data || 'N/A'}</td>
                    <td>${a.numero_aula || 'N/A'}</td>
                    <td>${actionButton}</td>
                </tr>
            `;
        });
        
    } catch (error) {
        console.error("Erro na comunicação com a API (listarAgendamentos):", error);
        tabela.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Não foi possível comunicar com a API. Verifique o console.</td></tr>`;
    }
}

// Chamada inicial para carregar a lista de agendamentos (apenas se o elemento existir)
if(document.getElementById("lista")) {
    listarAgendamentos();
}