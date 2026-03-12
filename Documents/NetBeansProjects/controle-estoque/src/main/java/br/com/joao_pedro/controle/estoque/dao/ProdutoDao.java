package br.com.joao_pedro.controle.estoque.dao;

import br.com.joao_pedro.controle.estoque.model.Produto;
import br.com.joao_pedro.controle.estoque.util.ConnectionFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ProdutoDao {

    public void cadastrar(Produto p) {
        String sql = "INSERT INTO produtos (codigo, nome, quantidade, preco, categoria, estoque_minimo) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setString(1, p.getCodigo());
            stmt.setString(2, p.getNome());
            stmt.setInt(3, p.getQuantidade());
            stmt.setDouble(4, p.getPreco());
            stmt.setString(5, p.getCategoria());
            stmt.setInt(6, p.getEstoqueMinimo());

            stmt.executeUpdate();

            ResultSet rs = stmt.getGeneratedKeys();
            if (rs.next()) p.setId(rs.getInt(1));

            System.out.println("Produto cadastrado: " + p.getNome());
        } catch (SQLException e) {
            if (e.getMessage().contains("Duplicate entry")) {
                System.out.println("Erro: Código já existe.");
            } else {
                e.printStackTrace();
            }
        }
    }

    public List<Produto> listarTodos() {
        List<Produto> lista = new ArrayList<>();
        String sql = "SELECT * FROM produtos";

        try (Connection conn = ConnectionFactory.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                Produto p = new Produto();
                p.setId(rs.getInt("id"));
                p.setCodigo(rs.getString("codigo"));
                p.setNome(rs.getString("nome"));
                p.setQuantidade(rs.getInt("quantidade"));
                p.setPreco(rs.getDouble("preco"));
                p.setCategoria(rs.getString("categoria"));
                p.setEstoqueMinimo(rs.getInt("estoque_minimo"));
                lista.add(p);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    public List<Produto> listarBaixoEstoque() {
        List<Produto> lista = new ArrayList<>();
        String sql = "SELECT * FROM produtos WHERE quantidade < estoque_minimo";

        try (Connection conn = ConnectionFactory.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                Produto p = new Produto();
                p.setId(rs.getInt("id"));
                p.setCodigo(rs.getString("codigo"));
                p.setNome(rs.getString("nome"));
                p.setQuantidade(rs.getInt("quantidade"));
                p.setPreco(rs.getDouble("preco"));
                p.setCategoria(rs.getString("categoria"));
                p.setEstoqueMinimo(rs.getInt("estoque_minimo"));
                lista.add(p);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }
    public double calcularValorTotalEstoque() {
    String sql = "SELECT SUM(quantidade * preco) FROM produtos";
    try (Connection conn = ConnectionFactory.getConnection();
         Statement stmt = conn.createStatement();
         ResultSet rs = stmt.executeQuery(sql)) {
        if (rs.next()) {
            return rs.getDouble(1);
        }
    } catch (SQLException e) {
        e.printStackTrace();
    }
    return 0;
}
    public void atualizarQuantidade(int id, int novaQuantidade) {
        String sql = "UPDATE produtos SET quantidade = ?  WHERE id = ?";
        try (Connection conn = ConnectionFactory.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, novaQuantidade);
            stmt.setInt(2, id);
            stmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}