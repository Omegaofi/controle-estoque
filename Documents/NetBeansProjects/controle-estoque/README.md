# Controle de Estoque Simples

Sistema console em Java + MySQL para gerenciamento de estoque: cadastro de produtos, entradas/saídas, alertas de estoque baixo e histórico de movimentações.

Projeto feito para aprendizado e portfólio, com foco em lógica de negócio e persistência de dados.

## Tecnologias
- Java
- MySQL
- JDBC
- Maven
- Git

## Funcionalidades
- Cadastro/listagem/atualização de produtos (código único, quantidade, preço, categoria, mínimo)
- Registro de entradas (+) e saídas (-) com motivo
- Alerta de estoque baixo (quantidade < mínimo)
- Histórico completo de movimentações por produto
- Validações básicas (quantidade suficiente na saída)

## Como rodar
1. Clone o repositório
2. Abra no NetBeans
3. Crie o banco `estoque_db` e rode o script de tabelas (crie `create_tables.sql` ou rode manualmente)
4. Ajuste usuário/senha no `ConnectionFactory.java` (root sem senha por default)
5. Rode `mvn clean compile exec:java`

## Estrutura
- model/ → Produto.java, Movimentacao.java
- dao/ → ProdutoDAO.java, MovimentacaoDAO.java
- util/ → ConnectionFactory.java
- main → ControleEstoque.java (menu)

Feito por João Pedro Carvalho Theis (Omegaofi/Shatkip)  
Contato: jpcarvalhotheis@gmail.com