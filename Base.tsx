// This file contains the application's business rules and logic documentation.
// It has been commented out to resolve TypeScript compilation errors as it is a documentation file.

/*
1. Sistema de Identidade Estável (Automáticos)
Regra de Ouro: Itens automáticos (Cartão, Dízimo, Movimento) possuem uma chave única no banco de dados (group_name) no formato AUTO_TIPO_MES.
Comportamento: Se o usuário editar a data ou categoria de um item automático, o sistema não deve criar um duplicata no dia 01. Ele deve reconhecer que aquele item já existe no mês (através da chave) e apenas atualizar o valor calculado automaticamente dentro do item editado pelo usuário.
2. Lógica de "Baixa" (Status Pago)
Persistência: Ao clicar em "Baixar", o sistema deve obrigatoriamente realizar duas ações:
Criar uma transação real no Histórico.
Salvar o item planejado no banco de dados com status: 'paid'.
Independência: O status "Pago" não deve sumir ao recarregar a página, pois ele agora é um registro físico no banco vinculado à chave de identidade.
3. Geradores Dinâmicos de Planejamento
Faturas de Cartão: O valor é a soma das parcelas de todas as card_transactions que incidem naquele mês, respeitando o due_day configurado no registro do cartão.
Movimento (Banco Vivo): Cálculo dinâmico entre as categorias de "Movimento" (Entrada vs Saída). Se o resultado for positivo, gera o crédito automaticamente.
Dízimo: Cálculo opcional (via Settings) de 10% sobre as categorias de receita que possuem a flag includeInTithing ativa.
4. Gestão de Investimentos
Grupos: Agrupamento visual e de soma por group_name.
Simulador de Rentabilidade: A lógica de diferenciação entre Juros Compostos (Renda Fixa) e Linear (Fundos) deve ser preservada.
Update em Massa: A funcionalidade de "Atualizar Saldos" que abre campos de input na tabela para salvar vários ativos de uma vez.
5. Categorias e Ordenação
Ordenação Manual: O campo sort_order no banco garante que a posição definida pelo usuário (via setas ou Classificar A-Z) seja persistente entre sessões.
Vínculo de Tithing: A possibilidade de marcar quais receitas entram ou não no cálculo do dízimo diretamente na edição da categoria.
6. Integridade de Dados e Backup
Export/Import JSON: Funcionalidade de backup local que baixa todos os dados em um arquivo e permite restaurá-los.
Importação de Extratos: Suporte a OFX, CSV e Excel com mapeamento inteligente de categorias baseado no nome.
Reset de Conta: Botão de "Apagar Tudo" que limpa as tabelas mantendo apenas o usuário do Auth.
7. Interface e UX
Gráfico de Evolução: Deve sempre considerar o saldo inicial (histórico total) + movimentações do mês (reais e projetadas) para uma linha de tendência precisa.
Calculadora Flutuante: Presente em todas as telas para auxílio rápido.
Modo Dark/Light: Persistência via localStorage e classes do Tailwind.
Este documento servirá como meu "manual de restrições" para qualquer solicitação futura, garantindo a estabilidade do seu Flux.
*/

export {};
