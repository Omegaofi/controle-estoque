package br.com.joao_pedro.controle.estoque;

import br.com.joao_pedro.controle.estoque.dao.ProdutoDao;
import br.com.joao_pedro.controle.estoque.model.Movimentacao;
import br.com.joao_pedro.controle.estoque.dao.MovimentacaoDAO;
import br.com.joao_pedro.controle.estoque.model.Produto;
import java.util.List;
import java.util.Scanner;

public class ControleEstoque {

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ProdutoDao pdao = new ProdutoDao();
        MovimentacaoDAO mdao = new MovimentacaoDAO();

        while (true) {
            System.out.println("\n=== Controle de Estoque ===");
            System.out.println("1 - Cadastrar produto");
            System.out.println("2 - Listar todos");
            System.out.println("3 - Produtos com estoque baixo");
            System.out.println("4 - Registrar entrada ( + quantidade )");
            System.out.println("5 - Registrar saída ( - quantidade )");
            System.out.println("6 - Histórico de movimentações de um produto");
            System.out.println("0 - Sair");
            System.out.print("Escolha: ");

            int op = sc.nextInt();
            sc.nextLine();

            if (op == 0) {
                break;
            }

            switch (op) {
                case 1:
                    Produto p = new Produto();
                    System.out.print("Código: ");
                    p.setCodigo(sc.nextLine());
                    System.out.print("Nome: ");
                    p.setNome(sc.nextLine());
                    System.out.print("Quantidade inicial: ");
                    p.setQuantidade(sc.nextInt());
                    System.out.print("Preço: ");
                    p.setPreco(sc.nextDouble());
                    sc.nextLine();
                    System.out.print("Categoria: ");
                    p.setCategoria(sc.nextLine());

                    pdao.cadastrar(p);
                    break;

                case 2:
                    List<Produto> todos = pdao.listarTodos();
                    todos.forEach(System.out::println);
                    break;

                case 3:
                    List<Produto> baixos = pdao.listarBaixoEstoque();
                    if (baixos.isEmpty()) {
                        System.out.println("Nenhum produto com estoque baixo.");
                    } else {
                        baixos.forEach(System.out::println);
                    }
                    break;
                case 4: // Registrar entrada
                    Movimentacao movDao = new Movimentacao();
                    System.out.print("ID do produto: ");
                    int idEntrada = sc.nextInt();
                    sc.nextLine();
                    System.out.print("Quantidade a adicionar: ");
                    int qtdEntrada = sc.nextInt();
                    sc.nextLine();
                    System.out.print("Valor unitário da entrada (custo): ");
                    double valorEntrada = sc.nextDouble();
                    sc.nextLine();

                    System.out.print("Motivo (opcional): ");
                    String motivoEntrada = sc.nextLine();
                    pdao.atualizarQuantidade(idEntrada, qtdEntrada);
                    mdao.registrar(idEntrada, "ENTRADA", qtdEntrada, valorEntrada, motivoEntrada);

                    System.out.println("Entrada registrada.");
                    break;

                case 5: // Registrar saída
                    System.out.print("ID do produto: ");
                    int idSaida = sc.nextInt();
                    sc.nextLine();
                    System.out.print("Quantidade a retirar: ");
                    int qtdSaida = sc.nextInt();
                    sc.nextLine();
                    System.out.print("Motivo (opcional): ");
                    String motivoSaida = sc.nextLine();

                    // Verifica estoque suficiente (opcional, use buscarPorId se tiver)
                    // Produto p = dao.buscarPorId(idSaida);
                    // if (p != null && p.getQuantidade() < qtdSaida) { ... erro }
                    pdao.atualizarQuantidade(idSaida, -qtdSaida);
                    mdao.registrar(idSaida, "SAIDA", qtdSaida, motivoSaida);

                    System.out.println("Saída registrada.");
                    break;
                case 6:
                    System.out.print("ID do produto: ");
                    int idHist = sc.nextInt();
                    sc.nextLine();

                    List<Movimentacao> hist = mdao.listarPorProduto(idHist);
                    if (hist.isEmpty()) {
                        System.out.println("Nenhuma movimentação.");
                    } else {
                        System.out.println("Histórico do produto " + idHist + ":");
                        for (Movimentacao m : hist) {
                            System.out.println(m.getData() + " | " + m.getTipo() + " | Qtd: " + m.getQuantidade() + " | " + m.getMotivo());
                        }
                    }
                    break;
                    
                default:
                    System.out.println("Opção inválida.");
            }
        }
        sc.close();
    }
}
