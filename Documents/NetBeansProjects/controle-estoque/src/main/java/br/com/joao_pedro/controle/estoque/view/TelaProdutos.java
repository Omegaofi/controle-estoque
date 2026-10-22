package br.com.joao_pedro.controle.estoque.view;

import br.com.joao_pedro.controle.estoque.dao.ProdutoDao;
import br.com.joao_pedro.controle.estoque.model.Produto;
import java.awt.BorderLayout;
import java.awt.GridLayout;
import java.util.List;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;
import javax.swing.table.DefaultTableModel;

public class TelaProdutos extends JFrame {

    private final ProdutoDao dao = new ProdutoDao();

    private final JTextField txtCodigo = new JTextField();
    private final JTextField txtNome = new JTextField();
    private final JTextField txtQuantidade = new JTextField();
    private final JTextField txtPreco = new JTextField();
    private final JTextField txtCategoria = new JTextField();
    private final DefaultTableModel modelo = new DefaultTableModel(
            new Object[]{"ID", "Código", "Nome", "Qtd", "Preço", "Categoria", "Mín."}, 0) {
        @Override
        public boolean isCellEditable(int row, int column) {
            return false;
        }
    };

    public TelaProdutos() {
        super("Controle de Estoque");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(800, 500);
        setLocationRelativeTo(null);
        setLayout(new BorderLayout(10, 10));

        JPanel form = new JPanel(new GridLayout(0, 2, 5, 5));
        form.setBorder(BorderFactory.createTitledBorder("Novo produto"));
        form.add(new JLabel("Código:"));
        form.add(txtCodigo);
        form.add(new JLabel("Nome:"));
        form.add(txtNome);
        form.add(new JLabel("Quantidade inicial:"));
        form.add(txtQuantidade);
        form.add(new JLabel("Preço:"));
        form.add(txtPreco);
        form.add(new JLabel("Categoria:"));
        form.add(txtCategoria);

        JButton btnCadastrar = new JButton("Cadastrar");
        JButton btnTodos = new JButton("Listar todos");
        JButton btnBaixo = new JButton("Estoque baixo");
        btnCadastrar.addActionListener(e -> cadastrar());
        btnTodos.addActionListener(e -> preencherTabela(dao.listarTodos()));
        btnBaixo.addActionListener(e -> preencherTabela(dao.listarBaixoEstoque()));

        JPanel botoes = new JPanel();
        botoes.add(btnCadastrar);
        botoes.add(btnTodos);
        botoes.add(btnBaixo);

        JPanel topo = new JPanel(new BorderLayout());
        topo.add(form, BorderLayout.CENTER);
        topo.add(botoes, BorderLayout.SOUTH);

        add(topo, BorderLayout.NORTH);
        add(new JScrollPane(new JTable(modelo)), BorderLayout.CENTER);

        preencherTabela(dao.listarTodos());
    }

    private void cadastrar() {
        try {
            Produto p = new Produto();
            p.setCodigo(txtCodigo.getText().trim());
            p.setNome(txtNome.getText().trim());
            p.setQuantidade(Integer.parseInt(txtQuantidade.getText().trim()));
            p.setPreco(Double.parseDouble(txtPreco.getText().trim().replace(',', '.')));
            p.setCategoria(txtCategoria.getText().trim());

            if (p.getCodigo().isEmpty() || p.getNome().isEmpty()) {
                JOptionPane.showMessageDialog(this, "Código e nome são obrigatórios.");
                return;
            }
            dao.cadastrar(p);
            limparCampos();
            preencherTabela(dao.listarTodos());
        } catch (NumberFormatException ex) {
            JOptionPane.showMessageDialog(this, "Quantidade e preço devem ser números válidos.");
        }
    }

    private void preencherTabela(List<Produto> produtos) {
        modelo.setRowCount(0);
        for (Produto p : produtos) {
            modelo.addRow(new Object[]{p.getId(), p.getCodigo(), p.getNome(), p.getQuantidade(),
                p.getPreco(), p.getCategoria(), p.getEstoqueMinimo()});
        }
    }

    private void limparCampos() {
        txtCodigo.setText("");
        txtNome.setText("");
        txtQuantidade.setText("");
        txtPreco.setText("");
        txtCategoria.setText("");
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new TelaProdutos().setVisible(true));
    }
}
